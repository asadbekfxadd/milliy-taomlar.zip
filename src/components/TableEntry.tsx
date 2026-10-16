'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSite } from './Providers';

export const TABLE_KEY = 'mt-table';
const TTL = 4 * 60 * 60 * 1000; // a visit lasts at most ~4 hours

export function readTable(): number | null {
  try {
    const v = JSON.parse(localStorage.getItem(TABLE_KEY) || 'null');
    if (v && Date.now() - v.at < TTL && Number.isInteger(v.n)) return v.n;
  } catch {}
  return null;
}
export function forgetTable() {
  try {
    localStorage.removeItem(TABLE_KEY);
  } catch {}
}

export default function TableEntry({ n }: { n: number }) {
  const { settings } = useSite();
  const router = useRouter();
  const ok = n >= 1 && n <= (settings.tables || 0);
  useEffect(() => {
    if (!ok) return;
    try {
      localStorage.setItem(TABLE_KEY, JSON.stringify({ n, at: Date.now() }));
    } catch {}
    router.replace('/menu');
  }, [ok, n, router]);
  return (
    <section className="masthead g">
      <div className="in">
        <div className="kicker">{settings.name}</div>
        <h1 style={{ fontSize: 'clamp(56px,10vw,150px)' }}>{ok ? <>Стол <em>{n}</em></> : 'Стол не найден'}</h1>
        <p className="muted" style={{ fontSize: 18 }}>{ok ? 'Открываем меню…' : 'Попросите официанта или откройте меню вручную.'}</p>
      </div>
    </section>
  );
}

/* Small note on the menu so a guest who tapped the table tag knows the order goes to their table. */
export function TableNote() {
  const { settings } = useSite();
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const t = readTable();
    if (t && t <= (settings.tables || 0)) setN(t);
  }, [settings.tables]);
  if (!n) return null;
  return (
    <div className="tablenote">
      <span>
        Вы за столом <b className="num">{n}</b> · заказ придёт прямо к вам, оплата официанту
      </span>
      <button type="button" className="link" onClick={() => (forgetTable(), setN(null))}>
        Не мой стол
      </button>
    </div>
  );
}
