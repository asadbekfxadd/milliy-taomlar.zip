'use client';
import { useEffect, useMemo, useState } from 'react';
import { useStaff } from './StaffShell';
import { PAY_RU, STATION_RU, clock, mins, placeOf, type StaffOrder } from './types';
import { fmt, prettyPhone } from '@/lib/format';
import { basePrice, unitPrice } from '@/lib/pricing';
import type { Dish } from '@/lib/types';

const KS_RU: Record<string, string> = { queued: 'ждёт', cooking: 'готовится', ready: 'готово' };

export default function Pos() {
  const { menu, settings, orders, act, refresh, toast } = useStaff();
  const [sel, setSel] = useState<string | null>(null);
  const [cat, setCat] = useState(menu.cats[0]?.id);
  const [pick, setPick] = useState<Dish | null>(null);
  const [paying, setPaying] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'board' | 'hall'>('board');

  const open = orders.filter((o) => !['done', 'cancelled'].includes(o.status));
  const online = open.filter((o) => o.source === 'site');
  const takeaway = open.filter((o) => o.source === 'pos' && o.type !== 'hall');
  const byTable = useMemo(() => {
    const m = new Map<number, StaffOrder>();
    open.filter((o) => o.type === 'hall' && o.tableNo).forEach((o) => m.set(o.tableNo!, o));
    return m;
  }, [open]);
  const cur = orders.find((o) => o.id === sel) || null;
  const tables = Array.from({ length: settings.tables || 0 }, (_, i) => i + 1);

  async function openTable(n: number | null, type: 'hall' | 'pickup' = 'hall') {
    const existing = n ? byTable.get(n) : null;
    if (existing) return setSel(existing.id);
    setBusy(true);
    const r = await fetch('/api/staff/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ table: n, guests: 2, type }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toast(j.error || 'Не удалось открыть чек');
    await refresh();
    setSel(j.id);
  }

  async function run(body: Record<string, unknown>, ok?: string) {
    if (!cur) return;
    setBusy(true);
    const r = await act(cur.id, body);
    setBusy(false);
    if (r && ok) toast(ok);
    return r;
  }

  const unsent = cur ? cur.items.filter((l) => !l.sent).length : 0;
  const closed = cur ? ['done', 'cancelled'].includes(cur.status) : false;

  return (
    <div className={`pos ${cur ? 'has-sel' : ''}`}>
      {/* ---------- floor ---------- */}
      <section className="pos-floor">
        <div className="pos-views">
          <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>
            Все заказы <span className="num">{open.length}</span>
          </button>
          <button className={view === 'hall' ? 'on' : ''} onClick={() => setView('hall')}>
            Зал и столы
          </button>
          <button className="sx-btn ghost" disabled={busy} onClick={() => openTable(null, 'pickup')}>
            + С собой
          </button>
        </div>
        {view === 'board' ? (
          <Board orders={open} sel={sel} onSel={setSel} />
        ) : (
        <>
        {online.length > 0 && (
          <div className="pos-block">
            <h2>Заказы с сайта</h2>
            <div className="pos-cards">
              {online.map((o) => (
                <button key={o.id} className={`pos-card ${o.status === 'new' ? 'alert' : ''} ${sel === o.id ? 'sel' : ''}`} onClick={() => setSel(o.id)}>
                  <b>№ {o.no} · {o.type === 'delivery' ? 'Доставка' : 'С собой'}</b>
                  <span>{o.name} · {prettyPhone(o.phone)}</span>
                  <span className="num">{fmt(o.total)} сум · {mins(o.createdAt)} мин</span>
                  <StatusChip o={o} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pos-block">
          <div className="pos-head">
            <h2>Зал</h2>
          </div>
          {tables.length ? (
            <div className="pos-tables">
              {tables.map((n) => {
                const o = byTable.get(n);
                const ready = o?.items.some((l) => l.ks === 'ready');
                return (
                  <button key={n} className={`pos-table ${o ? 'busy' : ''} ${ready ? 'ready' : ''} ${o && sel === o.id ? 'sel' : ''}`} onClick={() => openTable(n)} disabled={busy}>
                    <b>{n}</b>
                    <span className="num">{o ? `${fmt(o.total)} · ${mins(o.createdAt)}′` : 'свободен'}</span>
                    {ready && <em>забрать</em>}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="sx-muted">Укажите число столов в «Управление → Настройки».</p>
          )}
        </div>

        {takeaway.length > 0 && (
          <div className="pos-block">
            <h2>С собой (касса)</h2>
            <div className="pos-cards">
              {takeaway.map((o) => (
                <button key={o.id} className={`pos-card ${sel === o.id ? 'sel' : ''}`} onClick={() => setSel(o.id)}>
                  <b>№ {o.no} · С собой</b>
                  <span className="num">{fmt(o.total)} сум · {mins(o.createdAt)} мин</span>
                  <StatusChip o={o} />
                </button>
              ))}
            </div>
          </div>
        )}
        </>
        )}
      </section>

      {/* ---------- check ---------- */}
      <section className="pos-check">
        {!cur ? (
          <div className="pos-empty">
            <b>Выберите стол или заказ</b>
            <span>Свободный стол откроет новый чек. Заказы с сайта при поступлении сами уходят на кухню и печатаются.</span>
          </div>
        ) : (
          <>
            <div className="pos-check-head">
              <button className="sx-link back" onClick={() => setSel(null)}>
                ← Все заказы
              </button>
              <div>
                <h2>{placeOf(cur)}</h2>
                <span className="sx-muted">
                  Чек № {cur.no} · открыт {new Date(cur.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {cur.type === 'hall' && !closed && (
                <div className="sx-step" aria-label="Гостей">
                  <button onClick={() => run({ action: 'guests', guests: Math.max(0, cur.guests - 1) })}>−</button>
                  <span className="num">{cur.guests} гост.</span>
                  <button onClick={() => run({ action: 'guests', guests: cur.guests + 1 })}>+</button>
                </div>
              )}
              <StatusChip o={cur} />
            </div>

            {cur.source === 'site' && (
              <div className="pos-customer">
                <b>{cur.name}</b> · <a href={`tel:${cur.phone}`}>{prettyPhone(cur.phone)}</a>
                {cur.address && <div>{cur.zone}: {cur.address}</div>}
                <div>
                  {cur.when !== 'asap' ? `Ко времени ${cur.when}` : 'Как можно скорее'} · {cur.pay === 'card' ? 'карта при получении' : 'наличные'}
                </div>
                {cur.note && <div className="pos-note">💬 {cur.note}</div>}
              </div>
            )}

            <div className="pos-meta">
              <PayBadge o={cur} />
              {cur.etaAt && ['accepted', 'cooking'].includes(cur.status) && (
                <span className="pos-eta">
                  к <b className="num">{clock(cur.etaAt)}</b>
                  <button onClick={() => run({ action: 'eta', minutes: -5 }, 'Время обновлено')}>−5</button>
                  <button onClick={() => run({ action: 'eta', minutes: 5 }, 'Гостю отправлено новое время')}>+5</button>
                  <button onClick={() => run({ action: 'eta', minutes: 10 }, 'Гостю отправлено новое время')}>+10</button>
                </span>
              )}
            </div>
            {cur.payStatus === 'pending' && cur.status === 'new' && (
              <div className="pos-warn">Гость ещё не оплатил онлайн. Заказ уйдёт на кухню сам после оплаты. Принять вручную — только если гость платит иначе.</div>
            )}

            <div className="pos-lines">
              {cur.items.length ? (
                cur.items.map((l, i) => (
                  <div key={i} className={`pos-line ${l.sent ? 'sent' : ''}`}>
                    <div>
                      <b>{l.name}</b>
                      {l.mods && <span className="sx-muted"> · {l.mods}</span>}
                      {l.note && <div className="pos-note">{l.note}</div>}
                      <div className="sx-muted small">
                        {STATION_RU[l.station || 'kitchen']} · {fmt(l.unit)}
                      </div>
                    </div>
                    {l.sent ? (
                      <span className={`ks ${l.ks || ''}`}>
                        {l.qty} × {KS_RU[l.ks || 'queued']}
                      </span>
                    ) : (
                      <div className="sx-step">
                        <button onClick={() => run({ action: 'qty', line: i, qty: l.qty - 1 })} aria-label="Меньше">
                          −
                        </button>
                        <span className="num">{l.qty}</span>
                        <button onClick={() => run({ action: 'qty', line: i, qty: l.qty + 1 })} aria-label="Больше">
                          +
                        </button>
                      </div>
                    )}
                    <b className="num right">{fmt(l.unit * l.qty)}</b>
                  </div>
                ))
              ) : (
                <div className="pos-empty small">Чек пустой. Добавьте блюда ниже.</div>
              )}
            </div>

            <div className="pos-total">
              <div>
                <span>Блюда</span>
                <span className="num">{fmt(cur.subtotal)}</span>
              </div>
              {cur.service > 0 && (
                <div>
                  <span>Обслуживание {settings.servicePct}%</span>
                  <span className="num">{fmt(cur.service)}</span>
                </div>
              )}
              {cur.fee > 0 && (
                <div>
                  <span>Доставка</span>
                  <span className="num">{fmt(cur.fee)}</span>
                </div>
              )}
              {(cur.discount ?? 0) > 0 && (
                <div>
                  <span>Скидка {cur.promo}</span>
                  <span className="num">−{fmt(cur.discount!)}</span>
                </div>
              )}
              <div className="big">
                <span>Итого</span>
                <span className="num">{fmt(cur.total)} сум</span>
              </div>
            </div>

            {!closed && (
              <>
                <div className="pos-actions">
                  <button className="sx-btn primary" disabled={!unsent || busy} onClick={() => run({ action: cur.status === 'new' ? 'accept' : 'send' }, 'Отправлено на кухню, бегунки печатаются')}>
                    {cur.status === 'new' ? 'Принять и на кухню' : `На кухню${unsent ? ` (${unsent})` : ''}`}
                  </button>
                  <button className="sx-btn" disabled={busy || !cur.items.some((l) => l.sent) || cur.status === 'ready'} onClick={() => run({ action: 'ready' }, 'Гостю отправлено: заказ готов')}>
                    {cur.type === 'delivery' ? 'Передать курьеру' : cur.type === 'pickup' ? 'Готов к выдаче' : 'Готово'}
                  </button>
                  {settings.printGuestChecks && (
                    <button className="sx-btn" disabled={!cur.items.length || busy} onClick={() => run({ action: 'precheck' }, 'Пречек отправлен на печать')}>
                      Пречек
                    </button>
                  )}
                  {cur.payStatus === 'paid' ? (
                    <button className="sx-btn ok" disabled={unsent > 0 || busy} onClick={async () => (await run({ action: 'complete' }, 'Заказ закрыт')) && setSel(null)}>
                      {cur.type === 'delivery' ? 'Доставлен' : 'Выдан'}
                    </button>
                  ) : (
                    <button className="sx-btn ok" disabled={!cur.items.length || unsent > 0 || busy} onClick={() => setPaying(true)}>
                      Оплата
                    </button>
                  )}
                </div>

                <div className="pos-menu">
                  <div className="pos-cats">
                    {menu.cats.map((c) => (
                      <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>
                        {c.ru || c.name}
                      </button>
                    ))}
                  </div>
                  <div className="pos-tiles">
                    {menu.dishes
                      .filter((d) => d.cat === cat)
                      .map((d) => (
                        <button
                          key={d.id}
                          className="pos-tile"
                          disabled={!d.available || busy}
                          onClick={() => (d.sizes.length > 1 || d.extras.length ? setPick(d) : run({ action: 'add', items: [{ id: d.id, si: 0, ex: [], qty: 1 }] }))}
                        >
                          <b>{d.name}</b>
                          <span className="num">{d.available ? fmt(basePrice(d)) : 'стоп'}</span>
                        </button>
                      ))}
                  </div>
                </div>

                <div className="pos-danger">
                  {confirmCancel ? (
                    <span>
                      Отменить чек № {cur.no}?{' '}
                      <button
                        className="sx-link danger"
                        onClick={async () => {
                          await run({ action: 'cancel' }, 'Чек отменён');
                          setConfirmCancel(false);
                          setSel(null);
                        }}
                      >
                        Да, отменить
                      </button>{' '}
                      · <button className="sx-link" onClick={() => setConfirmCancel(false)}>Нет</button>
                    </span>
                  ) : (
                    <button className="sx-link danger" onClick={() => setConfirmCancel(true)}>
                      Отменить чек
                    </button>
                  )}
                </div>
              </>
            )}
            {closed && settings.printGuestChecks && (
              <div className="pos-actions">
                <button className="sx-btn" onClick={() => run({ action: 'reprint' }, 'Чек отправлен на печать')}>
                  Напечатать чек ещё раз
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {pick && cur && <PickModal d={pick} onClose={() => setPick(null)} onAdd={(si, ex, qty, note) => run({ action: 'add', items: [{ id: pick.id, si, ex, qty, note }] }).then(() => setPick(null))} />}
      {paying && cur && (
        <PayModal
          o={cur}
          onClose={() => setPaying(false)}
          onPay={async (method) => {
            const r = await run({ action: 'pay', method }, settings.printGuestChecks ? 'Оплачено, чек печатается' : 'Чек закрыт');
            if (r) {
              setPaying(false);
              setSel(null);
            }
          }}
        />
      )}
    </div>
  );
}

function StatusChip({ o }: { o: StaffOrder }) {
  const map: Record<string, [string, string]> = {
    new: ['новый', 'bad'],
    accepted: ['на кухне', 'warn'],
    cooking: ['готовится', 'warn'],
    ready: ['готово', 'ok'],
    done: ['оплачен', ''],
    cancelled: ['отменён', ''],
  };
  const [t, c] = map[o.status] || [o.status, ''];
  return <span className={`chip ${c}`}>{t}</span>;
}

function PickModal({ d, onClose, onAdd }: { d: Dish; onClose: () => void; onAdd: (si: number, ex: number[], qty: number, note: string) => void }) {
  const [si, setSi] = useState(0);
  const [ex, setEx] = useState<number[]>([]);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  return (
    <div className="sx-modal" role="dialog" aria-modal="true">
      <div className="sx-scrim" onClick={onClose} />
      <div className="sx-sheet">
        <h3>{d.name}</h3>
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
        <input className="sx-input" placeholder="Комментарий для кухни (без лука, острее…)" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="sx-row">
          <div className="sx-step big">
            <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span className="num">{qty}</span>
            <button onClick={() => setQty(qty + 1)}>+</button>
          </div>
          <button className="sx-btn primary grow" onClick={() => onAdd(si, ex, qty, note)}>
            Добавить · {fmt(unitPrice(d, si, ex) * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}

function PayModal({ o, onClose, onPay }: { o: StaffOrder; onClose: () => void; onPay: (m: string) => void }) {
  const [method, setMethod] = useState(o.pay === 'card' ? 'card' : 'cash');
  const [got, setGot] = useState('');
  const received = Number(got.replace(/\D/g, '')) || 0;
  return (
    <div className="sx-modal" role="dialog" aria-modal="true">
      <div className="sx-scrim" onClick={onClose} />
      <div className="sx-sheet">
        <h3>Оплата · {placeOf(o)}</h3>
        <div className="pay-total num">{fmt(o.total)} сум</div>
        <div className="sx-opts four">
          {Object.entries(PAY_RU).map(([k, l]) => (
            <button key={k} className={method === k ? 'on' : ''} onClick={() => setMethod(k)}>
              {l}
            </button>
          ))}
        </div>
        {method === 'cash' && (
          <div className="sx-row">
            <input className="sx-input" inputMode="numeric" placeholder="Получено от гостя" value={got} onChange={(e) => setGot(e.target.value)} />
            <div className="change num">Сдача: {received >= o.total ? fmt(received - o.total) : '—'}</div>
          </div>
        )}
        <div className="sx-row">
          <button className="sx-btn" onClick={onClose}>
            Назад
          </button>
          <button className="sx-btn ok grow" onClick={() => onPay(method)}>
            Закрыть чек
          </button>
        </div>
        <p className="sx-muted small">Фискальный чек гостю выбивается на вашей онлайн-кассе.</p>
      </div>
    </div>
  );
}

function PayBadge({ o }: { o: StaffOrder }) {
  if (o.payStatus === 'paid') return <span className="chip ok">оплачено {o.paidWith === 'payme' ? 'Payme' : o.paidWith === 'click' ? 'Click' : PAY_RU[o.paidWith] || ''}</span>;
  if (o.payStatus === 'pending') return <span className="chip warn">ждём оплату {o.pay === 'payme' ? 'Payme' : 'Click'}</span>;
  if (o.payStatus === 'failed') return <span className="chip bad">оплата не прошла</span>;
  if (o.payStatus === 'refunded') return <span className="chip">возврат</span>;
  return <span className="chip">к оплате{o.source === 'site' ? `: ${o.pay === 'card' ? 'карта' : 'наличные'}` : ''}</span>;
}

const COLS: [string, string, (o: StaffOrder) => boolean][] = [
  ['new', 'Новые', (o) => o.status === 'new'],
  ['kitchen', 'На кухне', (o) => o.status === 'accepted' || o.status === 'cooking'],
  ['ready', 'Готовы · выдать', (o) => o.status === 'ready'],
];

function Board({ orders, sel, onSel }: { orders: StaffOrder[]; sel: string | null; onSel: (id: string) => void }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="board">
      {COLS.map(([k, title, fn]) => {
        const list = orders.filter(fn);
        return (
          <div key={k} className="board-col">
            <h2>
              {title} <span className="chip">{list.length}</span>
            </h2>
            {list.length ? (
              list.map((o) => {
                const late = o.etaAt && Date.now() > new Date(o.etaAt).getTime() && o.status !== 'ready';
                return (
                  <button key={o.id} className={`bcard ${o.status === 'new' && !['pending', 'failed'].includes(o.payStatus) ? 'alert' : ''} ${sel === o.id ? 'sel' : ''} ${late ? 'late' : ''}`} onClick={() => onSel(o.id)}>
                    <div className="bcard-top">
                      <b>{placeOf(o)}</b>
                      <span className="num">№ {o.no}</span>
                    </div>
                    <div className="bcard-mid">
                      <span className={`kind ${o.type}`}>{o.type === 'delivery' ? 'Доставка' : o.type === 'pickup' ? 'С собой' : 'Зал'}</span>
                      <PayBadge o={o} />
                    </div>
                    <div className="bcard-bot">
                      <span className="num">{fmt(o.total)} сум</span>
                      <span className="num">{o.etaAt && o.status !== 'ready' ? `к ${clock(o.etaAt)}` : `${mins(o.createdAt)} мин`}</span>
                    </div>
                    {o.source === 'site' && <span className="sx-muted small">{o.name} · {prettyPhone(o.phone)}</span>}
                  </button>
                );
              })
            ) : (
              <div className="pos-empty small">Пусто</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
