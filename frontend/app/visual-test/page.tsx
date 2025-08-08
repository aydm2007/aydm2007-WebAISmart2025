export default function VisualTestPage() {
  // ثابتة لضمان استقرار اللقطة
  const patterns = [
    { title: 'نمط بيعي موسمي', description: 'ارتفاع في الربع الرابع بنسبة 22%', level: 'مرتفعة' },
    { title: 'انخفاض الطلب', description: 'هبوط فئة B بنسبة 11%', level: 'متوسطة' },
  ];
  const recs = [
    { title: 'تعزيز المخزون', description: 'رفع مخزون الفئة A قبل Q4', level: 'مرتفعة' },
    { title: 'حملة ترويجية', description: 'خصم محدود لفئة B', level: 'متوسطة' },
  ];
  return (
    <main dir="rtl" className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">اختبار بصري ثابت</h1>
      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4 ring-1 ring-slate-200">ملخص: لقطة ثابتة للتأكد من الاستقرار البصري.</div>
        <div className="rounded-2xl p-4 ring-1 ring-slate-200">معلومات إضافية: بدون بيانات زمنية.</div>
      </section>
      <section className="grid md:grid-cols-2 gap-4">
        {patterns.map((p, i)=>(
          <div key={i} className="rounded-2xl p-4 ring-1 ring-slate-200">
            <div className="font-semibold">{p.title}</div>
            <div className="text-sm opacity-80">{p.description}</div>
          </div>
        ))}
      </section>
      <section className="grid md:grid-cols-2 gap-4">
        {recs.map((p, i)=>(
          <div key={i} className="rounded-2xl p-4 ring-1 ring-slate-200">
            <div className="font-semibold">{p.title}</div>
            <div className="text-sm opacity-80">{p.description}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
