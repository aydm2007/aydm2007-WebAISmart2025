
import express from 'express';
import { AppError } from '../utils/errors';
import { executeQuery } from '../db/database';
import { guardSql } from '../db/sql_guard';

const router = express.Router();

router.post('/safe', (req, res, next) => {
  try {
    const { sql } = req.body || {};
    if (!sql || !String(sql).trim()) throw new AppError('SQL is required', 400, 'VALIDATION_ERROR');

    const g = guardSql(String(sql));
    if (!g.ok) throw new AppError(`SQL blocked: ${g.reason}`, 400, 'SQL_NOT_ALLOWED');

    const data = executeQuery(String(sql));
    res.json({ data, rows: data.length });
  } catch (e) {
    next(e);
  }
});

export default router;
