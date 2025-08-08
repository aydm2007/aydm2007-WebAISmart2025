
'use client';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import Link from 'next/link';
import { useToast } from './ui/toast';

export default function Sidebar() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const { show } = useToast();

  const load = async (reset=false) => {
    try {
      setLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${base}/api/history/conversations?includeArchived=${includeArchived?1:0}&limit=25&offset=${reset?0:offset}`);
      const json = await res.json();
      setConversations(reset ? (json.conversations||[]) : [...conversations, ...(json.conversations||[])]);
      setOffset((reset?0:offset) + 25);
    } catch {
      show({ title: 'خطأ الشبكة', description: 'تعذّر تحميل المحادثات' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(true); /* initial */ }, [includeArchived]);

  const create = async () => {
    const title = prompt('عنوان المحادثة؟') || 'محادثة جديدة';
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      await fetch(`${base}/api/history/conversations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title })
      });
      show({ title: 'تم الإنشاء', description: 'تم إنشاء المحادثة بنجاح' });
      setOffset(0);
      load(true);
    } catch {
      show({ title: 'فشل الإنشاء', description: 'تعذّر إنشاء المحادثة' });
    }
  };

  return (
    <aside className="w-72 bg-gray-100 p-4 h-full flex flex-col border-r">
      <Button className="mb-3 w-full" onClick={create}>محادثة جديدة</Button>

      <label className="flex items-center gap-3 text-sm mb-2">
        <input type="checkbox" checked={includeArchived} onChange={e => { setIncludeArchived(e.target.checked); setOffset(0); }} />
        إظهار المؤرشفة
      </label>

      <ul className="space-y-2 flex-1 overflow-auto">
        {conversations.map(conv => (
          <li key={conv.id} className="p-3 bg-white rounded border hover:bg-gray-50 transition">
            <Link href={`/${conv.id}`} className="flex justify-between items-center">
              <span className="truncate">{conv.title}</span>
              {conv.is_archived ? <span className="text-xs text-gray-500">Archived</span> : null}
            </Link>
          </li>
        ))}
        {loading && <li className="text-center text-xs text-gray-500 py-2">جارٍ التحميل…</li>}
      </ul>

      <Button variant="outline" onClick={() => load(false)} disabled={loading} className="mt-2">
        تحميل المزيد
      </Button>

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">الأدوات المالية</h3>

        <Link href="/dashboard" className="flex items-center gap-2 w-full p-2 text-right rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
          <span className="text-lg">📊</span>
          <span className="text-sm">لوحة التحكم المالية</span>
        </Link>

        <Link href="/sql" className="flex items-center gap-2 w-full p-2 text-right rounded-lg text-green-600 hover:bg-green-50 transition-colors">
          <span className="text-lg">🔧</span>
          <span className="text-sm">محرر SQL</span>
        </Link>

        <Link href="/settings" className="flex items-center gap-2 w-full p-2 text-right rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          <span className="text-lg">⚙️</span>
          <span className="text-sm">الإعدادات</span>
        </Link>

        <div className="border-t pt-2 mt-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">التحليل السريع</h3>

          <button className="flex items-center gap-2 w-full p-2 text-right rounded-lg text-purple-600 hover:bg-purple-50 transition-colors">
            <span className="text-lg">🤖</span>
            <span className="text-sm">المساعد الذكي</span>
          </button>

          <button className="flex items-center gap-2 w-full p-2 text-right rounded-lg text-orange-600 hover:bg-orange-50 transition-colors">
            <span className="text-lg">📈</span>
            <span className="text-sm">توقعات سريعة</span>
          </button>

          <button className="flex items-center gap-2 w-full p-2 text-right rounded-lg text-red-600 hover:bg-red-50 transition-colors">
            <span className="text-lg">⚠️</span>
            <span className="text-sm">كشف الشذوذ</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
