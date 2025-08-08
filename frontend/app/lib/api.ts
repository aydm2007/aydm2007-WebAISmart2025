// app/lib/api.ts
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type TokenCb = (t: string) => void;
type DoneCb = (data: any) => void;
type ErrorCb = (msg: string) => void;

export async function submitQueryStream(question: string) {
  const url = `${API}/api/chat/stream?q=${encodeURIComponent(question)}`;
  const es = new EventSource(url, { withCredentials: false });

  let tokenCb: TokenCb | null = null;
  let doneCb: DoneCb | null = null;
  let errorCb: ErrorCb | null = null;

  // ملاحظة: الرسائل لدينا تأتي عبر onmessage (بدون event type مخصص)
  es.onmessage = (ev) => {
    try {
      const payload = JSON.parse(ev.data);
      if (payload?.type === 'token') {
        tokenCb?.(String(payload.data ?? ''));
      } else if (payload?.type === 'done') {
        doneCb?.(payload.data);
        es.close();
      } else if (payload?.type === 'error') {
        const msg = String(payload?.data?.message || 'Stream error');
        errorCb?.(msg);
        es.close();
      }
    } catch {
      // تجاهل الأسطر غير القابلة للتحليل
    }
  };

  es.onerror = () => {
    errorCb?.('SSE connection error');
    try { es.close(); } catch {}
  };

  return {
    onToken(cb: TokenCb) { tokenCb = cb; },
    onDone(cb: DoneCb) { doneCb = cb; },
    onError(cb: ErrorCb) { errorCb = cb; },
    cancel() { try { es.close(); } catch {} },
  };
}
