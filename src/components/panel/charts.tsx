'use client';
import { useState } from 'react';

const m = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
const dayLabel = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : d);

/** One series of bars (revenue by day / hour). Hover or tap a bar to read its value. */
export function Bars({ data, unit = 'сум', labels = 'day', height = 180 }: { data: { label: string; v: number; n?: number }[]; unit?: string; labels?: 'day' | 'raw'; height?: number }) {
  const fmtLabel = labels === 'day' ? dayLabel : (x: string) => x;
  const [hi, setHi] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.v));
  const total = data.reduce((s, d) => s + d.v, 0);
  if (!total) return <div className="empty">За этот период продаж нет</div>;
  const cur = hi !== null ? data[hi] : null;
  return (
    <div>
      <div className="small muted" style={{ minHeight: 20 }} aria-live="polite">
        {cur ? (
          <>
            <b style={{ color: 'var(--ink)' }}>{fmtLabel(cur.label)}</b> · {m(cur.v)} {unit}
            {cur.n !== undefined ? ` · чеков ${cur.n}` : ''}
          </>
        ) : (
          <>Максимум {m(max)} {unit}</>
        )}
      </div>
      <div className="bars" style={{ height }} onMouseLeave={() => setHi(null)}>
        {data.map((d, i) => (
          <div
            key={d.label}
            role="img"
            aria-label={`${fmtLabel(d.label)}: ${m(d.v)} ${unit}`}
            tabIndex={0}
            onMouseEnter={() => setHi(i)}
            onFocus={() => setHi(i)}
            onClick={() => setHi(i)}
            style={{ height: `${d.v ? Math.max(2, (d.v / max) * 100) : 0}%`, background: hi === i ? 'var(--saffron)' : undefined }}
          />
        ))}
      </div>
      <div className="bars-x">
        <span>{fmtLabel(data[0].label)}</span>
        {data.length > 2 && <span>{fmtLabel(data[Math.floor(data.length / 2)].label)}</span>}
        <span>{fmtLabel(data[data.length - 1].label)}</span>
      </div>
    </div>
  );
}
