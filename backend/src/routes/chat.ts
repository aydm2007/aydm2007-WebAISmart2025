import express from 'express';
import type { Response } from 'express';
import { processUserQuery, processUserQueryStream } from '../ai/orchestration';
import { AppError } from '../utils/errors';

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

export default router;
