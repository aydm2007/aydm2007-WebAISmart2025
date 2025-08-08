
import express from 'express';
import { getAllSettings, setSettings, AppSettings } from '../db/settings';
import { AppError } from '../utils/errors';

const router = express.Router();

router.get('/', (_req, res) => {
  res.json(getAllSettings());
});

router.post('/', (req, res, next) => {
  try {
    const patch = req.body as Partial<AppSettings>;
    // basic validation
    if (patch.DEFAULT_CHART_TYPE && !['bar','line','pie'].includes(String(patch.DEFAULT_CHART_TYPE)))
      throw new AppError('Invalid chart type', 400, 'VALIDATION_ERROR');
    if (patch.DEFAULT_PAGE_SIZE && Number(patch.DEFAULT_PAGE_SIZE) <= 0)
      throw new AppError('Invalid page size', 400, 'VALIDATION_ERROR');
    if (patch.AUTO_ARCHIVE_DAYS && Number(patch.AUTO_ARCHIVE_DAYS) < 0)
      throw new AppError('Invalid days', 400, 'VALIDATION_ERROR');
    if (patch.CHART_COLORS && !Array.isArray(patch.CHART_COLORS))
      throw new AppError('CHART_COLORS must be an array', 400, 'VALIDATION_ERROR');

    const next = setSettings(patch);
    res.json(next);
  } catch (e) { next(e); }
});

export default router;
