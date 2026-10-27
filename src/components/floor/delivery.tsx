'use client';
import { useState } from 'react';
import { fmt, prettyPhone } from '@/lib/format';
import { api } from '../panel/kit';
import { useStaff } from './FloorShell';
import { ago, clock, type StaffOrder } from './types';

/* Delivery screens: the dispatcher board (/dispatch) and the courier's phone (/courier). */

export const mapHref = (o: StaffOrder, city: string) => `https://yandex.uz/maps/?text=${encodeURIComponent([city, o.address].filter(Boolean).join(', '))}`;

/** What the courier must collect from the guest. */
export function collectText(o: StaffOrder) {
  if (o.payStatus === 'paid') return { t: 'Оплачено онлайн — денег не брать', cls: 'ok' };
  if (o.pay === 'card') return { t: `Картой при получении: ${fmt(o.total)} сум`, cls: 'warn' };
  return { t: `Взять наличными: ${fmt(o.total)} сум`, cls: 'warn' };
}

const stage = (o: StaffOrder) => (o.pickedAt ? 'road' : o.status === 'ready' ? 'ready' : 'kitchen');
const STAGE_RU = { kitchen: 'на кухне', ready: 'готов — забирайте', road: 'в пути' } as const;

function useDeliveryAct() {
  const { refresh, toast } = useStaff();
  const [busy, setBusy] = useState(false);
  const go = async (o: StaffOrder, body: Record<string, unknown>, ok?: string) => {
    setBusy(true);
    try {
      await api(`/api/staff/delivery/${o.id}`, 'POST', body);
      if (ok) toast(ok);
      await refresh();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  };
  return { busy, go };
}

function Items({ o }: { o: StaffOrder }) {
  const live = o.items.filter((l) => !l.void);
  return (
    <ul className="dl-items">
      {live.map((l, i) => (
        <li key={i}>
          <b className="num">{l.qty}×</b> {l.name}
          {l.mods ? <span className="sx-muted"> · {l.mods}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/* ---------- dispatcher ---------- */

export function Dispatch() {
  const { orders, couriers, settings } = useStaff();
  const { busy, go } = useDeliveryAct();
  const del = orders.filter((o) => o.type === 'delivery' && o.status !== 'cancelled' && !(o.status === 'new' && ['pending', 'failed'].includes(o.payStatus)));
  const cols: [string, string, StaffOrder[]][] = [
    ['new', 'Новые с сайта', del.filter((o) => o.status === 'new')],
    ['kitchen', 'Готовятся', del.filter((o) => ['accepted', 'cooking'].includes(o.status))],
    ['ready', 'Готовы — ждут курьера', del.filter((o) => o.status === 'ready' && !o.pickedAt)],
    ['road', 'В пути', del.filter((o) => o.status === 'ready' && o.pickedAt)],
  ];
  const done = del.filter((o) => o.status === 'done');
  const active = (id: string) => del.filter((o) => o.courierId === id && o.status !== 'done').length;

  return (
    <div className="dl">
      <div className="dl-couriers">
        {couriers.length ? (
          couriers.map((c) => (
            <div key={c.id} className="dl-c">
              <b>{c.name}</b>
              <span>
                {active(c.id) ? `везёт ${active(c.id)}` : 'свободен'} · сегодня {c.n}
              </span>
              <span className="num">наличных: {fmt(c.cash)}</span>
            </div>
          ))
        ) : (
          <div className="dl-c empty">Курьеров нет. Добавьте сотрудника с ролью «Курьер» в «Управление → Сотрудники».</div>
        )}
      </div>
      <div className="dl-board">
        {cols.map(([k, title, list]) => (
          <section key={k} className={`dl-col ${k}`}>
            <h3>
              {title} <span className="num">{list.length}</span>
            </h3>
            {list.map((o) => {
              const pay = collectText(o);
              return (
                <article key={o.id} className="dl-card">
                  <div className="dl-top">
                    <b className="num">№ {o.no}</b>
                    <span className="sx-muted small">
                      {o.zone} · {ago(o.createdAt)}
                      {o.etaAt ? ` · к ${clock(o.etaAt)}` : ''}
                    </span>
                  </div>
                  <div className="dl-addr">{o.address}</div>
                  <div className="small">
                    {o.name} ·{' '}
                    <a className="sx-link" href={`tel:${o.phone}`}>
                      {prettyPhone(o.phone)}
                    </a>
                  </div>
                  {o.when && o.when !== 'asap' && <div className="dl-when">ко времени {o.when}</div>}
                  {o.note && <div className="pos-note">{o.note}</div>}
                  <div className={`dl-pay ${pay.cls}`}>{pay.t}</div>
                  {k === 'new' ? (
                    <div className="sx-muted small">Примите заказ на кассе — после этого назначите курьера.</div>
                  ) : k === 'road' ? (
                    <div className="dl-row">
                      <span>
                        🛵 <b>{o.courier}</b> · {ago(o.pickedAt!)} в пути
                      </span>
                      <button className="sx-btn sm ok" disabled={busy} onClick={() => go(o, { action: 'delivered' }, `№ ${o.no} доставлен`)}>
                        Доставлен
                      </button>
                    </div>
                  ) : (
                    <div className="dl-row">
                      <select className="sx-input sm" value={o.courierId} disabled={busy} onChange={(e) => go(o, { action: 'assign', courier: e.target.value }, e.target.value ? 'Курьер назначен' : 'Курьер снят')} aria-label={`Курьер для № ${o.no}`}>
                        <option value="">— курьер —</option>
                        {couriers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {active(c.id) ? ` (везёт ${active(c.id)})` : ''}
                          </option>
                        ))}
                      </select>
                      {k === 'ready' && o.courierId && (
                        <button className="sx-btn sm primary" disabled={busy} onClick={() => go(o, { action: 'pickup' }, `${o.courier} забрал № ${o.no}`)}>
                          Забрал
                        </button>
                      )}
                    </div>
                  )}
                  <details>
                    <summary className="sx-muted small">
                      {o.items.filter((l) => !l.void).length} поз. · {fmt(o.total)} сум
                    </summary>
                    <Items o={o} />
                  </details>
                </article>
              );
            })}
            {!list.length && <div className="dl-empty">—</div>}
          </section>
        ))}
      </div>
      {done.length > 0 && (
        <div className="dl-done">
          <b>Только что доставлены:</b>{' '}
          {done.map((o) => (
            <span key={o.id}>
              № {o.no} · {o.courier || '—'}
            </span>
          ))}
        </div>
      )}
      <p className="sx-muted small">
        Карта адресов:{' '}
        <a className="sx-link" href={`https://yandex.uz/maps/?text=${encodeURIComponent(settings.city || '')}`} target="_blank" rel="noopener">
          открыть Яндекс Карты
        </a>
      </p>
    </div>
  );
}

/* ---------- courier ---------- */

export function Courier() {
  const { me, orders, couriers, settings } = useStaff();
  const { busy, go } = useDeliveryAct();
  const [tab, setTab] = useState<'mine' | 'free'>('mine');
  const live = orders.filter((o) => o.type === 'delivery' && !['done', 'cancelled', 'new'].includes(o.status));
  const mine = live.filter((o) => o.courierId === me.id);
  const free = live.filter((o) => !o.courierId);
  const day = couriers.find((c) => c.id === me.id);
  const list = tab === 'mine' ? mine : free;

  return (
    <div className="cr">
      <div className="cr-day">
        <span>
          Сегодня доставлено: <b className="num">{day?.n ?? 0}</b>
        </span>
        <span>
          Наличных на руках: <b className="num">{fmt(day?.cash ?? 0)}</b>
        </span>
      </div>
      <div className="seg cr-tabs">
        <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>
          Мои · {mine.length}
        </button>
        <button className={tab === 'free' ? 'on' : ''} onClick={() => setTab('free')}>
          Свободные · {free.length}
        </button>
      </div>
      {list.map((o) => {
        const s = stage(o);
        const pay = collectText(o);
        return (
          <article key={o.id} className={`cr-card ${s}`}>
            <div className="dl-top">
              <b className="num">№ {o.no}</b>
              <span className={`chip ${s === 'ready' ? 'ok' : s === 'road' ? 'warn' : ''}`}>{STAGE_RU[s]}</span>
            </div>
            <a className="cr-addr" href={mapHref(o, settings.city)} target="_blank" rel="noopener">
              {o.address}
              <small>{o.zone} · открыть на карте</small>
            </a>
            {o.when && o.when !== 'asap' && <div className="dl-when">ко времени {o.when}</div>}
            {o.note && <div className="pos-note">{o.note}</div>}
            <div className={`dl-pay ${pay.cls}`}>{pay.t}</div>
            <Items o={o} />
            {tab === 'free' ? (
              <button className="sx-btn primary wide" disabled={busy} onClick={() => go(o, { action: 'take' }, `№ ${o.no} — ваш`).then(() => setTab('mine'))}>
                Взять заказ
              </button>
            ) : (
              <div className="cr-act">
                <a className="sx-btn" href={`tel:${o.phone}`}>
                  Позвонить {o.name}
                </a>
                {s === 'road' ? (
                  <button className="sx-btn ok grow" disabled={busy} onClick={() => go(o, { action: 'delivered' }, 'Доставлено. Спасибо!')}>
                    Доставил
                  </button>
                ) : (
                  <button className="sx-btn primary grow" disabled={busy || s !== 'ready'} onClick={() => go(o, { action: 'pickup' }, 'В пути')}>
                    {s === 'ready' ? 'Забрал' : 'Ждём кухню'}
                  </button>
                )}
                {s !== 'road' && (
                  <button className="sx-link" disabled={busy} onClick={() => go(o, { action: 'release' }, 'Заказ вернули в свободные')}>
                    отказаться
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
      {!list.length && <div className="pos-empty">{tab === 'mine' ? 'У вас нет заказов. Загляните в «Свободные».' : 'Свободных доставок нет.'}</div>}
    </div>
  );
}
