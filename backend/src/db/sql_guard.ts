import db, { listTables, listColumns } from './database';

/** Normalize SQL: strip comments and collapse whitespace */
function normalize(sql: string): string {
  // remove /* */ comments
  sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  // remove -- comments
  sql = sql.replace(/--.*$/gm, '');
  return sql.trim();
}

const FORBIDDEN = /(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|REINDEX|VACUUM|PRAGMA|TRIGGER)/i;

function extractTables(sql: string): string[] {
  const names: string[] = [];
  const re = /\b(?:from|join)\s+([`"\[]?)([\w\.]+)\1(?:\s+as)?\s*[\w\"]*/ig;
  let m;
  while ((m = re.exec(sql)) !== null) {
    let raw = m[2];
    // remove schema prefix if any (not typical in SQLite)
    if (raw.includes('.')) raw = raw.split('.').pop() as string;
    names.push(raw);
  }
  return Array.from(new Set(names));
}

export type GuardResult = { ok: true, tables: string[] } | { ok: false, reason: string };

export function guardSql(input: string): GuardResult {
  if (!input || !input.trim()) return { ok: false, reason: 'SQL فارغ' };
  const sql = normalize(input);
  if (/;/.test(sql)) return { ok: false, reason: 'ممنوع تعدد الأوامر أو الفاصلة المنقوطة ;' };
  if (!/^select\b/i.test(sql)) return { ok: false, reason: 'مسموح SELECT فقط' };
  if (FORBIDDEN.test(sql)) return { ok: false, reason: 'يحتوي أوامر محظورة' };

  const referenced = extractTables(sql);
  const existing = listTables().map(t => t.toLowerCase());
  for (const t of referenced) {
    if (!existing.includes(t.toLowerCase())) {
      return { ok: false, reason: `الجدول غير موجود: ${t}` };
    }
  }
  // Soft limit rows if no LIMIT present; done later in executeQuery as well.
  return { ok: true, tables: referenced };
}
