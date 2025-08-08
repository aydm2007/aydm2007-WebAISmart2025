
import db from './database';

type SettingRow = { key: string; value: string };

export type AppSettings = {
  AUTO_ARCHIVE_DAYS: number;
  STREAMING_ENABLED: boolean;
  DEFAULT_CHART_TYPE: 'bar'|'line'|'pie';
  DEFAULT_PAGE_SIZE: number;
  SQL_WRAP_LINES: boolean;
  CHART_COLORS: string[];
};

export function initSettings() {
  db.prepare(`CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`).run();
}

export function getAllSettings(): AppSettings {
  initSettings();
  const rows = db.prepare(`SELECT key,value FROM app_settings`).all() as SettingRow[];
  const map = new Map(rows.map(r => [r.key, r.value]));

  const parseBool = (s: any) => String(s).toLowerCase() === 'true' || s === '1';
  const parseNum = (s: any, d: number) => isNaN(Number(s)) ? d : Number(s);

  // defaults (can be overridden by DB; env can act as initial seed elsewhere)
  const defaults: AppSettings = {
    AUTO_ARCHIVE_DAYS: 30,
    STREAMING_ENABLED: true,
    DEFAULT_CHART_TYPE: 'bar',
    DEFAULT_PAGE_SIZE: 30,
    SQL_WRAP_LINES: true,
    CHART_COLORS: ['#3366CC','#DC3912','#FF9900','#109618','#990099']
  };

  return {
    AUTO_ARCHIVE_DAYS: parseNum(map.get('AUTO_ARCHIVE_DAYS') ?? defaults.AUTO_ARCHIVE_DAYS, defaults.AUTO_ARCHIVE_DAYS),
    STREAMING_ENABLED: map.has('STREAMING_ENABLED') ? parseBool(map.get('STREAMING_ENABLED')) : defaults.STREAMING_ENABLED,
    DEFAULT_CHART_TYPE: (map.get('DEFAULT_CHART_TYPE') as any) || defaults.DEFAULT_CHART_TYPE,
    DEFAULT_PAGE_SIZE: parseNum(map.get('DEFAULT_PAGE_SIZE') ?? defaults.DEFAULT_PAGE_SIZE, defaults.DEFAULT_PAGE_SIZE),
    SQL_WRAP_LINES: map.has('SQL_WRAP_LINES') ? parseBool(map.get('SQL_WRAP_LINES')) : defaults.SQL_WRAP_LINES,
    CHART_COLORS: map.has('CHART_COLORS') ? JSON.parse(String(map.get('CHART_COLORS'))) : defaults.CHART_COLORS,
  };
}

export function setSettings(patch: Partial<AppSettings>): AppSettings {
  initSettings();
  const curr = getAllSettings();
  const next: AppSettings = { ...curr, ...patch };

  const entries: [string, string][] = [
    ['AUTO_ARCHIVE_DAYS', String(next.AUTO_ARCHIVE_DAYS)],
    ['STREAMING_ENABLED', String(next.STREAMING_ENABLED)],
    ['DEFAULT_CHART_TYPE', String(next.DEFAULT_CHART_TYPE)],
    ['DEFAULT_PAGE_SIZE', String(next.DEFAULT_PAGE_SIZE)],
    ['SQL_WRAP_LINES', String(next.SQL_WRAP_LINES)],
    ['CHART_COLORS', JSON.stringify(next.CHART_COLORS)]
  ];

  const upsert = db.prepare(`INSERT INTO app_settings (key,value) VALUES (?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value`);
  const trx = db.transaction((rows: [string,string][]) => {
    rows.forEach(([k,v]) => upsert.run(k,v));
  });
  trx(entries);

  return getAllSettings();
}
