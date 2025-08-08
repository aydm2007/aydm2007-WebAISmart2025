'use client';

import React, { useEffect, useRef, useState } from 'react';
import ChatBubble from './ChatBubble';
import Button from './ui/button';
import { Send } from 'lucide-react';
import { submitQueryStream } from '../lib/api';

type Msg = { text: React.ReactNode; isUser?: boolean; analysisId?: string; _streaming?: boolean };

export default function ChatInterface() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<null | (() => void)>(null);
  const placeholderIdxRef = useRef<number | null>(null);

  // تمرير التمرير لأسفل عند أي تحديث
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // نظّف أي بث مفتوح عند إزالة المكوّن
  useEffect(() => {
    return () => {
      cancelRef.current?.();
    };
  }, []);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    // أغلق أي بث قديم
    cancelRef.current?.();

    const q = input.trim();
    setInput('');
    setLoading(true);
    setStreaming(true);

    // أضف رسالة المستخدم + Placeholder للرد في عملية setState واحدة لتحصل على index دقيق
    setMessages(prev => {
      const next = [...prev, { text: q, isUser: true } as Msg];
      next.push({ text: '', isUser: false, analysisId: undefined, _streaming: true });
      placeholderIdxRef.current = next.length - 1;
      return next;
    });

    try {
      const stream = await submitQueryStream(q);

      // سجّل callbacks
      stream.onToken((t: string) => {
        setMessages(prev => {
          const idx = placeholderIdxRef.current;
          if (idx == null) return prev;
          const clone = [...prev];
          const curr = clone[idx] || { text: '', isUser: false, _streaming: true };
          clone[idx] = {
            ...curr,
            text: String(curr.text || '') + t,
            _streaming: true,
          };
          return clone;
        });
      });

      stream.onDone((doneData: any) => {
        // doneData المتوقع: { id, summary, sql }
        setStreaming(false);
        setMessages(prev => {
          const idx = placeholderIdxRef.current;
          const clone = [...prev];
          if (idx != null && clone[idx]) {
            clone[idx] = { ...clone[idx], _streaming: false, analysisId: doneData?.id };
          }
          return clone;
        });
      });

      // خزن دالة الإلغاء
      cancelRef.current = () => {
        try { stream.cancel(); } catch {}
        setStreaming(false);
        setLoading(false);
      };
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { text: 'حدث خطأ أثناء البث. يرجى المحاولة لاحقًا.', isUser: false },
      ]);
      setStreaming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="animate-pulse">جاهز للاستقبال… اكتب سؤالك وابدأ التحليل</div>
          </div>
        ) : (
          messages.map((msg, i) => <ChatBubble key={i} {...msg} />)
        )}
      </div>

      <div className="border-t p-4 flex gap-2 items-end">
        <textarea
          className="flex-1 p-2 border rounded min-h-[54px]"
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="اكتب سؤالك هنا..."
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={loading}
        />
        <Button onClick={handleSubmit} disabled={loading || !input.trim()}>
          {loading ? '...' : <Send className="w-4 h-4" />}
        </Button>
      </div>

      {streaming && (
        <div className="fixed bottom-20 right-6 bg-white border rounded shadow px-3 py-2 text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
          <span>يتم البث…</span>
        </div>
      )}
    </div>
  );
}
