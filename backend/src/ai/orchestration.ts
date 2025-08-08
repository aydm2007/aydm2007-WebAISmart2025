import { ChatOpenAI } from '@langchain/openai';
import { getSchemaDescription, executeQuery } from '../db/database';
import { guardSql } from '../db/sql_guard';
import { SQL_GENERATION_PROMPT, INSIGHT_GENERATION_PROMPT } from './prompts';
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
