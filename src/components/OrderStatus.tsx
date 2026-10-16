'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicOrder } from '@/lib/types';
import { fmt } from '@/lib/format';
import { useSite } from './Providers';

const clock = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
const PROVIDER: Record<string, string> = { payme: 'Payme', click: 'Click' };

function steps(o: PublicOrder) {
  return [
    ['new', 'Получен'],
    ['accepted', 'Принят'],
    ['cooking', 'Готовится'],
    ['ready', o.type === 'delivery' ? 'Курьер в пути' : o.type === 'pickup' ? 'Готов к выдаче' : 'Выносим'],
    ['done', o.type === 'delivery' ? 'Доставлен' : 'Выдан'],
  ] as const;
}

function headline(o: PublicOrder): [string, string] {
  if (o.status === 'cancelled') return ['Заказ', 'отменён'];
  if (o.payStatus === 'pending' || o.payStatus === 'failed') return ['Ожидаем', 'оплату'];
  switch (o.status) {
    case 'new':
      return ['Заказ', 'получен'];
    case 'accepted':
      return ['Заказ', 'принят'];
    case 'cooking':
      return ['Уже', 'готовим'];
    case 'ready':
      return o.type === 'delivery' ? ['Курьер', 'в пути'] : ['Заказ', 'готов'];
    default:
      return ['Приятного', 'аппетита'];
  }
}

function note(o: PublicOrder) {
  if (o.status === 'cancelled') return o.payStatus === 'refunded' ? 'Заказ отменён, деньги вернутся на карту.' : 'Ресторан отменил заказ. Если это ошибка, позвоните нам.';
  if (o.payStatus === 'pending') return 'Заказ уйдёт на кухню сразу после оплаты.';
  if (o.payStatus === 'failed') return 'Оплата не прошла. Попробуйте ещё раз или выберите оплату при получении, позвонив нам.';
  switch (o.status) {
    case 'new':
      return 'Ресторан получил заказ и скоро подтвердит его.';
    case 'accepted':
      return 'Кухня приняла заказ.';
    case 'cooking':
      return 'Повар уже готовит.';
    case 'ready':
      return o.type === 'delivery' ? 'Заказ передан курьеру.' : o.type === 'pickup' ? 'Можно забирать!' : 'Официант уже несёт.';
    default:
      return 'Спасибо, что выбрали нас!';
  }
}

export default function OrderStatus({ id, token }: { id: string; token: string }) {
  const { settings: st } = useSite();
  const [o, setO] = useState<PublicOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [perm, setPerm] = useState<string>('default');
  const [, tick] = useState(0);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (typeof Notification !== 'undefined') setPerm(Notification.permission);
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

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
        const j: PublicOrder = await r.json();
        if (!alive) return;
        const key = j.status + ':' + j.payStatus;
        if (prev.current && prev.current !== key) alertGuest(j);
        prev.current = key;
        setO(j);
        setErr(null);
        if (j.status === 'done' || j.status === 'cancelled') return;
      } catch {
        setErr('Нет связи. Пробуем снова…');
      }
      if (alive) t = setTimeout(load, document.visibilityState === 'visible' ? 5000 : 15000);
    };
    load();
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [id, token]);

  function alertGuest(j: PublicOrder) {
    const [a, b] = headline(j);
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {}
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.frequency.value = 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(g).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification(`${st.name}: ${a} ${b}`, { body: note(j), tag: 'order-' + j.id });
    } catch {}
  }

  if (!o)
    return (
      <section className="masthead g">
        <div className="in">
          <div className="kicker">Заказ</div>
          <h1 style={{ fontSize: 'clamp(56px,9vw,140px)' }}>{err ? 'Не найден' : 'Загружаем…'}</h1>
          {err && (
            <div className="alert err" style={{ marginTop: 20, maxWidth: 640 }}>
              {err}
            </div>
          )}
        </div>
      </section>
    );

  const S = steps(o);
  const idx = S.findIndex((s) => s[0] === o.status);
  const cancelled = o.status === 'cancelled';
  const waitingPay = o.payStatus === 'pending' || o.payStatus === 'failed';
  const [h1a, h1b] = headline(o);
  const left = o.etaAt ? Math.round((new Date(o.etaAt).getTime() - Date.now()) / 60000) : null;
  const showEta = o.etaAt && ['accepted', 'cooking'].includes(o.status);

  return (
    <>
      <section className="masthead g">
        <div className="in">
          <div className="kicker">Заказ № {o.no}</div>
          <h1 style={{ fontSize: 'clamp(56px,9vw,140px)' }}>
            {h1a} <em>{h1b}</em>
          </h1>
        </div>
      </section>
      <div className="g">
        <div className="in" style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 120 }}>
          {showEta && (
            <div className="eta">
              <span className="kicker">{o.type === 'delivery' ? 'Привезём примерно к' : 'Будет готов примерно к'}</span>
              <b className="num">{clock(o.etaAt!)}</b>
              <span className="muted">{left !== null && left > 0 ? `осталось около ${left} мин` : 'совсем скоро'}</span>
            </div>
          )}

          {!waitingPay && (
            <div className="status" aria-label="Статус заказа">
              {S.map((s, i) => (
                <div key={s[0]} className={cancelled ? (i === 0 ? 'x' : '') : i <= idx ? 'on' : ''}>
                  {s[1]}
                </div>
              ))}
            </div>
          )}

          <div className={`alert ${cancelled || o.payStatus === 'failed' ? 'err' : waitingPay ? 'warn' : 'ok'}`} role="status" aria-live="polite">
            {note(o)}
          </div>

          {o.payUrl && waitingPay && (
            <a className="btn" href={o.payUrl} style={{ marginTop: 16, width: '100%' }}>
              Оплатить {fmt(o.total)} сум через {PROVIDER[o.pay]}
            </a>
          )}
          {o.payStatus === 'paid' && <p className="cap" style={{ marginTop: 12 }}>✓ Оплачено онлайн через {PROVIDER[o.pay] || o.pay}</p>}

          {!cancelled && o.status !== 'done' && (o.tgLink || (typeof Notification !== 'undefined' && perm !== 'denied')) && (
            <div className="notify">
              <b>Сообщить, когда будет готово?</b>
              <div className="notify-row">
                {o.tgLink &&
                  (o.tgLinked ? (
                    <span className="chip-ok">✓ Уведомления в Telegram включены</span>
                  ) : (
                    <a className="btn ghost sm" href={o.tgLink} target="_blank" rel="noopener">
                      Уведомления в Telegram
                    </a>
                  ))}
                {typeof Notification !== 'undefined' &&
                  (perm === 'granted' ? (
                    <span className="chip-ok">✓ Звук и уведомление на этом телефоне</span>
                  ) : perm !== 'denied' ? (
                    <button className="btn ghost sm" onClick={() => Notification.requestPermission().then(setPerm)}>
                      Уведомлять на этом телефоне
                    </button>
                  ) : null)}
              </div>
              <span className="cap">Статус на этой странице обновляется сам.</span>
            </div>
          )}

          {st.phone && (
            <p className="muted" style={{ fontSize: 14 }}>
              Вопросы по заказу:{' '}
              <a href={`tel:${st.phone.replace(/[^\d+]/g, '')}`} className="num" style={{ color: 'var(--cream)' }}>
                {st.phone}
              </a>
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
