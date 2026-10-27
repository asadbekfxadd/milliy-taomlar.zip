'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DishArt from '../DishArt';
import type { Dish } from '@/lib/types';
import { basePrice, unitPrice } from '@/lib/pricing';
import { fmt } from '@/lib/format';
import { can } from '@/lib/rbac';
import { useStaff, type Booking } from './FloorShell';
import { api } from '../panel/kit';
import { PAY_RU, STATION_RU, type StaffOrder } from './types';

/* Pieces of a check shared by the cash desk and the waiter's phone. */

const KS_RU: Record<string, string> = { queued: 'ждёт кухню', cooking: 'готовится', ready: 'готово' };

export function StatusChip({ o }: { o: StaffOrder }) {
  const map: Record<string, [string, string]> = {
    new: ['новый', 'bad'],
    accepted: ['принят', 'warn'],
    cooking: ['готовится', 'warn'],
    ready: ['готово', 'ok'],
    done: ['закрыт', ''],
    cancelled: ['отменён', ''],
  };
  const [t, c] = map[o.status] || [o.status, ''];
  return <span className={`chip ${c}`}>{t}</span>;
}

export function PayBadge({ o }: { o: StaffOrder }) {
  if (o.payStatus === 'paid') return <span className="chip ok">оплачено {PAY_RU[o.paidWith] || ''}</span>;
  if (o.payStatus === 'pending') return <span className="chip warn">ждём оплату {o.pay === 'payme' ? 'Payme' : 'Click'}</span>;
  if (o.payStatus === 'failed') return <span className="chip bad">оплата не прошла</span>;
  if (o.payStatus === 'refunded') return <span className="chip">возврат</span>;
  return <span className="chip">не оплачен{o.source === 'site' ? ` · ${o.pay === 'card' ? 'карта' : 'наличные'}` : ''}</span>;
}

const COURSE_RU: Record<number, string> = { 1: 'Сразу', 2: 'Горячее', 3: 'Десерт' };

export function Lines({
  o,
  busy,
  onQty,
  onVoid,
  onCourse,
}: {
  o: StaffOrder;
  busy: boolean;
  onQty: (i: number, q: number) => void;
  onVoid: (i: number) => void;
  onCourse?: (i: number, c: 1 | 2 | 3) => void;
}) {
  if (!o.items.length) return <div className="pos-empty small">Чек пустой. Добавьте блюда из меню ниже.</div>;
  return (
    <div className="pos-lines">
      {o.items.map((l, i) => (
        <div key={i} className={`pos-line ${l.sent ? 'sent' : ''} ${l.void ? 'void' : ''} ${l.hold ? 'held' : ''}`}>
          <div>
            <b>{l.name}</b>
            {l.mods && <span className="sx-muted"> · {l.mods}</span>}
            {l.note && <div className="pos-note">{l.note}</div>}
            {l.hold && !l.sent && !l.void && (
              <div className="pos-hold">
                ждёт подачи · {COURSE_RU[l.course || 2]}
                {onCourse && (
                  <button className="sx-link" onClick={() => onCourse(i, 1)} disabled={busy}>
                    подать сразу
                  </button>
                )}
              </div>
            )}
            {!l.sent && !l.void && !l.hold && l.course && l.course > 1 && <div className="pos-hold go">подача: {COURSE_RU[l.course]}</div>}
            <div className="sx-muted small">
              {l.void ? `отменено: ${l.void.reason} · ${l.void.by}` : `${STATION_RU[l.station || 'kitchen']} · ${fmt(l.unit)}`}
              {l.sent && !l.void && !['done', 'cancelled'].includes(o.status) && (
                <>
                  {' · '}
                  <button className="sx-link danger" onClick={() => onVoid(i)} disabled={busy}>
                    отменить
                  </button>
                </>
              )}
            </div>
          </div>
          {l.void ? (
            <span className="ks">{l.qty} × отмена</span>
          ) : l.sent ? (
            <span className={`ks ${l.ks || ''}`}>
              {l.qty} × {KS_RU[l.ks || 'queued']}
            </span>
          ) : (
            <div className="sx-step">
              <button onClick={() => onQty(i, l.qty - 1)} aria-label={`Убрать одну: ${l.name}`} disabled={busy}>
                −
              </button>
              <span className="num">{l.qty}</span>
              <button onClick={() => onQty(i, l.qty + 1)} aria-label={`Добавить ещё: ${l.name}`} disabled={busy}>
                +
              </button>
            </div>
          )}
          <b className="num right">{l.void ? '—' : fmt(l.unit * l.qty)}</b>
        </div>
      ))}
    </div>
  );
}

export function Totals({ o }: { o: StaffOrder }) {
  const { settings } = useStaff();
  return (
    <div className="pos-total">
      <div>
        <span>Блюда</span>
        <span className="num">{fmt(o.subtotal)}</span>
      </div>
      {o.service > 0 && (
        <div>
          <span>Обслуживание {settings.servicePct}%</span>
          <span className="num">{fmt(o.service)}</span>
        </div>
      )}
      {o.fee > 0 && (
        <div>
          <span>Доставка</span>
          <span className="num">{fmt(o.fee)}</span>
        </div>
      )}
      {(o.discount ?? 0) > 0 && (
        <div>
          <span>Скидка {o.promo}</span>
          <span className="num">−{fmt(o.discount!)}</span>
        </div>
      )}
      <div className="big">
        <span>Итого</span>
        <span className="num">{fmt(o.total)} сум</span>
      </div>
    </div>
  );
}

type AddItem = { id: string; si: number; ex: number[]; qty: number; note?: string; course?: 1 | 2 | 3 };

/** Buttons that send the held courses ("hot", "dessert") to the kitchen when the table is ready for them. */
export function FireButtons({ o, busy, run }: { o: StaffOrder; busy: boolean; run: (b: Record<string, unknown>, ok?: string) => Promise<unknown> }) {
  const held = (c: number) => o.items.filter((l) => l.hold && !l.sent && !l.void && l.course === c).reduce((a, l) => a + l.qty, 0);
  return (
    <>
      {[2, 3].map((c) =>
        held(c) ? (
          <button key={c} className="sx-btn fire" disabled={busy} onClick={() => run({ action: 'fire', course: c }, `${COURSE_RU[c]}: ушло на кухню`)}>
            Подать {COURSE_RU[c].toLowerCase()} · {held(c)}
          </button>
        ) : null,
      )}
    </>
  );
}

/** The whole menu as photo tiles, grouped by category, for tapping fast.
    Taps are collected for a moment and sent as one request, so quick taps never get lost or block each other.
    The badge on a tile = how many of that dish are already on the check (plus taps on their way). */
export function MenuPicker({ o, onAdd }: { o: StaffOrder; onAdd: (items: AddItem[]) => Promise<unknown> }) {
  const { menu } = useStaff();
  const [qs, setQs] = useState('');
  const [cat, setCat] = useState<string | undefined>(menu.cats[0]?.id);
  const [pick, setPick] = useState<Dish | null>(null);
  const [pending, setPending] = useState<Record<string, number>>({});
  const [course, setCourse] = useState<1 | 2 | 3>(1);
  const queue = useRef<AddItem[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const sending = useRef(false);
  const box = useRef<HTMLDivElement>(null);

  const flush = useCallback(async () => {
    if (sending.current || !queue.current.length) return;
    sending.current = true;
    const batch = queue.current;
    queue.current = [];
    // merge same dish + options into one line
    const merged: AddItem[] = [];
    for (const it of batch) {
      const same = merged.find((m) => m.id === it.id && m.si === it.si && m.ex.join() === it.ex.join() && (m.note || '') === (it.note || '') && (m.course || 1) === (it.course || 1));
      if (same) same.qty += it.qty;
      else merged.push({ ...it });
    }
    await onAdd(merged);
    setPending((p) => {
      const n = { ...p };
      batch.forEach((it) => (n[it.id] = Math.max(0, (n[it.id] || 0) - it.qty)));
      return n;
    });
    sending.current = false;
    if (queue.current.length) flush();
  }, [onAdd]);

  const tap = useCallback(
    (raw: AddItem) => {
      const it = course > 1 ? { ...raw, course } : raw;
      queue.current.push(it);
      setPending((p) => ({ ...p, [it.id]: (p[it.id] || 0) + it.qty }));
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 350);
    },
    [flush, course],
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  const onCheck = useMemo(() => {
    const m: Record<string, number> = {};
    o.items.forEach((l) => !l.void && (m[l.id] = (m[l.id] || 0) + l.qty));
    return m;
  }, [o.items]);

  const s = qs.trim().toLowerCase();
  const vis = menu.dishes.filter((d) => menu.cats.some((c) => c.id === d.cat));
  const groups = s
    ? [{ id: 'q', name: 'Найдено', ds: vis.filter((d) => (d.name + ' ' + d.ru).toLowerCase().includes(s)) }]
    : menu.cats.map((c) => ({ id: c.id, name: c.ru || c.name, ds: vis.filter((d) => d.cat === c.id) })).filter((g) => g.ds.length);

  // highlight the category being looked at
  useEffect(() => {
    const root = box.current;
    if (!root || s) return;
    const io = new IntersectionObserver(
      (es) => {
        const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (v) setCat((v.target as HTMLElement).dataset.cat);
      },
      { rootMargin: '-120px 0px -60% 0px' },
    );
    root.querySelectorAll('[data-cat]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [s, groups.length]);

  const jump = (id: string) => {
    setCat(id);
    box.current?.querySelector(`[data-cat="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mp" ref={box}>
      <div className="mp-top">
        <input className="sx-input" placeholder="Найти блюдо: лагман, шашлык…" value={qs} onChange={(e) => setQs(e.target.value)} aria-label="Поиск по меню" />
        {o.type === 'hall' && (
          <div className="mp-course" role="group" aria-label="Подача">
            <span>Подача:</span>
            {([1, 2, 3] as const).map((c) => (
              <button key={c} className={course === c ? 'on' : ''} onClick={() => setCourse(c)} aria-pressed={course === c}>
                {COURSE_RU[c]}
              </button>
            ))}
            {course > 1 && <em>придержим, пока не нажмёте «Подать»</em>}
          </div>
        )}
        {!s && (
          <div className="pos-cats">
            {groups.map((g) => (
              <button key={g.id} className={cat === g.id ? 'on' : ''} onClick={() => jump(g.id)}>
                {g.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {groups.map((g) => (
        <section key={g.id} data-cat={g.id} className="mp-sec">
          <h3>{g.name}</h3>
          <div className="mp-grid">
            {g.ds.map((d) => {
              const price = basePrice(d);
              const off = !d.available || price <= 0;
              const n = (onCheck[d.id] || 0) + (pending[d.id] || 0);
              return (
                <button
                  key={d.id}
                  className={`mp-tile ${n ? 'has' : ''}`}
                  disabled={off}
                  onClick={() => (d.sizes.length > 1 || d.extras.length ? setPick(d) : tap({ id: d.id, si: 0, ex: [], qty: 1 }))}
                >
                  <span className="mp-ph">
                    <DishArt art={d.art} photo={d.photo} sizes="(max-width: 700px) 45vw, 200px" />
                    {n > 0 && <i className="num">{n}</i>}
                  </span>
                  <b>{d.ru || d.name}</b>
                  <span className="num mp-price">
                    {!d.available ? 'стоп-лист' : price <= 0 ? 'нет цены' : `${d.sizes.length > 1 ? 'от ' : ''}${fmt(price)}`}
                  </span>
                </button>
              );
            })}
            {!g.ds.length && <div className="pos-empty small">Ничего не нашлось</div>}
          </div>
        </section>
      ))}
      {pick && (
        <PickModal
          d={pick}
          onClose={() => setPick(null)}
          onAdd={(si, ex, qty, note) => {
            tap({ id: pick.id, si, ex, qty, note });
            setPick(null);
          }}
        />
      )}
    </div>
  );
}

function PickModal({ d, onClose, onAdd }: { d: Dish; onClose: () => void; onAdd: (si: number, ex: number[], qty: number, note: string) => void }) {
  const [si, setSi] = useState(0);
  const [ex, setEx] = useState<number[]>([]);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  return (
    <Modal onClose={onClose} title={d.ru || d.name}>
      {d.sizes.length > 1 && (
        <div className="sx-opts">
          {d.sizes.map((s, i) => (
            <button key={i} className={si === i ? 'on' : ''} onClick={() => setSi(i)}>
              {s.label} <span className="num">{fmt(s.p)}</span>
            </button>
          ))}
        </div>
      )}
      {d.extras.length > 0 && (
        <div className="sx-opts">
          {d.extras.map((e, i) => (
            <button key={i} className={ex.includes(i) ? 'on' : ''} onClick={() => setEx(ex.includes(i) ? ex.filter((x) => x !== i) : [...ex, i])}>
              {e.label} <span className="num">+{fmt(e.p)}</span>
            </button>
          ))}
        </div>
      )}
      <input className="sx-input" placeholder="Комментарий для кухни: без лука, острее…" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="sx-row">
        <div className="sx-step big">
          <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Меньше">
            −
          </button>
          <span className="num">{qty}</span>
          <button onClick={() => setQty(qty + 1)} aria-label="Больше">
            +
          </button>
        </div>
        <button className="sx-btn primary grow" onClick={() => onAdd(si, ex, qty, note)}>
          Добавить · {fmt(unitPrice(d, si, ex) * qty)}
        </button>
      </div>
    </Modal>
  );
}

export function Modal({ title, onClose, children, narrow }: { title: string; onClose: () => void; children: React.ReactNode; narrow?: boolean }) {
  return (
    <div className="sx-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="sx-scrim" onClick={onClose} />
      <div className={`sx-sheet ${narrow ? 'narrow' : ''}`}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

const VOID_REASONS = ['Гость передумал', 'Ошибка при заказе', 'Долго ждали', 'Брак кухни', 'Закончилось'];

/** Cancel a line already sent to the kitchen, or the whole check. Needs a manager's PIN unless the person may do it themself. */
export function VoidModal({ o, line, onClose }: { o: StaffOrder; line: number | 'check'; onClose: () => void }) {
  const { me, act, toast } = useStaff();
  const l = line === 'check' ? null : o.items[line];
  const [qty, setQty] = useState(l?.qty || 1);
  const [reason, setReason] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const self = can(me.role, 'void');
  const needsApproval = line === 'check' ? o.items.some((x) => x.sent && !x.void) : true;
  const needPin = needsApproval && !self;
  const go = async () => {
    setBusy(true);
    const r = await act(o.id, line === 'check' ? { action: 'cancel', reason, pin } : { action: 'void', line, qty, reason, pin });
    setBusy(false);
    if (r) {
      toast(line === 'check' ? `Чек № ${o.no} отменён` : 'Позиция отменена, на кухню ушёл бегунок «ОТМЕНА»');
      onClose();
    }
  };
  return (
    <Modal onClose={onClose} title={l ? `Отменить: ${l.name}` : `Отменить чек № ${o.no}`} narrow>
      {l && l.qty > 1 && (
        <div className="sx-row">
          <span>Сколько отменить</span>
          <div className="sx-step">
            <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Меньше">
              −
            </button>
            <span className="num">{qty}</span>
            <button onClick={() => setQty(Math.min(l.qty, qty + 1))} aria-label="Больше">
              +
            </button>
          </div>
        </div>
      )}
      {needsApproval && (
        <>
          <div className="sx-opts">
            {VOID_REASONS.map((r) => (
              <button key={r} className={reason === r ? 'on' : ''} onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
          <input className="sx-input" placeholder="Или своя причина" value={VOID_REASONS.includes(reason) ? '' : reason} onChange={(e) => setReason(e.target.value)} />
        </>
      )}
      {needPin && (
        <input className="sx-input" type="password" inputMode="numeric" autoComplete="off" placeholder="PIN управляющего" value={pin} onChange={(e) => setPin(e.target.value)} />
      )}
      {!needsApproval && <p className="sx-muted" style={{ margin: 0 }}>На кухню ничего не уходило, чек просто закроется без оплаты.</p>}
      <div className="sx-row">
        <button className="sx-btn" onClick={onClose}>
          Назад
        </button>
        <button className="sx-btn danger grow" disabled={busy || (needsApproval && !reason.trim()) || (needPin && !pin)} onClick={go}>
          {busy ? 'Отменяем…' : 'Отменить'}
        </button>
      </div>
    </Modal>
  );
}

export function MoveModal({ o, onClose }: { o: StaffOrder; onClose: () => void }) {
  const { settings, orders, act, toast } = useStaff();
  const [ask, setAsk] = useState<number | null>(null);
  // a taken table needs a second tap: the first one only asks
  const confirmMerge = (n: number) => {
    if (ask === n) return true;
    setAsk(n);
    toast(`Стол ${n} занят. Нажмите ещё раз, чтобы объединить счета`);
    return false;
  };
  const busy = new Set(orders.filter((x) => x.type === 'hall' && x.tableNo && !['done', 'cancelled'].includes(x.status)).map((x) => x.tableNo));
  return (
    <Modal onClose={onClose} title={`Пересадить: стол ${o.tableNo}`} narrow>
      <p className="sx-muted small" style={{ margin: 0 }}>
        Свободный стол — гости просто пересядут. Занятый — два счёта станут одним.
      </p>
      <div className="wt-tables">
        {Array.from({ length: settings.tables || 0 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={`pos-table ${busy.has(n) ? 'busy' : ''}`}
            style={{ minHeight: 60 }}
            disabled={n === o.tableNo}
            onClick={async () => {
              if (busy.has(n) && !confirmMerge(n)) return;
              if (await act(o.id, { action: 'move', table: n })) {
                toast(busy.has(n) ? `Счета объединены: всё на столе ${n}` : `Гости пересажены за стол ${n}`);
                onClose();
              }
            }}
          >
            <b>{n}</b>
            <span>{n === o.tableNo ? 'сейчас здесь' : busy.has(n) ? 'объединить' : 'свободен'}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

/** Booking of a table for later today, if any: shown on the table tile. */
export function bookingFor(bookings: Booking[], n: number) {
  return bookings.find((b) => b.tableNo === n);
}

/** Today's bookings above the tables: who is coming, when, and a «Пришли» button that seats them. */
export function BookingsToday({ onSeat }: { onSeat: (table: number | null) => void }) {
  const { bookings, refresh, toast } = useStaff();
  const [busy, setBusy] = useState(false);
  if (!bookings.length) return null;
  const set = async (id: number, body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try {
      await api('/api/staff/reservations', 'PATCH', { id, ...body });
      toast(ok);
      await refresh();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  };
  return (
    <div className="bk-today">
      <b>Бронь сегодня</b>
      {bookings.map((b) => (
        <div key={b.id} className={`bk-row ${b.status}`}>
          <span className="num bk-time">{b.time}</span>
          <span className="grow">
            {b.name} · {b.guests} гост.{b.tableNo ? ` · стол ${b.tableNo}` : ''}
            {b.status === 'new' && <em> · не подтверждена</em>}
            {b.note && <span className="sx-muted"> · {b.note}</span>}
          </span>
          {b.phone && (
            <a className="sx-link" href={`tel:${b.phone}`}>
              позвонить
            </a>
          )}
          <button
            className="sx-btn sm"
            disabled={busy}
            onClick={async () => {
              await set(b.id, { status: 'seated' }, `${b.name}: гости пришли`);
              onSeat(b.tableNo);
            }}
          >
            Пришли
          </button>
        </div>
      ))}
    </div>
  );
}
