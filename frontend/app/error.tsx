'use client';
import Button from './components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="min-h-screen grid place-items-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6">
          <div className="max-w-lg w-full rounded-2xl ring-1 ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h1 className="text-xl font-bold">حدث خطأ غير متوقع</h1>
            <p className="text-sm opacity-80">
              {error?.message || 'عذراً، تعذر إكمال العملية.'}
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => window.location.reload()}>إعادة تحميل</Button>
              <Button onClick={() => reset()}>إعادة المحاولة</Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
