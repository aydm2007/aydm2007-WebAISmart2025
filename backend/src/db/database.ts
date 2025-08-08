// backend/src/db/database.ts
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'local_database.db');
const db = new Database(DB_PATH, { verbose: undefined, fileMustExist: true });

// تفعيل المفاتيح الأجنبية
db.pragma('foreign_keys = ON');

// === أدوات تطبيع وتنظيف SQL ===
function stripCodeFences(sql: string) {
  const m = sql.match(/```sql\s*([\s\S]*?)\s*```/i);
  return (m ? m[1] : sql).trim();
}

function normalizeSql(sql: string) {
  let s = stripCodeFences(sql);
  // احذف الفاصلة المنقوطة النهائية إن وجدت (مهم لتجنّب ; LIMIT ...)
  s = s.replace(/;\s*$/i, '').trim();
  // طبّع نهايات الأسطر والمسافات
  s = s.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ');
  return s;
}

function ensureSelectHasSingleLimit(sql: string, def = 200) {
  const isSelect = /^\s*select\b/i.test(sql);
  const hasLimit = /\blimit\b\s+\d+/i.test(sql);
  if (isSelect && !hasLimit) return `${sql} LIMIT ${def}`;
  return sql; // لا تضف LIMIT إن كان موجودًا
}

// === خدمات وصف المخطط (كما هي) ===
export function listTables(): string[] {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  return rows.map((r: any) => r.name);
}

export function listColumns(table: string): Array<{ name: string; type: string; pk: number }> {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c: any) => ({ name: c.name, type: c.type, pk: c.pk }));
}

function listForeignKeys(table: string) {
  try {
    return db.prepare(`PRAGMA foreign_key_list(${table})`).all();
  } catch {
    return [];
  }
}

function sampleValues(table: string) {
  try {
    return db.prepare(`SELECT * FROM ${table} LIMIT 3`).all();
  } catch {
    return [];
  }
}

// === التنفيذ الآمن للاستعلامات ===
export function executeQuery(sql: string, params: any[] = []) {
  // منع أي أمر غير SELECT
  const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|PRAGMA|TRIGGER|VACUUM|REINDEX)\b/i;
  if (forbidden.test(sql)) throw new Error('Only SELECT queries are allowed.');

  // تطبيع ومنع تكرار LIMIT
  let finalSql = normalizeSql(sql);
  finalSql = ensureSelectHasSingleLimit(finalSql, 200);

  // منع العبارات المتعددة
  if (finalSql.includes(';')) throw new Error('Multiple statements are not allowed');

  const stmt = db.prepare(finalSql);
  return params.length ? stmt.all(...params) : stmt.all();
}

export const getSchemaDescription = () => {
  const tables = listTables();
  let desc = `# SQLite Schema Summary (Auto-Generated)\nDB Path: ${DB_PATH}\n`;
  for (const t of tables) {
    const cols = listColumns(t).map(c => `${c.name} (${c.type}${c.pk ? ', PK' : ''})`).join(', ');
    const fks = listForeignKeys(t).map((fk: any) => `FK ${fk.from} -> ${fk.table}.${fk.to}`).join('; ');
    const sample = sampleValues(t);
    desc += `\n\n-- Table: ${t}\n-- Columns: ${cols}`;
    if (fks) desc += `\n-- ForeignKeys: ${fks}`;
    if (sample && sample.length) {
      const keys = Object.keys(sample[0] || {});
      desc += `\n-- Sample: ${JSON.stringify(sample, null, 2)}`;
      const idCols = keys.filter(k => /(_id$|Id$|ID$)/.test(k)).join(', ');
      if (idCols) desc += `\n-- Hints: ID-like columns ${idCols}`;
    }
  }
  return desc;
};

export default db;
