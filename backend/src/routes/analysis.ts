
import express from 'express';
import { getAnalysisResult } from '../ai/orchestration';

const router = express.Router();

router.get('/:id', (req, res) => {
  const result = getAnalysisResult(req.params.id);
  if (!result) return res.status(404).json({ error: 'Not found' });
  res.json(result);
});

export default router;
