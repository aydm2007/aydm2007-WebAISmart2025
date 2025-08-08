import { ReactNode } from 'react';

interface InsightCardProps {
  title: string;
  icon?: ReactNode;
  level: 'عالية' | 'متوسطة' | 'منخفضة';
  children: ReactNode;
}

const levelColors: Record<InsightCardProps['level'], {chip: string, ring: string}> = {
  'عالية': { chip: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', ring: 'ring-red-200 dark:ring-red-800' },
  'متوسطة': { chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', ring: 'ring-amber-200 dark:ring-amber-800' },
  'منخفضة': { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', ring: 'ring-emerald-200 dark:ring-emerald-800' },
};

import LevelBadge from './level-badge';
import { Lightbulb, BarChart3 } from 'lucide-react';
export default function InsightCard({ title, icon, level, children }: InsightCardProps) {
  return (
    <div className={`rounded-2xl p-4 bg-white/80 dark:bg-slate-900/70 backdrop-blur ring-1 ${levelColors[level].ring}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {icon && <span className="text-brand">{icon}</span>}
          <h3 className="text-base font-bold">{title}</h3>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${levelColors[level].chip}`}>{level}</span>
      </div>
      <div className="text-sm leading-7 text-slate-700 dark:text-slate-300">{children}</div>
    </div>
  );
}
