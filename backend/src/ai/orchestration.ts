import { ChatOpenAI } from '@langchain/openai';
import { getSchemaDescription, executeQuery } from '../db/database';
import { guardSql } from '../db/sql_guard';
import { SQL_GENERATION_PROMPT, INSIGHT_GENERATION_PROMPT } from './prompts';
import { generateFinancialQuery, generateAnalysisPrompt, FINANCIAL_SYSTEM_PROMPT } from './financial-prompts';
import { detectFinancialAnomalies, generateAnomalyReport } from './anomaly-detection';
import { geminiAI } from './gemini-integration';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { AppError } from '../utils/errors';
import type { Response } from 'express';

type AnalysisResult = {
  summary: string;
  patterns: string[];
  recommendations: string[];
  sql: string;
  data: any[];
};

const store = new Map<string, AnalysisResult>();
export function getAnalysisResult(id: string) { return store.get(id); }

// استعلام احتياطي مضمون لأي SQLite
const FALLBACK_SQL = "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') LIMIT 50";

// ---- LLM lazy init (لا تنشئ LLM عند التحميل) ----
let _llm: ChatOpenAI | null = null;
function ensureLLM(): ChatOpenAI {
  if (process.env.OPENAI_MOCK === '1') throw new AppError('LLM_NOT_NEEDED', 500, 'LLM_NOT_NEEDED');
  if (_llm) return _llm;

  const mask = (s?: string) => s ? `${s.slice(0,3)}***${s.slice(-3)} (len=${s.length})` : 'undefined';
  console.log('[LLM] OPENAI_API_KEY =', mask(process.env.OPENAI_API_KEY)); // <— هذا السطر

  const apiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
  if (!apiKey) throw new AppError('OpenAI API key is missing', 500, 'LLM_KEY_MISSING');

  _llm = new ChatOpenAI({
    apiKey,
    modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0,
    maxTokens: 4096,
  });
  return _llm;
}

// ---------------------------------------------------

function extractSql(content: any): string {
  const text = typeof content === 'string'
    ? content
    : (Array.isArray(content) ? content.map((x: any) => x?.text || '').join('\n') : String(content));
  const m = text.match(/```sql\s*([\s\S]*?)\s*```/i);
  return (m ? m[1] : text).trim();
}

function parseInsights(text: string) {
  const getBlock = (label: string) => {
    const re = new RegExp(`\\[${label}\\]\\n([\\s\\S]*?)(?:\\n\\n\\[|$)`);
    const m = text.match(re);
    return m ? m[1].trim() : '';
  };
  const parseList = (block: string) => block.split('\n').map(s => s.replace(/^[\-•]\s*/, '').trim()).filter(Boolean);
  const summary = getBlock('ملخص');
  const patterns = parseList(getBlock('الأنماط المكتشفة'));
  const recommendations = parseList(getBlock('توصيات عملية'));
  return { summary, patterns, recommendations };
}

function makeId() { return `analysis_${Date.now()}`; }

// تنفيذ SQL مع fallback مضمون
function executeWithFallback(sql: string) {
  try {
    const data = executeQuery(sql);
    return { sqlUsed: sql, data };
  } catch {
    const data = executeQuery(FALLBACK_SQL);
    return { sqlUsed: FALLBACK_SQL, data };
  }
}

async function generateSql(question: string): Promise<string> {
  const schema = getSchemaDescription();
  try {
    const resp = await ensureLLM().invoke([
      new SystemMessage('Return SQL only inside ```sql``` block. SQLite dialect.'),
      new HumanMessage(SQL_GENERATION_PROMPT.replace('{schema}', schema).replace('{question}', question)),
    ]);
    const sql = extractSql(resp.content);
    const guard = guardSql(sql);
    return guard.ok ? sql : FALLBACK_SQL;
  } catch {
    return FALLBACK_SQL;
  }
}

async function generateInsights(data: any[]): Promise<{summary:string,patterns:string[],recommendations:string[]}> {
  try {
    const resp = await ensureLLM().invoke([
      new SystemMessage('Respond in Arabic using the exact required structure.'),
      new HumanMessage(INSIGHT_GENERATION_PROMPT.replace('{data}', JSON.stringify(data, null, 2))),
    ]);
    const text = typeof resp.content === 'string'
      ? resp.content
      : (Array.isArray(resp.content) ? resp.content.map((x:any)=>x?.text||'').join('\n') : String(resp.content));
    const { summary, patterns, recommendations } = parseInsights(text);
    return {
      summary: summary || 'ملخص موجز للنتائج المعروضة.',
      patterns: patterns || [],
      recommendations: recommendations || [],
    };
  } catch {
    return {
      summary: 'تم استخدام استعلام بديل آمن (sqlite_master) لعرض الجداول/العروض، وتعذّر توليد تحليل تفصيلي آليًا.',
      patterns: [],
      recommendations: [],
    };
  }
}

export async function processUserQuery(question: string) {
  // MOCK mode
  if (process.env.OPENAI_MOCK === '1') {
    const { sqlUsed, data } = executeWithFallback(FALLBACK_SQL);
    const id = makeId();
    const result: AnalysisResult = {
      summary: 'ملخص تجريبي (MOCK).',
      patterns: ['نمط 1','نمط 2'],
      recommendations: ['توصية 1','توصية 2'],
      sql: sqlUsed,
      data,
    };
    store.set(id, result);
    return { id, ...result };
  }

  // Real mode مع fallback في كل خطوة
  const sql = await generateSql(question);
  const { sqlUsed, data } = executeWithFallback(sql);
  const { summary, patterns, recommendations } = await generateInsights(data);
  const id = makeId();
  const result: AnalysisResult = { summary, patterns, recommendations, sql: sqlUsed, data };
  store.set(id, result);
  return { id, ...result };
}

// SSE streaming (مُحصّن بالكامل)
export async function processUserQueryStream(res: Response, question: string) {
  // MOCK mode (تجريبي آمن)
  if (process.env.OPENAI_MOCK === '1') {
    const { sqlUsed, data } = executeWithFallback(FALLBACK_SQL);
    const id = makeId();
    const summary = 'ملخص تجريبي (MOCK).';
    const patterns = ['نمط 1','نمط 2'];
    const recommendations = ['توصية 1','توصية 2'];
    const result: AnalysisResult = { summary, patterns, recommendations, sql: sqlUsed, data };
    store.set(id, result);
    res.write(`data: ${JSON.stringify({ type: 'token', data: summary })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done', data: { id, summary, sql: sqlUsed } })}\n\n`);
    res.end();
    return;
  }

  try {
    // 1) SQL مولّد أو احتياطي
    const sql = await generateSql(question);

    // 2) تنفيذ SQL مع حارس محلي (بدون تسريب أخطاء)
    const { sqlUsed, data } = executeWithFallback(sql);

    // 3) بث الملخص كسيل tokens؛ إن فشل LLM → ملخص محلي مبسّط
    let summary = '';
    try {
      const iterator = await ensureLLM().stream([
        new SystemMessage('Respond in Arabic using only the summary paragraph, no lists, stream tokens.'),
        new HumanMessage(`اكتب فقرة ملخص واضحة وموجزة لهذه البيانات (JSON):\n${JSON.stringify(data, null, 2)}`),
      ]);
      for await (const chunk of iterator as any) {
        const delta = (chunk?.delta || (chunk as any)?.content || '');
        const text = typeof delta === 'string'
          ? delta
          : (Array.isArray(delta) ? delta.map((x:any)=>x?.text||'').join('') : '');
        if (text) {
          summary += text;
          res.write(`data: ${JSON.stringify({ type: 'token', data: text })}\n\n`);
        }
      }
    } catch {
      summary = 'عرض عناصر من sqlite_master (الجداول/العروض) مع ملخص محلي مبسّط لعدم توفر ملخص آلي.';
      res.write(`data: ${JSON.stringify({ type: 'token', data: summary })}\n\n`);
    }

    // 4) الأنماط/التوصيات (غير متدفقة)
    const { patterns, recommendations } = await generateInsights(data);

    // 5) إنهاء
    const id = makeId();
    const result: AnalysisResult = { summary, patterns, recommendations, sql: sqlUsed, data };
    store.set(id, result);
    res.write(`data: ${JSON.stringify({ type: 'done', data: { id, summary, sql: sqlUsed } })}\n\n`);
    res.end();

  } catch (e: any) {
    // مسك الطوارئ: لا نمرر لـ next() في مسار SSE
    res.write(`data: ${JSON.stringify({ type: 'error', data: { message: e?.message || String(e) } })}\n\n`);
    res.end();
  }
}

// ===== دوال النظام المالي المتخصص =====

export async function processFinancialQuery(question: string) {
  try {
    console.log(`🤖 Processing financial query: "${question}"`);

    // كشف الشذوذ التلقائي إذا كان السؤال يتطلب ذلك
    if (question.includes('شذوذ') || question.includes('غريب') || question.includes('تقرير شامل')) {
      const anomalyReport = await generateAnomalyReport();
      return {
        success: true,
        sql: 'ANOMALY_DETECTION',
        results: [],
        analysis: anomalyReport,
        rowCount: 0
      };
    }

    // 1. الحصول على وصف قاعدة البيانات المالية
    const schema = getSchemaDescription();

    // 2. استخدام AI للنظام المالي المتخصص (Gemini أو OpenAI)
    let generatedSQL: string;
    const prompt = generateFinancialQuery(question, schema);

    // جرب Gemini أولاً إذا كان متاحاً
    if (geminiAI.isConfigured()) {
      try {
        console.log('🔵 Using Gemini AI for SQL generation');
        generatedSQL = await geminiAI.generateFinancialSQL(question, schema);
      } catch (error) {
        console.log('⚠️ Gemini failed, falling back to OpenAI');
        // التراجع إلى OpenAI
        const llm = ensureLLM();
        const messages = [
          new SystemMessage(FINANCIAL_SYSTEM_PROMPT),
          new HumanMessage(prompt)
        ];
        const response = await llm.invoke(messages);
        generatedSQL = extractSql(response.content);
      }
    } else {
      // استخدام OpenAI
      console.log('🟢 Using OpenAI for SQL generation');
      const llm = ensureLLM();
      const messages = [
        new SystemMessage(FINANCIAL_SYSTEM_PROMPT),
        new HumanMessage(prompt)
      ];
      const response = await llm.invoke(messages);
      generatedSQL = extractSql(response.content);
    }
    const cleanSQL = cleanFinancialQuery(generatedSQL);

    console.log(`📊 Generated SQL: ${cleanSQL}`);

    // 3. تنفيذ الاستعلام على قاعدة البيانات المالية
    const results = executeQuery(cleanSQL);
    console.log(`✅ Query executed, found ${results.length} records`);

    // 4. تحليل النتائج المالية (Gemini أو OpenAI)
    let analysis: string;

    if (geminiAI.isConfigured()) {
      try {
        console.log('🔵 Using Gemini AI for analysis');
        analysis = await geminiAI.analyzeFinancialResults(question, cleanSQL, results);
      } catch (error) {
        console.log('⚠️ Gemini analysis failed, falling back to OpenAI');
        analysis = await generateFinancialAnalysis(question, cleanSQL, results);
      }
    } else {
      console.log('🟢 Using OpenAI for analysis');
      analysis = await generateFinancialAnalysis(question, cleanSQL, results);
    }

    return {
      success: true,
      sql: cleanSQL,
      results,
      analysis,
      rowCount: results.length
    };

  } catch (error) {
    console.error('❌ Error in financial query processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ في معالجة الاستعلام المالي',
      sql: '',
      results: [],
      analysis: 'عذراً، لم أتمكن من معالجة استعلامك المالي. يرجى المحاولة بصيغة أخرى.'
    };
  }
}

function cleanFinancialQuery(sql: string): string {
  // إزالة علامات الكود والنصوص الإضافية
  sql = sql.replace(/```sql\s*|\s*```/g, '').trim();
  sql = sql.replace(/^.*?SELECT/i, 'SELECT'); // إزالة أي نص قبل SELECT
  sql = sql.split('\n')[0]; // أخذ السطر الأول فقط

  // إزالة الفاصلة المنقوطة النهائية
  sql = sql.replace(/;\s*$/, '');

  // التأكد من صحة أسماء الجداول
  const validTables = ['vewAccountsList', 'vewInv_CustomersSuppliers', 'vewInv_ItemsMain', 'vewJournalEntries'];

  // إضافة LIMIT إذا لم يكن موجوداً
  if (!sql.toLowerCase().includes('limit') && sql.toLowerCase().startsWith('select')) {
    sql += ' LIMIT 100';
  }

  // التحقق من وجود جداول صحيحة
  const hasValidTable = validTables.some(table => sql.includes(table));
  if (!hasValidTable && sql.toLowerCase().startsWith('select')) {
    console.warn('⚠️ Invalid tables detected, using fallback query');
    return FALLBACK_SQL;
  }

  return sql;
}

async function generateFinancialAnalysis(question: string, sql: string, results: any[]): Promise<string> {
  try {
    if (results.length === 0) {
      return 'لم يتم العثور على بيانات تطابق استعلامك المالي. تأكد من صحة المعايير المطلوبة.';
    }

    // استخدام LangChain لتحليل النتائج المالية
    const llm = ensureLLM();
    const analysisPrompt = generateAnalysisPrompt(question, sql, results);

    const messages = [
      new SystemMessage(FINANCIAL_SYSTEM_PROMPT),
      new HumanMessage(analysisPrompt)
    ];

    const response = await llm.invoke(messages);
    return response.content as string || getDefaultFinancialAnalysis(results, question);

  } catch (error) {
    console.error('Error generating financial analysis:', error);
    return getDefaultFinancialAnalysis(results, question);
  }
}

function getDefaultFinancialAnalysis(results: any[], question: string): string {
  const count = results.length;

  // تحليل بسيط بناءً على نوع السؤال
  if (question.includes('مبيعات') || question.includes('المبيعات')) {
    const totalAmount = results.reduce((sum, row) => sum + (row.amount || 0), 0);
    return `📊 **تحليل المبيعات:**
- عدد العمليات: ${count}
- إجمالي المبلغ: ${totalAmount.toLocaleString('ar-SA')} ريال
- متوسط قيمة العملية: ${(totalAmount / count).toLocaleString('ar-SA')} ريال`;
  }

  if (question.includes('عملاء') || question.includes('العملاء')) {
    return `👥 **تحليل العملاء:**
- عدد العملاء: ${count}
- يمكنك مراجعة قائمة العملاء أدناه لمزيد من التفاصيل`;
  }

  if (question.includes('أصناف') || question.includes('الأصناف') || question.includes('منتج')) {
    return `📦 **تحليل الأصناف:**
- عدد الأصناف: ${count}
- راجع القائمة أدناه لتفاصيل كل صنف`;
  }

  if (question.includes('رصيد') || question.includes('حساب')) {
    return `💰 **تحليل الحسابات:**
- عدد الحسابات: ${count}
- راجع الأرصدة أدناه للتفاصيل المالية`;
  }

  return `✅ تم العثور على ${count} سجل يطابق استعلامك. راجع النتائج التفصيلية أدناه.`;
}
