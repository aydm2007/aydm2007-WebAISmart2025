import express from 'express';
import db, { executeQuery } from '../db/database';
import { getSchemaDescription } from '../db/database';

const router = express.Router();

router.get('/tables', (_req, res) => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((r:any)=>r.name);
  const result:any[] = [];
  for (const t of tables) {
    const cols = db.prepare(`PRAGMA table_info('${t}')`).all().map((c:any)=>({ name:c.name, type:c.type, pk: !!c.pk }));
    const count = db.prepare(`SELECT COUNT(*) as c FROM '${t}'`).get().c;
    result.push({ table: t, count, columns: cols });
  }
  res.json({ tables: result });
});

router.get('/schema_desc', (_req, res) => {
  const desc = getSchemaDescription();
  res.type('text/plain').send(desc);
});

export default router;
