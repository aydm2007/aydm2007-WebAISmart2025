'use client';
import Button from './ui/button';

export default function ErrorBanner({ message, onRetry }:{ message?: string, onRetry?: ()=>void }) {
  if (!message) return null;
  const suggestions: string[] = [];
  if (/SQL blocked:/.test(message)) {
    suggestions.push('استخدم سؤالاً أبسط لتحصيل SELECT واحد فقط.');
    suggestions.push('تجنّب الكلمات المحظورة (CREATE/ALTER/DROP/INSERT/UPDATE/DELETE/PRAGMA...).');
    suggestions.push('لا تستخدم الفاصلة المنقوطة ; ولا CTE متعددة.');
    suggestions.push('تحقق من أسماء الجداول/الأعمدة الفعلية كما تظهر في المخطط.');
  } else if (/حدث خطأ أثناء التحليل/.test(message)) {
    suggestions.push('جرّب إعادة المحاولة؛ إن استمر، فعّل OPENAI_MOCK لتجاوز مشاكل الاتصال مؤقتاً.');
  }
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100 p-3 space-y-2">
      <div className="font-semibold">تنبيه</div>
      <div className="text-sm">{message}</div>
      {Boolean(suggestions.length) && (
        <ul className="list-disc pr-6 text-sm space-y-1">{suggestions.map((s,i)=>(<li key={i}>{s}</li>))}</ul>
      )}
      {onRetry && <div className="text-left"><Button variant="outline" onClick={onRetry}>إعادة المحاولة</Button></div>}
    </div>
  );
}
