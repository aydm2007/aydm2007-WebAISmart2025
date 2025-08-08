'use client';
import { useEffect, useState } from 'react';
import { useToast } from '../components/ui/toast';
import Link from 'next/link';

type Settings = {
  AUTO_ARCHIVE_DAYS: number;
  STREAMING_ENABLED: boolean;
  DEFAULT_CHART_TYPE: 'bar'|'line'|'pie';
  DEFAULT_PAGE_SIZE: number;
  SQL_WRAP_LINES: boolean;
  CHART_COLORS: string[];
};

export default function SettingsPage() {
  const { show } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [colors, setColors] = useState<string>('');

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const load = async () => {
    try {
      const res = await fetch(`${base}/api/settings`);
      const json = await res.json();
      setSettings(json);
      setColors((json.CHART_COLORS || []).join(','));
    } catch {
      show({ title: 'خطأ', description: 'تعذّر تحميل الإعدادات' });
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const patch = {
        ...settings,
        CHART_COLORS: colors.split(',').map((s: string) => s.trim()).filter(Boolean)
      };
      const res = await fetch(`${base}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error('failed');
      const json = await res.json();
      setSettings(json);
      setColors((json.CHART_COLORS || []).join(','));
      show({ title: 'تم الحفظ', description: 'تم تحديث الإعدادات بنجاح' });
    } catch {
      show({ title: 'خطأ', description: 'تعذّر حفظ الإعدادات' });
    }
  };

  if (!settings) return <div className="p-6">جارٍ التحميل…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">إعدادات النظام</h1>
        <Link href="/" className="text-blue-600 hover:underline">← العودة</Link>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="block text-sm">أيام الأرشفة التلقائية (AUTO_ARCHIVE_DAYS)</label>
          <input type="number" className="border rounded p-2 w-60"
            value={settings.AUTO_ARCHIVE_DAYS}
            onChange={e => setSettings({ ...settings!, AUTO_ARCHIVE_DAYS: Number(e.target.value) })}
          />

          <label className="block text-sm mt-3">تفعيل البث (STREAMING_ENABLED)</label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox"
              checked={settings.STREAMING_ENABLED}
              onChange={e => setSettings({ ...settings!, STREAMING_ENABLED: e.target.checked })}
            />
            مفعّل
          </label>

          <label className="block text-sm mt-3">نوع الرسم الافتراضي (DEFAULT_CHART_TYPE)</label>
          <select className="border rounded p-2 w-60"
            value={settings.DEFAULT_CHART_TYPE}
            onChange={e => setSettings({ ...settings!, DEFAULT_CHART_TYPE: e.target.value as any })}
          >
            <option value="bar">أعمدة</option>
            <option value="line">خطّي</option>
            <option value="pie">دائري</option>
          </select>

          <label className="block text-sm mt-3">حجم الصفحة الافتراضي (DEFAULT_PAGE_SIZE)</label>
          <select className="border rounded p-2 w-60"
            value={settings.DEFAULT_PAGE_SIZE}
            onChange={e => setSettings({ ...settings!, DEFAULT_PAGE_SIZE: Number(e.target.value) })}
          >
            {[20,30,50,100].map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <label className="block text-sm mt-3">التفاف أسطر SQL افتراضي (SQL_WRAP_LINES)</label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox"
              checked={settings.SQL_WRAP_LINES}
              onChange={e => setSettings({ ...settings!, SQL_WRAP_LINES: e.target.checked })}
            />
            مفعّل
          </label>
        </div>

        <div className="space-y-3">
          <label className="block text-sm">ألوان الرسوم (CHART_COLORS) — افصل بينها بفاصلة</label>
          <textarea className="border rounded p-2 w-full h-40 font-mono"
            value={colors}
            onChange={e => setColors(e.target.value)}
            placeholder="#3366CC,#DC3912,#FF9900,..."
          />
          <div className="flex flex-wrap gap-2">
            {(settings.CHART_COLORS || []).map((c, i) => (
              <span key={i} className="inline-flex items-center gap-2 border rounded px-2 py-1 text-xs">
                <span className="w-4 h-4 rounded" style={{ background: c }} />
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <button onClick={save} className="bg-blue-600 text-white px-4 py-2 rounded">حفظ</button>
      </div>
    </div>
  );
}
