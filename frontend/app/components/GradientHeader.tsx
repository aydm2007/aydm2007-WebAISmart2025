'use client';
import React from 'react';

export default function GradientHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const handlePrint = () => window.print();
  return (
    <div className="gradient-frame">
      <div className="gradient-inner flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn">طباعة</button>
        </div>
      </div>
    </div>
  );
}
