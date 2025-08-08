
'use client';
import { useEffect, useMemo, useState } from 'react';
import InsightCard from './ui/InsightCard';
import GradientHeader from './GradientHeader';
import SQLViewer from './SQLViewer';
import Button from './ui/button';
import { api } from '../lib/api';
import ErrorBanner from './ErrorBanner';

type TabKey = 'summary' | 'data' | 'sql';

function normalizeItems(arr: any[] | undefined, fallbackTitle: string) {
  if (!arr) return [];
  return arr.map((x: any, i: number) => {
    if (typeof x === 'string') return { title: `${fallbackTitle} #${i+1}`, description: x, level: 'متوسطة' };
    const level = x.level ?? 'متوسطة';
    const title = x.title ?? `${fallbackTitle} #${i+1}`;
    const description = x.description ?? (x.text ?? JSON.stringify(x));
    return { title, description, level };
  });
}

function computeStats(rows: any[]) {
  const rowCount = rows?.length || 0;
  const cols = new Set<string>();
  let nulls = 0, cells = 0;
  for (const r of rows || []) {
    Object.keys(r||{}).forEach(k => cols.add(k));
    for (const k of Object.keys(r||{})) {
      const v = (r as any)[k];
      cells++;
      if (v === null || v === undefined || v === '') nulls++;
    }
  }
  const colCount = cols.size;
  const nullPct = cells ? Math.round((nulls / cells) * 1000)/10 : 0;
  return { rowCount, colCount, nullPct, columns: Array.from(cols) };
}

function exportCsv(rows: any[], columns: string[]) {
  const header = columns.join(',');
  const lines = rows.map(r => columns.map(c => JSON.stringify(r?.[c] ?? '')).join(','));
  const blob = new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'data.csv'; a.click(); URL.revokeObjectURL(url);
}

function copySql(sql: string) {
  if (!sql) return;
  navigator.clipboard?.writeText(sql);
}

export default function AnalysisDetail({ analysisId }: { analysisId: string }) {
  const [data, setData] = useState<any|null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<TabKey>('summary');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/analysis/${analysisId}`);
        setData(res);
      } finally {
        setLoading(false);
      }
    })();
  }, [analysisId]);

  const rows = data?.data || [];
  const sql = data?.sql || '';
  const stats = useMemo(() => computeStats(rows), [rows]);
  const patterns = normalizeItems(data?.patterns, 'نمط');
  const recs = normalizeItems(data?.recommendations, 'توصية');

  if (loading) return <div className="p-6">يتم التحميل…</div>;
  if (!data) return <div className="p-6">لا توجد بيانات تحليل لهذه الهوية.</div>;

  return (
    <div className="space-y-6">
      <GradientHeader title="تفاصيل نتائج الاستعلام" subtitle={`المعرّف: ${analysisId}`} />
      <div className="no-print sticky top-2 z-20 flex flex-wrap gap-2 justify-between items-center bg-white/60 dark:bg-slate-900/60 backdrop-blur rounded-2xl p-2 ring-1 ring-slate-200 dark:ring-slate-800">
        <div className="text-xs opacity-70">SQL: <span className="font-mono">{(sql||'—').slice(0,120)}</span></div>
        <div className="flex gap-2">
          <Button variant='outline' onClick={()=>copySql(sql)}>نسخ SQL</Button>
          <Button variant='outline' onClick={()=>window.print()}>طباعة</Button>
        </div>
      </div>
      <ErrorBanner message={data?.error} onRetry={()=>location.reload()} />

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button variant={active==='summary'?'default':'outline'} onClick={() => setActive('summary')}>ملخص شامل</Button>
        <Button variant={active==='data'?'default':'outline'} onClick={() => setActive('data')}>عرض البيانات</Button>
        <Button variant={active==='sql'?'default':'outline'} onClick={() => setActive('sql')}>كود SQL</Button>
      </div>

      {active==='summary' && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="font-semibold">الملخص</h2>
            <div className="rounded-2xl p-4 bg-white/80 dark:bg-slate-900/70 ring-1 ring-slate-200 dark:ring-slate-800 leading-7">
              {data?.summary || '—'}
            </div>
          </section>

          <section className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl p-4 bg-white/80 dark:bg-slate-900/70 ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="text-sm text-slate-500">عدد الصفوف</div>
              <div className="text-2xl font-bold mt-1">{stats.rowCount}</div>
            </div>
            <div className="rounded-2xl p-4 bg-white/80 dark:bg-slate-900/70 ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="text-sm text-slate-500">عدد الأعمدة</div>
              <div className="text-2xl font-bold mt-1">{stats.colCount}</div>
            </div>
            <div className="rounded-2xl p-4 bg-white/80 dark:bg-slate-900/70 ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="text-sm text-slate-500">نسبة القيم الناقصة</div>
              <div className="text-2xl font-bold mt-1">%{stats.nullPct}</div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">الأنماط المكتشفة</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {patterns.map((it, idx) => (
                <InsightCard key={idx} title={it.title} level={(it.level as any)||'متوسطة'}>
                  {it.description}
                </InsightCard>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">التوصيات العملية</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {recs.map((it, idx) => (
                <InsightCard key={idx} title={it.title} level={(it.level as any)||'متوسطة'}>
                  {it.description}
                </InsightCard>
              ))}
            </div>
          </section>
        </div>
      )}

      {active==='data' && (
        <div className="space-y-3">
          \1
              <Button variant='outline' onClick={()=>exportCsv(rows, stats.columns)}>تصدير CSV</Button>
              <Button variant='outline' onClick={async ()=>{
                const url = (process.env.NEXT_PUBLIC_API_URL||'http://localhost:5000') + '/export/table-excel';
                const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rows }) });
                const blob = await res.blob();
                const dl = document.createElement('a'); dl.href = URL.createObjectURL(blob); dl.download = 'table.xlsx'; dl.click(); setTimeout(()=>URL.revokeObjectURL(dl.href), 1000);
              }}>تصدير Excel</Button>
              <Button variant='outline' onClick={async ()=>{
                const url = (process.env.NEXT_PUBLIC_API_URL||'http://localhost:5000') + '/export/table-pdf';
                const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ rows }) });
                const blob = await res.blob();
                const dl = document.createElement('a'); dl.href = URL.createObjectURL(blob); dl.download = 'table.pdf'; dl.click(); setTimeout(()=>URL.revokeObjectURL(dl.href), 1000);
              }}>تصدير PDF</Button>
            \3
          <div className="overflow-auto rounded-xl ring-1 ring-slate-200 dark:ring-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  {stats.columns.map((c) => (<th key={c} className="text-right px-3 py-2 font-semibold">{c}</th>))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r: any, i: number) => (
                  <tr key={i} className="even:bg-slate-50/50 dark:even:bg-slate-900/30">
                    {stats.columns.map((c) => (<td key={c} className="px-3 py-2 whitespace-nowrap">{String(r?.[c] ?? '')}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-slate-500">عرض أول 200 صف.</div>
        </div>
      )}>تصدير CSV</Button><Button variant='outline' onClick={async()=>{const res=await fetch((process.env.NEXT_PUBLIC_API_URL||'http://localhost:5000')+'/export/table-excel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows})}); const blob=await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='table.xlsx'; a.click(); URL.revokeObjectURL(url);}}>تصدير Excel</Button></div></div><div className='flex gap-2'><Button variant='outline' onClick={()=>exportCsv(rows, stats.columns)}>تصدير CSV</Button><Button variant='outline' onClick={async()=>{const res=await fetch((process.env.NEXT_PUBLIC_API_URL||'http://localhost:5000')+'/export/export/table-excel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rows})}); const blob=await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='table.xlsx'; a.click(); URL.revokeObjectURL(url);}}>تصدير Excel</Button></div></div>
          <div className="overflow-auto rounded-xl ring-1 ring-slate-200 dark:ring-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  {stats.columns.map((c) => (<th key={c} className="text-right px-3 py-2 font-semibold">{c}</th>))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 200).map((r: any, i: number) => (
                  <tr key={i} className="even:bg-slate-50/50 dark:even:bg-slate-900/30">
                    {stats.columns.map((c) => (<td key={c} className="px-3 py-2 whitespace-nowrap">{String(r?.[c] ?? '')}</td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-slate-500">عرض أول 200 صف.</div>
        </div>
      )}

      {active==='sql' && (
        <div className="space-y-3">
          <h2 className="font-semibold">كود SQL</h2>
          <SQLViewer code={sql || '-- لا يوجد كود'} />
        </div>
      )}
    </div>
  );
}
