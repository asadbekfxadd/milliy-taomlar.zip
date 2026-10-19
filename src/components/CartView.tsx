'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useClosed, useSite } from './Providers';
import DishArt from './DishArt';
import { Price } from './Dish';
import { priceCart, promoDiscount } from '@/lib/pricing';
import { fmt, normalizePhone } from '@/lib/format';
import { extraLabel, prepRange, sizeLabel, zoneName, type Key } from '@/lib/i18n';
import { forgetTable, readTable } from './TableEntry';

type Errors = Partial<Record<'name' | 'phone' | 'address' | 'time' | 'zone', string>>;
type Promo = { code: string; pct: number; fixed: number; min: number };

export default function CartView() {
  const { menu, settings: st, cart, setQty, remove, clear, online, t, lang } = useSite();
  const router = useRouter();
  const closed = useClosed();
  const { lines, subtotal } = useMemo(() => priceCart(menu, cart), [menu, cart]);
  const types = [st.delivery && 'delivery', st.pickup && 'pickup'].filter(Boolean) as ('pickup' | 'delivery')[];
  const [type, setType] = useState<'pickup' | 'delivery' | 'hall' | null>(types[0] ?? null);
  const [table, setTable] = useState<number | null>(null);
  const [zone, setZone] = useState(0);
  const [f, setF] = useState({ name: '', phone: '', address: '', note: '', time: '', website: '' });
  const [when, setWhen] = useState<'asap' | 'time'>('asap');
  const [pay, setPay] = useState<'cash' | 'card' | 'payme' | 'click'>(online.payme ? 'payme' : online.click ? 'click' : st.pay.cash ? 'cash' : 'card');
  const [errors, setErrors] = useState<Errors>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ id: string; token: string; no: number } | null>(null);
  const [code, setCode] = useState('');
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoMsg, setPromoMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mt-contact') || 'null');
      if (saved) setF((x) => ({ ...x, name: saved.name || '', phone: saved.phone || '', address: saved.address || '' }));
      setLast(JSON.parse(localStorage.getItem('mt-order') || 'null'));
      const m = localStorage.getItem('mt-mode');
      if ((m === 'pickup' || m === 'delivery') && types.includes(m)) setType(m);
      const tb = readTable();
      if (tb && tb <= (st.tables || 0)) {
        setTable(tb);
        setType('hall');
        setPay(st.pay.cash ? 'cash' : 'card');
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const del = type === 'delivery';
  const hall = type === 'hall' && table !== null;
  const service = hall ? Math.round((subtotal * (st.servicePct || 0)) / 100) : 0;
  const z = st.zones[zone];
  const fee = del && z ? z.fee : 0;
  const discount = hall ? 0 : promoDiscount(promo, subtotal);
  const total = subtotal + fee + service - discount;
  const short = del && z ? Math.max(0, z.min - subtotal) : 0;
  const blocked = !hall && Boolean(closed);
  const gone = lines.filter((l) => !l.d.available);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function applyPromo() {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setPromoMsg(null);
    try {
      const r = await fetch(`/api/promo?code=${encodeURIComponent(c)}`, { cache: 'no-store' });
      if (!r.ok) {
        setPromo(null);
        setPromoMsg(t('promo.bad'));
        return;
      }
      const p: Promo = await r.json();
      setPromo(p);
      if (subtotal < p.min) setPromoMsg(t('promo.min', { m: fmt(p.min) }));
    } catch {
      setPromoMsg(t('cart.noNet'));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const E: Errors = {};
    if (!hall && f.name.trim().length < 2) E.name = t('err.name');
    if (!hall && !normalizePhone(f.phone)) E.phone = t('err.phone');
    if (del && f.address.trim().length < 5) E.address = t('err.address');
    if (!hall && when === 'time' && !f.time) E.time = t('err.time');
    setErrors(E);
    setMsg(null);
    if (Object.keys(E).length) {
      setTimeout(() => document.querySelector<HTMLInputElement>('.fld.bad input')?.focus(), 0);
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(({ id, si, ex, qty }) => ({ id, si, ex, qty })),
          type,
          table: hall ? table : undefined,
          zone: del ? zone : undefined,
          address: del ? f.address : '',
          name: f.name,
          phone: f.phone,
          note: f.note,
          when: !hall && when === 'time' ? f.time : 'asap',
          pay,
          promo: !hall && promo ? promo.code : '',
          lang,
          website: f.website,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.field) setErrors({ [j.field]: j.error });
        setMsg(j.error || t('cart.fail'));
        return;
      }
      try {
        localStorage.setItem('mt-order', JSON.stringify(j));
        if (!hall) localStorage.setItem('mt-contact', JSON.stringify({ name: f.name, phone: f.phone, address: f.address }));
      } catch {}
      clear();
      if (j.payUrl) {
        window.location.href = j.payUrl;
        return;
      }
      router.push(`/order/${j.id}?t=${j.token}`);
    } catch {
      setMsg(t('cart.noNet'));
    } finally {
      setBusy(false);
    }
  }

  const payOpt = (k: 'cash' | 'card' | 'payme' | 'click', label: string, note?: string) => (
    <div className={`opt ${pay === k ? 'on' : ''}`} key={k}>
      <label>
        <input type="radio" name="pay" checked={pay === k} onChange={() => setPay(k)} />
        <span>
          {label}
          {note && (
            <>
              <br />
              <span className="cap">{note}</span>
            </>
          )}
        </span>
      </label>
    </div>
  );

  return (
    <>
      <section className="masthead g" style={{ paddingBottom: 10 }}>
        <div className="in">
          <div className="kicker">{t('cart.kicker')}</div>
          <h1 style={{ fontSize: 'clamp(64px,11vw,170px)' }}>{t('cart.h')}</h1>
        </div>
      </section>
      <div className="g">
        <div className="in co">
          <div>
            {lines.length ? (
              lines.map((l) => (
                <div className="ci" key={l.key}>
                  <DishArt art={l.d.art} photo={l.d.photo} className="round" label={l.d.name} sizes="96px" />
                  <h4>
                    {lang === 'ru' ? l.d.ru || l.d.name : l.d.name}
                    {!l.d.available && <span className="soldout"> · {t('dish.soldout')}</span>}
                  </h4>
                  <div className="mods">
                    {[l.d.sizes.length > 1 ? sizeLabel(l.d.sizes[l.si] ?? l.d.sizes[0], lang) : '', ...l.ex.map((i) => (l.d.extras[i] ? extraLabel(l.d.extras[i], lang) : ''))]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  <div className="cap num">{t('cart.each', { s: fmt(l.unit) })}</div>
                  <div className="rt">
                    <Price v={l.total} />
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div className="stepper">
                        <button onClick={() => setQty(l.key, l.qty - 1)} aria-label={t('dish.less')}>
                          −
                        </button>
                        <span className="num">{l.qty}</span>
                        <button onClick={() => setQty(l.key, l.qty + 1)} aria-label={t('dish.moreQty')}>
                          +
                        </button>
                      </div>
                      <button className="rm" onClick={() => remove(l.key)}>
                        {t('cart.remove')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty" style={{ textAlign: 'left', padding: '30px 0' }}>
                <h2 style={{ fontSize: 40, fontStyle: 'italic', color: 'var(--cream)', marginBottom: 12 }}>{t('cart.empty')}</h2>
                {t('cart.emptyText')}
                <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link className="btn" href="/menu">
                    {t('cart.open')}
                  </Link>
                  {last && (
                    <Link className="btn ghost" href={`/order/${last.id}?t=${last.token}`}>
                      {t('cart.myOrder', { n: last.no })}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {lines.length > 0 && (
            <form className="form" onSubmit={submit} noValidate>
              {table !== null ? (
                <div className="fld full">
                  <span className="lbl">{t('cart.where')}</span>
                  <div className="segm">
                    <button type="button" className={type === 'hall' ? 'on' : ''} onClick={() => (setType('hall'), setPay(st.pay.cash ? 'cash' : 'card'))}>
                      {t('cart.atTable', { n: table })}
                    </button>
                    {types.map((k) => (
                      <button key={k} type="button" className={type === k ? 'on' : ''} onClick={() => setType(k)}>
                        {k === 'pickup' ? t('cart.takeaway') : t('cart.delivery')}
                      </button>
                    ))}
                  </div>
                  {hall && (
                    <span className="cap">
                      {t('cart.hallNote')}{' '}
                      <button type="button" className="link" onClick={() => (forgetTable(), setTable(null), setType(types[0] ?? null))}>
                        {t('cart.reset')}
                      </button>
                    </span>
                  )}
                </div>
              ) : types.length ? (
                <div className="fld full">
                  <span className="lbl">{t('cart.how')}</span>
                  <div className="segm">
                    {(['pickup', 'delivery'] as const).map((k) => (
                      <button key={k} type="button" className={type === k ? 'on' : ''} disabled={!types.includes(k)} onClick={() => setType(k)}>
                        {k === 'pickup' ? t('cart.pickup') : t('cart.delivery')}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="alert warn full">{t('cart.off')}</div>
              )}

              {del && (
                <>
                  <div className="fld full">
                    <label htmlFor="coZone">{t('cart.zone')}</label>
                    <select id="coZone" value={zone} onChange={(e) => setZone(+e.target.value)}>
                      {st.zones.map((zz, i) => (
                        <option key={i} value={i}>
                          {t('cart.zoneOpt', { z: zoneName(zz, lang), f: fmt(zz.fee), m: fmt(zz.min) })}
                        </option>
                      ))}
                    </select>
                    <span className="cap">{t('cart.zoneHelp')}</span>
                  </div>
                  <div className={`fld full ${errors.address ? 'bad' : ''}`}>
                    <label htmlFor="coAddr">{t('cart.address')}</label>
                    <input id="coAddr" autoComplete="street-address" value={f.address} onChange={set('address')} placeholder={t('cart.addressPh')} />
                    {errors.address && <span className="er">{errors.address}</span>}
                  </div>
                </>
              )}
              {!hall && (
                <>
                  <div className={`fld ${errors.name ? 'bad' : ''}`}>
                    <label htmlFor="coName">{t('cart.name')}</label>
                    <input id="coName" autoComplete="name" value={f.name} onChange={set('name')} />
                    {errors.name && <span className="er">{errors.name}</span>}
                  </div>
                  <div className={`fld ${errors.phone ? 'bad' : ''}`}>
                    <label htmlFor="coPhone">{t('cart.phone')}</label>
                    <input id="coPhone" inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67" value={f.phone} onChange={set('phone')} />
                    {errors.phone && <span className="er">{errors.phone}</span>}
                  </div>
                  <div className="fld">
                    <label htmlFor="coWhen">{t('cart.when')}</label>
                    <select id="coWhen" value={when} onChange={(e) => setWhen(e.target.value as 'asap' | 'time')}>
                      <option value="asap">{t('cart.asap', { t: prepRange(st) + (lang === 'uz' ? ' daq.' : ' мин') })}</option>
                      <option value="time">{t('cart.atTime')}</option>
                    </select>
                  </div>
                  <div className={`fld ${errors.time ? 'bad' : ''}`}>
                    {when === 'time' && (
                      <>
                        <label htmlFor="coTime">{t('cart.time')}</label>
                        <input id="coTime" type="time" value={f.time} onChange={set('time')} />
                        {errors.time && <span className="er">{errors.time}</span>}
                      </>
                    )}
                  </div>
                </>
              )}
              <div className="fld full">
                <label htmlFor="coNote">{t('cart.note')}</label>
                <textarea id="coNote" value={f.note} onChange={set('note')} placeholder={t('cart.notePh')} />
              </div>
              {/* honeypot */}
              <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} name="website" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} />

              <div className="fld full">
                <span className="lbl">{t('cart.pay')}</span>
                <div className="pay">
                  {st.pay.cash && payOpt('cash', hall ? t('cart.cashHall') : t('cart.cash'))}
                  {st.pay.card && payOpt('card', hall ? t('cart.cardHall') : t('cart.card'))}
                  {!hall && online.payme && payOpt('payme', t('cart.payme'), t('cart.onlineNote'))}
                  {!hall && online.click && payOpt('click', t('cart.click'), t('cart.onlineNote'))}
                </div>
              </div>

              {!hall && (
                <div className="fld full promo">
                  <label htmlFor="coPromo">{t('promo.label')}</label>
                  {promo ? (
                    <div className="promo-on">
                      <span>
                        {discount > 0 ? t('promo.ok', { c: promo.code, d: fmt(discount) }) : t('promo.min', { m: fmt(promo.min) })}
                      </span>
                      <button type="button" className="link" onClick={() => (setPromo(null), setCode(''), setPromoMsg(null))}>
                        {t('promo.remove')}
                      </button>
                    </div>
                  ) : (
                    <div className="promo-row">
                      <input
                        id="coPromo"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), applyPromo())}
                        placeholder={t('promo.ph')}
                        autoCapitalize="characters"
                        maxLength={24}
                      />
                      <button type="button" className="btn ghost sm" onClick={applyPromo} disabled={!code.trim()}>
                        {t('promo.apply')}
                      </button>
                    </div>
                  )}
                  {promoMsg && !promo && <span className="er">{promoMsg}</span>}
                </div>
              )}

              <div className="sum full">
                <div>
                  <span>{t('cart.dishes')}</span>
                  <span className="num">
                    {fmt(subtotal)} {t('sum')}
                  </span>
                </div>
                {service > 0 && (
                  <div>
                    <span>{t('cart.service', { p: st.servicePct })}</span>
                    <span className="num">
                      {fmt(service)} {t('sum')}
                    </span>
                  </div>
                )}
                {del && (
                  <div>
                    <span>{t('cart.fee')}</span>
                    <span className="num">
                      {fmt(fee)} {t('sum')}
                    </span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="disc">
                    <span>{t('cart.discount', { c: promo!.code })}</span>
                    <span className="num">
                      −{fmt(discount)} {t('sum')}
                    </span>
                  </div>
                )}
                <div className="t">
                  <span>{t('cart.total')}</span>
                  <span className="num">
                    {fmt(total)} <small style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)' }}>{t('sum')}</small>
                  </span>
                </div>
              </div>
              {blocked && (
                <div className="alert warn full" role="status">
                  <b>{closed!.title}.</b> {closed!.when}. {t('hours.cartNote')}
                </div>
              )}
              {gone.length > 0 && (
                <div className="alert err full" role="alert">
                  {gone.map((l) => l.d.name).join(', ')} — {t('dish.soldout').toLowerCase()}. {t('cart.removeGone')}
                </div>
              )}
              {short > 0 && <div className="alert warn full">{t('cart.short', { m: fmt(z!.min), s: fmt(short) })}</div>}
              {msg && (
                <div className="alert err full" role="alert">
                  {msg}
                  {st.phone ? t('cart.phoneTail', { p: st.phone }) : ''}
                </div>
              )}
              <button className="btn full" disabled={short > 0 || (!types.length && !hall) || busy || blocked || gone.length > 0}>
                {busy
                  ? t('cart.sending')
                  : pay === 'payme' || pay === 'click'
                    ? t('cart.toPay', { s: fmt(total) })
                    : hall
                      ? t('cart.toTable', { n: table! })
                      : t('cart.send')}
              </button>
              <p className="cap full" style={{ margin: 0 }}>
                {t((hall ? 'cart.hallFoot' : 'cart.foot') as Key)}
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
