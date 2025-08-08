import express from 'express';
import { AppError } from '../utils/errors';
import {
  initHistory, createConversation, listConversations, getMessages, addMessage,
  archiveConversation, deleteConversation
} from '../db/history';
import { autoArchiveOldConversations } from '../db/autoArchive';
import { processUserQuery } from '../ai/orchestration';

const router = express.Router();
initHistory();

router.get('/conversations', (req, res, next) => {
  try {
    const includeArchived = Number(req.query.includeArchived) ? 1 : 0; // 0/1
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '25'), 10), 1), 100);
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10), 0);
    const rows = listConversations({ includeArchived, limit, offset });
    res.json({ conversations: rows });
  } catch (e) { next(e); }
});

router.post('/conversations', (req, res) => {
  const { title } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title is required' });
  const conv = createConversation(String(title).trim());
  res.json(conv);
});

router.post('/conversations/:id/archive', (req, res) => {
  archiveConversation(req.params.id, true);
  res.json({ ok: true });
});

router.post('/conversations/:id/unarchive', (req, res) => {
  archiveConversation(req.params.id, false);
  res.json({ ok: true });
});

router.delete('/conversations/:id', (req, res) => {
  deleteConversation(req.params.id);
  res.json({ ok: true });
});

router.get('/conversations/:id/messages', (req, res) => {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
  const pageSize = Math.min(Math.max(parseInt(String(req.query.pageSize || '50'), 10), 1), 200);
  res.json(getMessages(req.params.id, page, pageSize));
});

router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { text } = req.body || {};
    const convId = req.params.id;
    if (!text || !String(text).trim()) throw new AppError('Message text is required', 400, 'VALIDATION_ERROR');

    addMessage(convId, 'user', String(text));

    const result = await processUserQuery(String(text));
    // ملاحظة: processUserQuery يعيد { id, ... } → استخدم result.id وليس result.analysisId
    addMessage(convId, 'assistant', result.summary, result.id);

    res.json(result);
  } catch (e) { next(e); }
});

router.post('/maintenance/auto-archive', (req, res) => {
  const days = Number(process.env.AUTO_ARCHIVE_DAYS || 30);
  const out = autoArchiveOldConversations(days);
  res.json({ ok: true, days, ...out });
});

export default router;
