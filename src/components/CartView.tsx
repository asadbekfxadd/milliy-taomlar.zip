'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSite } from './Providers';
import DishArt from './DishArt';
import { Price } from './Dish';
import { priceCart } from '@/lib/pricing';
import { fmt, normalizePhone } from '@/lib/format';
import { forgetTable, readTable } from './TableEntry';

type Errors = Partial<Record<'name' | 'phone' | 'address' | 'time' | 'zone', string>>;

export default function CartView() {
  const { menu, settings: st, cart, setQty, remove, clear, online } = useSite();
  const router = useRouter();
  const { lines, subtotal } = useMemo(() => priceCart(menu, cart), [menu, cart]);
  const types = [st.pickup && 'pickup', st.delivery && 'delivery'].filter(Boolean) as ('pickup' | 'delivery')[];
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

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('mt-contact') || 'null');
      if (saved) setF((x) => ({ ...x, name: saved.name || '', phone: saved.phone || '', address: saved.address || '' }));
      setLast(JSON.parse(localStorage.getItem('mt-order') || 'null'));
      const t = readTable();
      if (t && t <= (st.tables || 0)) {
        setTable(t);
        setType('hall');
        setPay(st.pay.cash ? 'cash' : 'card');
      }
    } catch {}
  }, []);

  const del = type === 'delivery';
  const hall = type === 'hall' && table !== null;
  const service = hall ? Math.round((subtotal * (st.servicePct || 0)) / 100) : 0;
  const z = st.zones[zone];
  const fee = del && z ? z.fee : 0;
  const short = del && z ? Math.max(0, z.min - subtotal) : 0;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const E: Errors = {};
    if (!hall && f.name.trim().length < 2) E.name = 'Укажите имя';
    if (!hall && !normalizePhone(f.phone)) E.phone = 'Номер в формате +998 90 123 45 67';
    if (del && f.address.trim().length < 5) E.address = 'Укажите улицу и дом';
    if (when === 'time' && !f.time) E.time = 'Выберите время';
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
          when: when === 'time' ? f.time : 'asap',
          pay,
          website: f.website,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.field) setErrors({ [j.field]: j.error });
        setMsg(j.error || 'Не удалось отправить заказ. Попробуйте ещё раз.');
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
      setMsg('Нет связи с сервером. Корзина сохранена, попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="masthead g" style={{ paddingBottom: 10 }}>
        <div className="in">
          <div className="kicker">Заказ</div>
          <h1 style={{ fontSize: 'clamp(64px,11vw,170px)' }}>Корзина</h1>
        </div>
      </section>
      <div className="g">
        <div className="in co">
          <div>
            {lines.length ? (
              lines.map((l) => (
                <div className="ci" key={l.key}>
                  {l.d.photo ? <DishArt art={l.d.art} photo={l.d.photo} className="round" label={l.d.ru} /> : <div className="mono" aria-hidden="true">{l.d.name.charAt(0)}</div>}
                  <h4>{l.d.name}</h4>
                  <div className="mods">
                    {l.d.ru}
                    {l.mods.length ? ' · ' + l.mods.join(', ') : ''}
                  </div>
                  <div className="cap num">{fmt(l.unit)} сум за шт.</div>
                  <div className="rt">
                    <Price v={l.total} className="" />
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div className="stepper">
                        <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Меньше">
                          −
                        </button>
                        <span className="num">{l.qty}</span>
                        <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Больше">
                          +
                        </button>
                      </div>
                      <button className="rm" onClick={() => remove(l.key)}>
                        Убрать
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty" style={{ textAlign: 'left', padding: '30px 0' }}>
                <h3 style={{ fontSize: 40, fontStyle: 'italic', color: 'var(--cream)', marginBottom: 12 }}>Пока пусто</h3>
                Начните с шашлыка из баранины: его жарят на углях прямо перед подачей.
                <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link className="btn" href="/menu">
                    Открыть меню
                  </Link>
                  {last && (
                    <Link className="btn ghost" href={`/order/${last.id}?t=${last.token}`}>
                      Мой заказ № {last.no}
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
                  <span className="lbl">Где вы</span>
                  <div className="segm">
                    <button type="button" className={type === 'hall' ? 'on' : ''} onClick={() => (setType('hall'), setPay(st.pay.cash ? 'cash' : 'card'))}>
                      За столом {table}
                    </button>
                    {types.map((k) => (
                      <button key={k} type="button" className={type === k ? 'on' : ''} onClick={() => setType(k)}>
                        {k === 'pickup' ? 'С собой' : 'Доставка'}
                      </button>
                    ))}
                  </div>
                  {hall && (
                    <span className="cap">
                      Заказ сразу уйдёт на кухню и придёт к вашему столу. Не ваш стол?{' '}
                      <button type="button" className="link" onClick={() => (forgetTable(), setTable(null), setType(types[0] ?? null))}>
                        Сбросить
                      </button>
                    </span>
                  )}
                </div>
              ) : types.length ? (
                <div className="fld full">
                  <span className="lbl">Способ получения</span>
                  <div className="segm">
                    {(
                      [
                        ['pickup', 'Самовывоз'],
                        ['delivery', 'Доставка'],
                      ] as const
                    ).map(([k, l]) => (
                      <button key={k} type="button" className={type === k ? 'on' : ''} disabled={!types.includes(k)} onClick={() => setType(k)}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="alert warn full">Сейчас заказы с собой и доставка выключены. Ждём вас в зале.</div>
              )}

              {del && (
                <>
                  <div className="fld full">
                    <label htmlFor="coZone">Зона доставки</label>
                    <select id="coZone" value={zone} onChange={(e) => setZone(+e.target.value)}>
                      {st.zones.map((zz, i) => (
                        <option key={i} value={i}>
                          {zz.name} · доставка {fmt(zz.fee)} сум · от {fmt(zz.min)} сум
                        </option>
                      ))}
                    </select>
                    <span className="cap">Нет вашего района? Позвоните, и мы скажем, сможем ли привезти.</span>
                  </div>
                  <div className={`fld full ${errors.address ? 'bad' : ''}`}>
                    <label htmlFor="coAddr">Адрес</label>
                    <input id="coAddr" autoComplete="street-address" value={f.address} onChange={set('address')} placeholder="Улица, дом, квартира, ориентир" />
                    {errors.address && <span className="er">{errors.address}</span>}
                  </div>
                </>
              )}
              {!hall && (
              <>
              <div className={`fld ${errors.name ? 'bad' : ''}`}>
                <label htmlFor="coName">Имя</label>
                <input id="coName" autoComplete="name" value={f.name} onChange={set('name')} />
                {errors.name && <span className="er">{errors.name}</span>}
              </div>
              <div className={`fld ${errors.phone ? 'bad' : ''}`}>
                <label htmlFor="coPhone">Телефон</label>
                <input id="coPhone" inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67" value={f.phone} onChange={set('phone')} />
                {errors.phone && <span className="er">{errors.phone}</span>}
              </div>
              <div className="fld">
                <label htmlFor="coWhen">Когда</label>
                <select id="coWhen" value={when} onChange={(e) => setWhen(e.target.value as 'asap' | 'time')}>
                  <option value="asap">Как можно скорее ({st.prepTime})</option>
                  <option value="time">Ко времени</option>
                </select>
              </div>
              <div className={`fld ${errors.time ? 'bad' : ''}`}>
                {when === 'time' && (
                  <>
                    <label htmlFor="coTime">Время</label>
                    <input id="coTime" type="time" value={f.time} onChange={set('time')} />
                    {errors.time && <span className="er">{errors.time}</span>}
                  </>
                )}
              </div>
              </>
              )}
              <div className="fld full">
                <label htmlFor="coNote">Комментарий</label>
                <textarea id="coNote" value={f.note} onChange={set('note')} placeholder="Например: без лука, позвонить за 10 минут" />
              </div>
              {/* honeypot */}
              <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} name="website" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1 }} />

              <div className="fld full">
                <span className="lbl">Оплата</span>
                <div className="pay">
                  {st.pay.cash && (
                    <div className={`opt ${pay === 'cash' ? 'on' : ''}`}>
                      <label>
                        <input type="radio" name="pay" checked={pay === 'cash'} onChange={() => setPay('cash')} />
                        <span>{hall ? 'Наличными официанту' : 'Наличными при получении'}</span>
                      </label>
                    </div>
                  )}
                  {st.pay.card && (
                    <div className={`opt ${pay === 'card' ? 'on' : ''}`}>
                      <label>
                        <input type="radio" name="pay" checked={pay === 'card'} onChange={() => setPay('card')} />
                        <span>{hall ? 'Картой официанту' : 'Картой Uzcard / Humo при получении'}</span>
                      </label>
                    </div>
                  )}
                  {!hall && online.payme && (
                    <div className={`opt ${pay === 'payme' ? 'on' : ''}`}>
                      <label>
                        <input type="radio" name="pay" checked={pay === 'payme'} onChange={() => setPay('payme')} />
                        <span>
                          Онлайн через Payme
                          <br />
                          <span className="cap">Заказ уйдёт на кухню сразу после оплаты</span>
                        </span>
                      </label>
                    </div>
                  )}
                  {!hall && online.click && (
                    <div className={`opt ${pay === 'click' ? 'on' : ''}`}>
                      <label>
                        <input type="radio" name="pay" checked={pay === 'click'} onChange={() => setPay('click')} />
                        <span>
                          Онлайн через Click
                          <br />
                          <span className="cap">Заказ уйдёт на кухню сразу после оплаты</span>
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="sum full">
                <div>
                  <span>Блюда</span>
                  <span className="num">{fmt(subtotal)} сум</span>
                </div>
                {service > 0 && (
                  <div>
                    <span>Обслуживание {st.servicePct}%</span>
                    <span className="num">{fmt(service)} сум</span>
                  </div>
                )}
                {del && (
                  <div>
                    <span>Доставка</span>
                    <span className="num">{fmt(fee)} сум</span>
                  </div>
                )}
                <div className="t">
                  <span>Итого</span>
                  <span className="num">
                    {fmt(subtotal + fee + service)} <small style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--dim)' }}>сум</small>
                  </span>
                </div>
              </div>
              {short > 0 && (
                <div className="alert warn full">
                  Для этой зоны минимальный заказ {fmt(z!.min)} сум. Добавьте блюд ещё на {fmt(short)} сум.
                </div>
              )}
              {msg && (
                <div className="alert err full" role="alert">
                  {msg}
                  {st.phone ? ` Телефон: ${st.phone}` : ''}
                </div>
              )}
              <button className="btn full" disabled={short > 0 || (!types.length && !hall) || busy}>
                {busy ? 'Отправляем…' : pay === 'payme' || pay === 'click' ? `Перейти к оплате · ${fmt(subtotal + fee)} сум` : hall ? `Заказать к столу ${table}` : 'Отправить заказ'}
              </button>
              <p className="cap full" style={{ margin: 0 }}>
                {hall ? 'Оплата — официанту, когда будете готовы. Можно дозаказывать сколько угодно.' : 'Имя, телефон и адрес нужны только для выполнения этого заказа.'}
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
