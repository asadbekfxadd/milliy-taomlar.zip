'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PublicOrder } from '@/lib/types';
import { fmt } from '@/lib/format';
import { useSite } from './Providers';
import type { Key, T } from '@/lib/i18n';

const clock = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
const PROVIDER: Record<string, string> = { payme: 'Payme', click: 'Click' };

function steps(o: PublicOrder, t: T) {
  return [
    ['new', t('ord.s.new')],
    ['accepted', t('ord.s.accepted')],
    ['cooking', t('ord.s.cooking')],
    ['ready', o.type === 'delivery' ? t('ord.s.readyDel') : o.type === 'pickup' ? t('ord.s.readyPick') : t('ord.s.readyHall')],
    ['done', o.type === 'delivery' ? t('ord.s.doneDel') : t('ord.s.done')],
  ] as const;
}

function headline(o: PublicOrder, t: T): [string, string] {
  const k: Key =
    o.status === 'cancelled'
      ? 'ord.h.cancel'
      : o.payStatus === 'pending' || o.payStatus === 'failed'
        ? 'ord.h.pay'
        : o.status === 'new'
          ? 'ord.h.new'
          : o.status === 'accepted'
            ? 'ord.h.accepted'
            : o.status === 'cooking'
              ? 'ord.h.cooking'
              : o.status === 'ready'
                ? o.type === 'delivery'
                  ? 'ord.h.courier'
                  : 'ord.h.ready'
                : 'ord.h.done';
  const [a, b] = t(k).split('|');
  return [a, b ?? ''];
}

function note(o: PublicOrder, t: T) {
  if (o.status === 'cancelled') return o.payStatus === 'refunded' ? t('ord.n.refunded') : t('ord.n.cancelled');
  if (o.payStatus === 'pending') return t('ord.n.pending');
  if (o.payStatus === 'failed') return t('ord.n.failed');
  switch (o.status) {
    case 'new':
      return t('ord.n.new');
    case 'accepted':
      return t('ord.n.accepted');
    case 'cooking':
      return t('ord.n.cooking');
    case 'ready':
      return o.type === 'delivery' ? t('ord.n.readyDel') : o.type === 'pickup' ? t('ord.n.readyPick') : t('ord.n.readyHall');
    default:
      return t('ord.n.done');
  }
}

export default function OrderStatus({ id, token }: { id: string; token: string }) {
  const { settings: st, t, lang } = useSite();
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
    let tm: ReturnType<typeof setTimeout>;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/orders/${id}?t=${encodeURIComponent(token)}`, { cache: 'no-store' });
        if (r.status === 404) {
          setErr(t('ord.notFoundText'));
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
        setErr(t('ord.offline'));
      }
      if (alive) tm = setTimeout(load, document.visibilityState === 'visible' ? 5000 : 15000);
    };
    load();
    return () => {
      alive = false;
      clearTimeout(tm);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  function alertGuest(j: PublicOrder) {
    const [a, b] = headline(j, t);
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
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') new Notification(`${st.name}: ${a} ${b}`, { body: note(j, t), tag: 'order-' + j.id });
    } catch {}
  }

  if (!o)
    return (
      <section className="masthead g">
        <div className="in">
          <div className="kicker">{t('cart.kicker')}</div>
          <h1 style={{ fontSize: 'clamp(56px,9vw,140px)' }}>{err ? t('ord.notFound') : t('ord.loading')}</h1>
          {err && (
            <div className="alert err" style={{ marginTop: 20, maxWidth: 640 }}>
              {err}
            </div>
          )}
        </div>
      </section>
    );

  const S = steps(o, t);
  const idx = S.findIndex((s) => s[0] === o.status);
  const cancelled = o.status === 'cancelled';
  const waitingPay = o.payStatus === 'pending' || o.payStatus === 'failed';
  const [h1a, h1b] = headline(o, t);
  const left = o.etaAt ? Math.round((new Date(o.etaAt).getTime() - Date.now()) / 60000) : null;
  const showEta = o.etaAt && ['accepted', 'cooking'].includes(o.status);

  return (
    <>
      <section className="masthead g">
        <div className="in">
          <div className="kicker">{t('ord.kicker', { n: o.no })}</div>
          <h1 style={{ fontSize: 'clamp(56px,9vw,140px)' }}>
            {h1a} <em>{h1b}</em>
          </h1>
        </div>
      </section>
      <div className="g">
        <div className="in" style={{ maxWidth: 860, margin: '0 auto', paddingBottom: 120 }}>
          {showEta && (
            <div className="eta">
              <span className="kicker">{o.type === 'delivery' ? t('ord.etaDel') : t('ord.eta')}</span>
              <b className="num">{clock(o.etaAt!)}</b>
              <span className="muted">{left !== null && left > 0 ? t('ord.left', { m: left }) : t('ord.soon')}</span>
            </div>
          )}

          {!waitingPay && (
            <div className="status" aria-label={t('ord.statusAria')}>
              {S.map((s, i) => (
                <div key={s[0]} className={cancelled ? (i === 0 ? 'x' : '') : i <= idx ? 'on' : ''}>
                  {s[1]}
                </div>
              ))}
            </div>
          )}

          <div className={`alert ${cancelled || o.payStatus === 'failed' ? 'err' : waitingPay ? 'warn' : 'ok'}`} role="status" aria-live="polite">
            {note(o, t)}
          </div>

          {o.payUrl && waitingPay && (
            <a className="btn" href={o.payUrl} style={{ marginTop: 16, width: '100%' }}>
              {t('ord.payBtn', { s: fmt(o.total), p: PROVIDER[o.pay] })}
            </a>
          )}
          {o.payStatus === 'paid' && <p className="cap" style={{ marginTop: 12 }}>{t('ord.paid', { p: PROVIDER[o.pay] || o.pay })}</p>}

          {!cancelled && o.status !== 'done' && (o.tgLink || (typeof Notification !== 'undefined' && perm !== 'denied')) && (
            <div className="notify">
              <b>{t('ord.notifyQ')}</b>
              <div className="notify-row">
                {o.tgLink &&
                  (o.tgLinked ? (
                    <span className="chip-ok">{t('ord.tgOn')}</span>
                  ) : (
                    <a className="btn ghost sm" href={o.tgLink} target="_blank" rel="noopener">
                      {t('ord.tg')}
                    </a>
                  ))}
                {typeof Notification !== 'undefined' &&
                  (perm === 'granted' ? (
                    <span className="chip-ok">{t('ord.pushOn')}</span>
                  ) : perm !== 'denied' ? (
                    <button className="btn ghost sm" onClick={() => Notification.requestPermission().then(setPerm)}>
                      {t('ord.push')}
                    </button>
                  ) : null)}
              </div>
              <span className="cap">{t('ord.auto')}</span>
            </div>
          )}

          {st.phone && (
            <p className="muted" style={{ fontSize: 14 }}>
              {t('ord.q')}{' '}
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
                <span className="num">
                  {fmt(i.sum)} {t('sum')}
                </span>
              </div>
            ))}
            {o.fee > 0 && (
              <div>
                <span>{t('ord.fee')}</span>
                <span className="num">
                  {fmt(o.fee)} {t('sum')}
                </span>
              </div>
            )}
            {(o.discount ?? 0) > 0 && (
              <div>
                <span>
                  {t('ord.discount')} {o.promo}
                </span>
                <span className="num">
                  −{fmt(o.discount!)} {t('sum')}
                </span>
              </div>
            )}
            {(o.deals || []).map((d) => (
              <div key={d.id}>
                <span>{d.name}</span>
                <span className="num">
                  −{fmt(d.amount)} {t('sum')}
                </span>
              </div>
            ))}
            {(o.pointsUsed ?? 0) > 0 && (
              <div>
                <span>{lang === 'uz' ? 'Ballar bilan' : 'Баллами'}</span>
                <span className="num">
                  −{fmt(o.pointsUsed!)} {t('sum')}
                </span>
              </div>
            )}
            {(o.pointsEarned ?? 0) > 0 && (
              <div>
                <span>{lang === 'uz' ? 'Hisobingizga tushdi' : 'Начислено баллов'}</span>
                <span className="num">+{fmt(o.pointsEarned!)}</span>
              </div>
            )}
            <div className="t">
              <span>{t('ord.total')}</span>
              <span className="num">{fmt(o.total)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn" href="/menu">
              {t('ord.again')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
