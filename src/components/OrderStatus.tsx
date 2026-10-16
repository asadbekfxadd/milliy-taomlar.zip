'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicOrder } from '@/lib/types';
import { STATUS } from '@/lib/defaults';
import { fmt } from '@/lib/format';
import { useSite } from './Providers';

export default function OrderStatus({ id, token }: { id: string; token: string }) {
  const { settings: st } = useSite();
  const [o, setO] = useState<PublicOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/orders/${id}?t=${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (r.status === 404) {
          setErr('Заказ не найден. Проверьте ссылку.');
          return;
        }
        const j = await r.json();
        if (!alive) return;
        setO(j);
        setErr(null);
        if (j.status === 'done' || j.status === 'cancelled') return;
      } catch {
        setErr('Нет связи. Пробуем снова…');
      }
      if (alive) t = setTimeout(load, 8000);
    };
    load();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [id, token]);

  if (!o)
    return (
      <section className="masthead g">
        <div className="in">
          <div className="kicker">Заказ</div>
          <h1 style={{ fontSize: 'clamp(56px,9vw,140px)' }}>{err ? 'Не найден' : 'Загружаем…'}</h1>
          {err && <div className="alert err" style={{ marginTop: 20, maxWidth: 640 }}>{err}</div>}
        </div>
      </section>
    );

  const idx = STATUS.findIndex((s) => s[0] === o.status);
  const cancelled = o.status === 'cancelled';
  const note = cancelled
    ? 'Ресторан отменил заказ. Если это ошибка, позвоните нам.'
    : o.status === 'new'
      ? 'Заказ получен и ждёт подтверждения. Статус на этой странице обновляется сам.'
      : o.status === 'accepted'
        ? 'Ресторан подтвердил заказ.'
        : o.status === 'cooking'
          ? 'Кухня уже готовит.'
          : o.status === 'ready'
            ? o.type === 'pickup'
              ? 'Можно забирать.'
              : 'Курьер везёт заказ.'
            : 'Заказ завершён. Спасибо!';

  return (
    <>
      <section className="masthead g">
        <div className="in">
          <div className="kicker">Заказ № {o.no}</div>
          <h1 style={{ fontSize: 'clamp(56px,9vw,140px)' }}>
            {cancelled ? (
              <>
                Заказ <em>отменён</em>
              </>
            ) : o.status === 'done' ? (
              <>
                Приятного <em>аппетита</em>
              </>
            ) : (
              <>
                Заказ <em>принят</em>
              </>
            )}
          </h1>
        </div>
      </section>
      <div className="g">
        <div className="in" style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 120 }}>
          <div className="status" aria-label="Статус заказа">
            {STATUS.map((s, i) => (
              <div key={s[0]} className={cancelled ? (i === 0 ? 'x' : '') : i <= idx ? 'on' : ''}>
                {i === 3 ? (o.type === 'pickup' ? 'Готов к выдаче' : 'Курьер в пути') : s[1]}
              </div>
            ))}
          </div>
          <div className={`alert ${cancelled ? 'err' : 'ok'}`} role="status">
            {note}
          </div>
          {err && <p className="cap">{err}</p>}
          {st.phone && (
            <p className="muted" style={{ fontSize: 14 }}>
              Вопросы по заказу: <b className="num" style={{ color: 'var(--cream)' }}>{st.phone}</b>
            </p>
          )}
          <div className="sum">
            {o.items.map((i, k) => (
              <div key={k}>
                <span>
                  {i.name}
                  {i.mods ? ' · ' + i.mods : ''} × {i.qty}
                </span>
                <span className="num">{fmt(i.sum)} сум</span>
              </div>
            ))}
            {o.fee > 0 && (
              <div>
                <span>Доставка</span>
                <span className="num">{fmt(o.fee)} сум</span>
              </div>
            )}
            <div className="t">
              <span>Итого</span>
              <span className="num">{fmt(o.total)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn" href="/menu">
              Заказать ещё
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
