import express from 'express';
import type { Response } from 'express';
import { processUserQuery, processUserQueryStream, processFinancialQuery } from '../ai/orchestration';
import { AppError } from '../utils/errors';
import { FINANCIAL_EXAMPLES } from '../ai/financial-prompts';
import { detectFinancialAnomalies, generateAnomalyReport } from '../ai/anomaly-detection';

const router = express.Router();

/** إعداد ترويسات SSE وتعطيل البفر */
function setSSEHeaders(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
}

/** إرسال حدث SSE */
function sendSSE(res: Response, payload: any) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/** إنهاء SSE بأمان مع تنظيف keep-alive */
function endSSE(res: Response, keepAlive?: NodeJS.Timeout) {
  if (keepAlive) clearInterval(keepAlive);
  try { res.end(); } catch {}
}

/** رد JSON كامل (غير متدفق) */
router.post('/', async (req, res, next) => {
  try {
    const { question } = req.body || {};
    if (!question || !String(question).trim()) {
      throw new AppError('Question is required', 400, 'VALIDATION_ERROR');
    }
    const result = await processUserQuery(String(question));
    res.json(result);
  } catch (e) {
    next(e);
  }
});

/** بث SSE عبر GET — متوافق مع EventSource: /api/chat/stream?q=... */
router.get('/stream', async (req, res) => {
  setSSEHeaders(res);

  const q = String(req.query.q || '').trim();
  // keep-alive ping كل 25 ثانية
  const keepAlive = setInterval(() => res.write(':\n\n'), 25_000);
  res.on('close', () => endSSE(res, keepAlive));

  if (!q) {
    sendSSE(res, { type: 'error', data: { message: 'missing q' } });
    endSSE(res, keepAlive);
    return;
  }

  try {
    // تعليق تمهيدي (اختياري)
    res.write(':ok\n\n');
    await processUserQueryStream(res, q); // لا تمرّر لـ next()
  } catch (e: any) {
    sendSSE(res, { type: 'error', data: { message: e?.message || String(e) } });
    endSSE(res, keepAlive);
  }
});

/** بث SSE عبر POST — مناسب لـ fetch + ReadableStream */
router.post('/stream', async (req, res) => {
  setSSEHeaders(res);

  const { question } = req.body || {};
  const keepAlive = setInterval(() => res.write(':\n\n'), 25_000);
  res.on('close', () => endSSE(res, keepAlive));

  if (!question || !String(question).trim()) {
    sendSSE(res, { type: 'error', data: { message: 'Question is required' } });
    endSSE(res, keepAlive);
    return;
  }

  try {
    res.write(':ok\n\n');
    await processUserQueryStream(res, String(question)); // لا تمرّر لـ next()
  } catch (e: any) {
    sendSSE(res, { type: 'error', data: { message: e?.message || String(e) } });
    endSSE(res, keepAlive);
  }
});

// ===== النظام المالي المتخصص =====

/** بث SSE للاستعلامات المالية المتخصصة */
async function processFinancialQueryStream(res: Response, question: string) {
  try {
    // إرسال رسالة بداية
    sendSSE(res, {
      type: 'token',
      data: 'جاري تحليل استعلامك المالي...\n\n'
    });

    // معالجة الاستعلام المالي
    const result = await processFinancialQuery(question);

    if (result.success) {
      // إرسال الاستعلام
      sendSSE(res, {
        type: 'token',
        data: `**الاستعلام المنفذ:**
\`\`\`sql
${result.sql}
\`\`\`

`
      });

      // إرسال النتائج
      if (result.results.length > 0) {
        sendSSE(res, {
          type: 'token',
          data: `**النتائج (${result.rowCount} سجل):**

`
        });

        // عرض النتائج في جدول
        const tableData = formatResultsAsTable(result.results.slice(0, 10));
        sendSSE(res, {
          type: 'token',
          data: tableData + '\n\n'
        });

        // إرسال التحليل
        sendSSE(res, {
          type: 'token',
          data: `**التحليل:**\n${result.analysis}\n\n`
        });
      } else {
        sendSSE(res, {
          type: 'token',
          data: 'لم يتم العثور على نتائج تطابق استعلامك.

'
        });
      }
    } else {
      sendSSE(res, {
        type: 'token',
        data: `❌ ${result.error}\n\n`
      });
    }

    // إنهاء الاستجابة
    sendSSE(res, {
      type: 'done',
      data: { success: result.success, sql: result.sql }
    });

  } catch (error) {
    sendSSE(res, {
      type: 'error',
      data: { message: 'حدث خطأ في معالجة الاستعلام المالي' }
    });
  }

  res.end();
}

function formatResultsAsTable(results: any[]): string {
  if (results.length === 0) return 'لا توجد نتائج';

  const headers = Object.keys(results[0]);
  let table = '| ' + headers.join(' | ') + ' |\n';
  table += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

  results.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '-';
      if (typeof value === 'number') return value.toLocaleString('ar-SA');
      return String(value);
    });
    table += '| ' + values.join(' | ') + ' |\n';
  });

  return table;
}

// إضافة route للأمثلة المالية
router.get('/financial-examples', (req, res) => {
  res.json(FINANCIAL_EXAMPLES);
});

// route لكشف الشذوذ المالي
router.get('/anomaly-detection', async (req, res) => {
  try {
    const anomalies = await detectFinancialAnomalies();
    res.json({
      success: true,
      anomalies,
      count: anomalies.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'فشل في كشف الشذوذ المالي',
      message: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

// route لتقرير الشذوذ الشامل
router.get('/anomaly-report', async (req, res) => {
  try {
    const report = await generateAnomalyReport();
    res.json({
      success: true,
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'فشل في إنتاج تقرير الشذوذ',
      message: error instanceof Error ? error.message : 'خطأ غير معروف'
    });
  }
});

export default router;
