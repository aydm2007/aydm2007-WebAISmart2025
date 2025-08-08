'use client';
import clsx from 'clsx';

type Level = 'عالية'|'متوسطة'|'منخفضة'|string;

export default function LevelBadge({ level }: { level: Level }) {
  const map: Record<string,string> = {
    'عالية': 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-800',
    'متوسطة': 'bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800',
    'منخفضة': 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800',
  };
  const cls = clsx('px-2 py-0.5 rounded-full text-xs font-medium ring-1', map[level] || map['متوسطة']);
  return <span className={cls}>{level || 'متوسطة'}</span>;
}
