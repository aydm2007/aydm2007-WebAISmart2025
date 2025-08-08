
'use client';
import { useState } from 'react';
import SQLViewer from '../components/SQLViewer';
import { useToast } from '../components/ui/toast';

function RowTable({ rows }: { rows: any[] }) {
  const keys = rows.length ? Object.keys(rows[0]) : [];
  return (
    <div className="rounded border overflow-x-auto mt-4">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>{keys.map(k => <th key={k} className="text-right p-2 border-b">{k}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-gray-50">
              {keys.map(k => <td key={k} className="p-2 border-b">{String(r[k])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SQLPage() {
  const [sql, setSql] = useState<string>('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name;');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const run = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/sql/safe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sql })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'SQL failed');
      setRows(json.data || []);
      show({ title: 'تم التنفيذ', description: `عدد الصفوف: ${json.rows}` });
    } catch (e:any) {
      show({ title: 'خطأ SQL', description: e.message || 'تعذّر التنفيذ' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6">
      <h1 className="text-xl font-semibold mb-3">SQL Playground (قراءة فقط)</h1>
      <p className="text-sm text-gray-600 mb-3">تنفيذ آمن لاستعلامات SELECT فقط. أي أمر تعديل سيتم رفضه.</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <SQLViewer code={sql} />
          <textarea
            className="w-full h-40 border rounded p-2 mt-2 font-mono"
            value={sql}
            onChange={e => setSql(e.target.value)}
            placeholder="SELECT ..."
          />
          <button onClick={run} disabled={loading} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">
            {loading ? 'جارٍ التنفيذ...' : 'نفّذ'}
          </button>
        </div>
        <div>
          <h2 className="font-semibold mb-2">النتائج</h2>
          <RowTable rows={rows} />
        </div>
      </div>
    </div>
  );
}
