
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '../components/ui/button';
import Link from 'next/link';
import { useToast } from '../components/ui/toast';

type Msg = { id: string; role: 'user'|'assistant'; text: string; analysis_id?: string|null; created_at: string; seq: number };

export default function ConversationDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { show } = useToast();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [total, setTotal] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${base}/api/history/conversations/${id}/messages?page=${page}&pageSize=${pageSize}`);
      const json = await res.json();
      setMessages(json.rows || []);
      setTotal(json.total || 0);
    } catch {
      show({ title: 'خطأ', description: 'تعذّر تحميل الرسائل' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) load(); }, [id, page, pageSize]);

  const send = async () => {
    if (!text.trim()) return;
    try {
      const res = await fetch(`${base}/api/history/conversations/${id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error('failed');
      setText('');
      // reload first page (or current)
      load();
    } catch {
      show({ title: 'خطأ', description: 'تعذّر إرسال الرسالة' });
    }
  };

  const archive = async (op: 'archive'|'unarchive') => {
    try {
      await fetch(`${base}/api/history/conversations/${id}/${op}`, { method: 'POST' });
      show({ title: 'تم', description: op === 'archive' ? 'تمت الأرشفة' : 'تم فك الأرشفة' });
    } catch {
      show({ title: 'خطأ', description: 'تعذّر تغيير حالة الأرشفة' });
    }
  };

  const del = async () => {
    if (!confirm('هل تريد حذف المحادثة نهائياً؟')) return;
    try {
      await fetch(`${base}/api/history/conversations/${id}`, { method: 'DELETE' });
      show({ title: 'تم', description: 'تم حذف المحادثة' });
    } catch {
      show({ title: 'خطأ', description: 'تعذّر الحذف' });
    }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b p-4 flex items-center justify-between">
        <div className="space-x-2 space-x-reverse">
          <Link href="/" className="text-blue-600 hover:underline">← العودة</Link>
          <span className="text-gray-500 text-sm">({total} رسالة)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => archive('archive')}>أرشفة</Button>
          <Button variant="outline" onClick={() => archive('unarchive')}>فك الأرشفة</Button>
          <Button variant="destructive" onClick={del}>حذف</Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-sm text-gray-500">جارٍ التحميل…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-gray-500">لا توجد رسائل</div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                <div className="text-xs text-gray-500 mb-1">{m.seq}. {new Date(m.created_at).toLocaleString()}</div>
                <div className="whitespace-pre-wrap">{m.text}</div>
                {m.analysis_id && (
                  <div className="mt-2">
                    <Link className="text-blue-600 hover:underline" href={`/${m.analysis_id}`}>عرض التحليل</Link>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t p-4 flex items-end gap-2">
        <textarea
          className="flex-1 p-2 border rounded min-h-[54px]"
          rows={2}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="اكتب رسالتك…"
        />
        <Button onClick={send} disabled={!text.trim()}>إرسال</Button>
      </div>

      <div className="border-t p-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span>الصفحة:</span>
          <button className="px-2 py-1 border rounded" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1}>السابق</button>
          <span>{page} / {pages}</span>
          <button className="px-2 py-1 border rounded" onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page>=pages}>التالي</button>
        </div>
        <div className="flex items-center gap-2">
          <span>حجم الصفحة:</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="border rounded p-1">
            {[20,30,50,100].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
