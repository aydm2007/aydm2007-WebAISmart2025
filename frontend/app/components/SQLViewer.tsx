
'use client';
import { useState } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

function simpleFormat(sql: string): string {
  try {
    let s = sql.replace(/\s+/g, ' ').trim();
    s = s.replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LEFT JOIN|INNER JOIN|JOIN|ON|LIMIT)\b/gi, '\n$1 ');
    s = s.replace(/\n /g, '\n');
    return s.trim();
  } catch { return sql; }
}

export default function SQLViewer({ code }: { code: string }) {
  const [wrap, setWrap] = useState(true);
  const [formatted, setFormatted] = useState(simpleFormat(code));

  const copy = async () => {
    await navigator.clipboard.writeText(formatted);
    alert('Copied');
  };
  const download = () => {
    const blob = new Blob([formatted], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'query.sql'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={wrap} onChange={e => setWrap(e.target.checked)} />
          التفاف الأسطر
        </label>
        <button onClick={() => setFormatted(simpleFormat(code))} className="px-2 py-1 border rounded">تنسيق</button>
        <button onClick={copy} className="px-2 py-1 border rounded">نسخ</button>
        <button onClick={download} className="px-2 py-1 border rounded">تنزيل</button>
      </div>
      <SyntaxHighlighter language="sql" style={atomOneDark} customStyle={{ borderRadius: '0.5rem', fontSize: '0.9rem', whiteSpace: wrap ? 'pre-wrap' : 'pre' }}>
        {formatted}
      </SyntaxHighlighter>
    </div>
  );
}
