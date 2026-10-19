'use client';
import { useEffect, useMemo, useState } from 'react';
import { fmt, prettyPhone } from '@/lib/format';
import { useStaff } from './FloorShell';
import { PAY_RU, ago, clock, placeOf, type StaffOrder } from './types';
import { Lines, MenuPicker, Modal, MoveModal, PayBadge, StatusChip, Totals, VoidModal } from './check';
import { api } from '../panel/kit';

/* Cash desk: the shift strip on top, the floor on the left (board or hall), the open check on the right. */

export default function Pos() {
  const { settings, orders, act, refresh, toast, shift } = useStaff();
  const [sel, setSel] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { k: 'pay' } | { k: 'void'; line: number | 'check' } | { k: 'move' } | { k: 'shift'; mode: 'open' | 'in' | 'out' | 'close' }>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'board' | 'hall'>('hall');
  const [showCheck, setShowCheck] = useState(false);
  useEffect(() => setShowCheck(false), [sel]);

  useEffect(() => {
    try {
      const v = localStorage.getItem('mt-pos-view');
      if (v === 'board' || v === 'hall') setView(v);
    } catch {}
  }, []);
  const pickView = (v: 'board' | 'hall') => {
    setView(v);
    try {
      localStorage.setItem('mt-pos-view', v);
    } catch {}
  };

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
    try {
      const j = await api('/api/staff/orders', 'POST', { table: n, guests: type === 'hall' ? 2 : 0, type });
      await refresh();
      setSel(j.id);
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }

  async function run(body: Record<string, unknown>, ok?: string) {
    if (!cur) return null;
    setBusy(true);
    const r = await act(cur.id, body);
    setBusy(false);
    if (r && ok) toast(ok);
    return r;
  }

  const live = cur ? cur.items.filter((l) => !l.void) : [];
  const unsent = live.filter((l) => !l.sent).length;
  const closed = cur ? ['done', 'cancelled'].includes(cur.status) : false;

  return (
    <>
      <ShiftStrip onAction={(mode) => setModal({ k: 'shift', mode })} />
      <div className={`pos ${cur ? 'has-sel' : ''} ${cur && !closed ? 'menu-mode' : ''} ${showCheck ? 'show-check' : ''}`}>
        <section className="pos-floor">
          {cur && !closed ? (
            <>
              <div className="mp-head">
                <button className="b" onClick={() => (setSel(null), setShowCheck(false))}>
                  ← Столы
                </button>
                <h2>
                  {placeOf(cur)} <span className="sx-muted small">· чек № {cur.no}</span>
                </h2>
              </div>
              <MenuPicker key={cur.id} o={cur} onAdd={(items) => act(cur.id, { action: 'add', items })} />
              <div className="mp-bar">
                <button className="sx-btn ok grow" onClick={() => setShowCheck(true)}>
                  Чек · {live.length} поз. · {fmt(cur.total)}
                </button>
                <button className="sx-btn primary" disabled={!unsent || busy} onClick={() => run({ action: cur.status === 'new' ? 'accept' : 'send' }, 'Отправлено на кухню')}>
                  На кухню{unsent ? ` · ${unsent}` : ''}
                </button>
              </div>
            </>
          ) : (
          <>
          <div className="pos-views">
            <div className="seg">
              <button className={view === 'hall' ? 'on' : ''} onClick={() => pickView('hall')}>
                Зал и онлайн
              </button>
              <button className={view === 'board' ? 'on' : ''} onClick={() => pickView('board')}>
                Все заказы по этапам · {open.length}
              </button>
            </div>
            <span className="sp" />
            <button className="b" disabled={busy} onClick={() => openTable(null, 'pickup')}>
              Новый заказ с собой
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
                      <button key={o.id} className={`pos-card ${o.status === 'new' && !['pending', 'failed'].includes(o.payStatus) ? 'alert' : ''} ${sel === o.id ? 'sel' : ''}`} onClick={() => setSel(o.id)}>
                        <b>
                          № {o.no} · {o.type === 'delivery' ? 'Доставка' : 'С собой'}
                        </b>
                        <span>
                          {o.name} · {prettyPhone(o.phone)}
                        </span>
                        <span className="num">
                          {fmt(o.total)} сум · {ago(o.createdAt)} назад
                        </span>
                        <StatusChip o={o} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="pos-block">
                <h2>Столы</h2>
                {tables.length ? (
                  <div className="pos-tables">
                    {tables.map((n) => {
                      const o = byTable.get(n);
                      const ready = o?.items.some((l) => l.ks === 'ready' && !l.void);
                      return (
                        <button key={n} className={`pos-table ${o ? 'busy' : ''} ${ready ? 'ready' : ''} ${o && sel === o.id ? 'sel' : ''}`} onClick={() => openTable(n)} disabled={busy}>
                          <b>{n}</b>
                          <span className="num">{o ? `${fmt(o.total)} · ${ago(o.createdAt)}` : 'свободен'}</span>
                          {o?.waiter && <span>{o.waiter}</span>}
                          {ready && <em>забрать с кухни</em>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="sx-muted">Столов нет. Укажите их число в «Управление → Столы и QR».</p>
                )}
              </div>
              {takeaway.length > 0 && (
                <div className="pos-block">
                  <h2>С собой</h2>
                  <div className="pos-cards">
                    {takeaway.map((o) => (
                      <button key={o.id} className={`pos-card ${sel === o.id ? 'sel' : ''}`} onClick={() => setSel(o.id)}>
                        <b>№ {o.no} · С собой</b>
                        <span className="num">
                          {fmt(o.total)} сум · {ago(o.createdAt)}
                        </span>
                        <StatusChip o={o} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          </>
          )}
        </section>

        <section className="pos-check" aria-label="Чек">
          {!cur ? (
            <div className="pos-empty">
              <b>Выберите стол или заказ</b>
              <span>Свободный стол откроет новый чек. Заказы с сайта появляются слева и мигают, пока их не примут.</span>
            </div>
          ) : (
            <>
              <div className="pos-check-head">
                <button className="sx-link back" onClick={() => (closed ? setSel(null) : setShowCheck(false))}>
                  {closed ? '← Все столы' : '← К меню'}
                </button>
                <div>
                  <h2>{placeOf(cur)}</h2>
                  <span className="sx-muted small">
                    Чек № {cur.no} · открыт {clock(cur.createdAt)}
                    {cur.waiter ? ` · ${cur.waiter}` : ''}
                  </span>
                </div>
                {cur.type === 'hall' && !closed && (
                  <div className="sx-step" aria-label="Гостей">
                    <button onClick={() => run({ action: 'guests', guests: Math.max(0, cur.guests - 1) })} aria-label="Меньше гостей">
                      −
                    </button>
                    <span className="num">{cur.guests} гост.</span>
                    <button onClick={() => run({ action: 'guests', guests: cur.guests + 1 })} aria-label="Больше гостей">
                      +
                    </button>
                  </div>
                )}
                <StatusChip o={cur} />
              </div>

              {cur.source === 'site' && (
                <div className="pos-customer">
                  <b>{cur.name}</b> · <a href={`tel:${cur.phone}`}>{prettyPhone(cur.phone)}</a>
                  {cur.address && (
                    <div>
                      {cur.zone}: {cur.address}
                    </div>
                  )}
                  <div>
                    {cur.when !== 'asap' ? `Ко времени ${cur.when}` : 'Как можно скорее'} · {cur.pay === 'card' ? 'карта при получении' : cur.pay === 'cash' ? 'наличные' : PAY_RU[cur.pay]}
                  </div>
                  {cur.note && <div className="pos-note">Комментарий: {cur.note}</div>}
                </div>
              )}

              <div className="pos-meta">
                <PayBadge o={cur} />
                {cur.etaAt && ['accepted', 'cooking'].includes(cur.status) && cur.source === 'site' && (
                  <span className="pos-eta">
                    гостю обещано к <b className="num">{clock(cur.etaAt)}</b>
                    <button onClick={() => run({ action: 'eta', minutes: 5 }, 'Гостю отправлено новое время')}>+5</button>
                    <button onClick={() => run({ action: 'eta', minutes: 10 }, 'Гостю отправлено новое время')}>+10</button>
                  </span>
                )}
              </div>
              {cur.payStatus === 'pending' && cur.status === 'new' && (
                <div className="pos-warn">Гость ещё не оплатил онлайн. Заказ сам уйдёт на кухню после оплаты. Принимайте вручную, только если гость платит иначе.</div>
              )}

              <Lines o={cur} busy={busy} onQty={(i, q) => run({ action: 'qty', line: i, qty: q })} onVoid={(i) => setModal({ k: 'void', line: i })} />
              <Totals o={cur} />

              {!closed && (
                <>
                  <div className="pos-actions">
                    <button className="sx-btn primary" disabled={!unsent || busy} onClick={() => run({ action: cur.status === 'new' ? 'accept' : 'send' }, 'Отправлено на кухню')}>
                      {cur.status === 'new' ? 'Принять и на кухню' : `На кухню${unsent ? ` · ${unsent}` : ''}`}
                    </button>
                    {cur.payStatus === 'paid' ? (
                      <button className="sx-btn ok" disabled={unsent > 0 || busy} onClick={async () => (await run({ action: 'complete' }, 'Заказ выдан и закрыт')) && setSel(null)}>
                        {cur.type === 'delivery' ? 'Передан курьеру' : 'Выдан гостю'}
                      </button>
                    ) : (
                      <button
                        className="sx-btn ok"
                        disabled={!live.length || unsent > 0 || busy}
                        title={unsent ? 'Сначала отправьте всё на кухню' : ''}
                        onClick={() => (shift ? setModal({ k: 'pay' }) : (toast('Сначала откройте смену'), setModal({ k: 'shift', mode: 'open' })))}
                      >
                        Оплата · {fmt(cur.total)}
                      </button>
                    )}
                    {cur.type !== 'hall' && (
                      <button className="sx-btn" disabled={busy || !live.some((l) => l.sent) || cur.status === 'ready'} onClick={() => run({ action: 'ready' }, cur.source === 'site' ? 'Гостю отправлено: заказ готов' : 'Отмечено: готово')}>
                        {cur.type === 'delivery' ? 'Готов, ждёт курьера' : 'Готов к выдаче'}
                      </button>
                    )}
                    {settings.printGuestChecks && (
                      <button className="sx-btn" disabled={!live.length || busy} onClick={() => run({ action: 'precheck' }, 'Пречек печатается')}>
                        Пречек
                      </button>
                    )}
                  </div>

                  <div className="pos-danger">
                    {cur.type === 'hall' ? (
                      <button className="sx-link" onClick={() => setModal({ k: 'move' })}>
                        Пересадить за другой стол
                      </button>
                    ) : (
                      <span />
                    )}
                    <button className="sx-link danger" onClick={() => setModal({ k: 'void', line: 'check' })}>
                      Отменить весь чек
                    </button>
                  </div>
                </>
              )}
              {closed && settings.printGuestChecks && (
                <button className="sx-btn" onClick={() => run({ action: 'reprint' }, 'Чек печатается')}>
                  Напечатать чек ещё раз
                </button>
              )}
            </>
          )}
        </section>
      </div>

      {modal?.k === 'pay' && cur && (
        <PayModal
          o={cur}
          onClose={() => setModal(null)}
          onPay={async (method, tips) => {
            const r = await run({ action: 'pay', method, tips }, settings.printGuestChecks ? 'Оплачено, чек печатается' : 'Оплачено, чек закрыт');
            if (r) {
              setModal(null);
              setSel(null);
            }
          }}
        />
      )}
      {modal?.k === 'void' && cur && <VoidModal o={cur} line={modal.line} onClose={() => (setModal(null), modal.line === 'check' && setSel(null))} />}
      {modal?.k === 'move' && cur && <MoveModal o={cur} onClose={() => setModal(null)} />}
      {modal?.k === 'shift' && <ShiftModal mode={modal.mode} onClose={() => setModal(null)} />}
    </>
  );
}

function PayModal({ o, onClose, onPay }: { o: StaffOrder; onClose: () => void; onPay: (m: string, tips: number) => Promise<void> }) {
  const [method, setMethod] = useState(o.pay === 'card' ? 'card' : 'cash');
  const [tipsTxt, setTipsTxt] = useState('');
  const [got, setGot] = useState('');
  const [busy, setBusy] = useState(false);
  const tips = Number(tipsTxt.replace(/\D/g, '')) || 0;
  const due = o.total + tips;
  const received = Number(got.replace(/\D/g, '')) || 0;
  const pct = (p: number) => String(Math.round((o.subtotal * p) / 100 / 1000) * 1000);
  return (
    <Modal onClose={onClose} title={`Оплата · ${placeOf(o)}`}>
      <div className="pay-total num">{fmt(due)} сум</div>
      <div className="pay-lines">
        <div>
          <span>По чеку</span>
          <span className="num">{fmt(o.total)}</span>
        </div>
        {tips > 0 && (
          <div>
            <span>Чаевые{o.waiter ? ` · ${o.waiter}` : ''}</span>
            <span className="num">{fmt(tips)}</span>
          </div>
        )}
      </div>
      <div className="sx-opts four">
        {Object.entries(PAY_RU).map(([k, l]) => (
          <button key={k} className={method === k ? 'on' : ''} onClick={() => setMethod(k)}>
            {l}
          </button>
        ))}
      </div>
      <div>
        <div className="sx-muted small" style={{ marginBottom: 6 }}>
          Чаевые официанту (не входят в выручку)
        </div>
        <div className="sx-opts">
          {[0, 5, 10, 15].map((p) => (
            <button key={p} className={(p === 0 ? tips === 0 : tipsTxt === pct(p)) ? 'on' : ''} onClick={() => setTipsTxt(p ? pct(p) : '')}>
              {p ? `${p}%` : 'Без чаевых'}
            </button>
          ))}
        </div>
        <input className="sx-input" style={{ marginTop: 6 }} inputMode="numeric" placeholder="Своя сумма чаевых" value={tipsTxt} onChange={(e) => setTipsTxt(e.target.value.replace(/\D/g, ''))} />
      </div>
      {method === 'cash' && (
        <div className="sx-row">
          <input className="sx-input" inputMode="numeric" placeholder="Сколько дал гость" value={got} onChange={(e) => setGot(e.target.value.replace(/\D/g, ''))} />
          <div className="change num">Сдача: {received >= due ? fmt(received - due) : '—'}</div>
        </div>
      )}
      <div className="sx-row">
        <button className="sx-btn" onClick={onClose}>
          Назад
        </button>
        <button
          className="sx-btn ok grow"
          disabled={busy || (method === 'cash' && received > 0 && received < due)}
          onClick={async () => {
            setBusy(true);
            await onPay(method, tips);
            setBusy(false);
          }}
        >
          {busy ? 'Закрываем…' : `Оплачено: ${PAY_RU[method]}`}
        </button>
      </div>
      <p className="sx-muted small" style={{ margin: 0 }}>
        Фискальный чек выбивается на вашей онлайн-кассе.
      </p>
    </Modal>
  );
}

/* ---------- shift ---------- */

function ShiftStrip({ onAction }: { onAction: (m: 'open' | 'in' | 'out' | 'close') => void }) {
  const { shift, toast } = useStaff();
  if (!shift)
    return (
      <div className="shift closed">
        <b>Смена закрыта</b>
        <span className="sp">Заказы принимать можно, оплату — после открытия смены.</span>
        <button className="b main" onClick={() => onAction('open')}>
          Открыть смену
        </button>
      </div>
    );
  return (
    <div className="shift">
      <b>Смена № {shift.id}</b>
      <span className="sp muted">
        открыл {shift.openedBy} в {clock(shift.openedAt)}
      </span>
      <button className="b sm" onClick={() => onAction('in')}>
        Внесение
      </button>
      <button className="b sm" onClick={() => onAction('out')}>
        Изъятие
      </button>
      <button
        className="b sm"
        onClick={async () => {
          try {
            await api('/api/staff/shift', 'POST', { action: 'print' });
            toast('X-отчёт отправлен на принтер кассы');
          } catch (e: any) {
            toast(e.message);
          }
        }}
      >
        X-отчёт
      </button>
      <button className="b sm warn" onClick={() => onAction('close')}>
        Закрыть смену
      </button>
    </div>
  );
}

function ShiftModal({ mode, onClose }: { mode: 'open' | 'in' | 'out' | 'close'; onClose: () => void }) {
  const { refresh, toast } = useStaff();
  const [sum, setSum] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [force, setForce] = useState(false);
  const [rep, setRep] = useState<any>(null);
  useEffect(() => {
    if (mode === 'close') api('/api/staff/shift').then((j) => setRep(j)).catch((e) => setErr(e.message));
  }, [mode]);
  const n = Number(sum.replace(/\D/g, '')) || 0;
  const title = { open: 'Открыть смену', in: 'Внесение в кассу', out: 'Изъятие из кассы', close: 'Закрыть смену' }[mode];

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const body = mode === 'open' ? { action: 'open', cash: n } : mode === 'close' ? { action: 'close', counted: n, force } : { action: mode, amount: n, note };
      const r = await fetch('/api/staff/shift', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409) {
        setForce(true);
        throw new Error(j.error);
      }
      if (!r.ok) throw new Error(j.error || 'Ошибка');
      toast(mode === 'open' ? 'Смена открыта' : mode === 'close' ? 'Смена закрыта, Z-отчёт печатается' : 'Записано');
      await refresh();
      onClose();
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  }

  const r = rep?.report;
  const diff = r ? n - r.expectedCash : 0;
  return (
    <Modal onClose={onClose} title={title} narrow>
      {mode === 'close' && r && (
        <div className="rep">
          <div>
            <span>Чеков</span>
            <b className="num">{r.checks}</b>
          </div>
          <div>
            <span>Выручка</span>
            <b className="num">{fmt(r.revenue)}</b>
          </div>
          {Object.entries(r.byMethod as Record<string, number>).map(([k, v]) => (
            <div key={k}>
              <span className="muted">{PAY_RU[k] || k}</span>
              <span className="num">{fmt(v)}</span>
            </div>
          ))}
          <div>
            <span>Чаевые</span>
            <span className="num">{fmt(r.tips)}</span>
          </div>
          <div className="t">
            <span>Должно быть наличных</span>
            <span className="num">{fmt(r.expectedCash)}</span>
          </div>
        </div>
      )}
      <input
        className="sx-input"
        inputMode="numeric"
        autoFocus
        placeholder={mode === 'open' ? 'Наличных в кассе сейчас' : mode === 'close' ? 'Посчитали наличных' : 'Сумма'}
        value={sum ? fmt(n) : ''}
        onChange={(e) => setSum(e.target.value.replace(/\D/g, ''))}
      />
      {mode === 'close' && r && sum && (
        <div className={`chip ${diff === 0 ? 'ok' : 'bad'}`} style={{ alignSelf: 'flex-start', fontSize: 14 }}>
          {diff === 0 ? 'Сходится' : diff > 0 ? `Излишек ${fmt(diff)}` : `Недостача ${fmt(-diff)}`}
        </div>
      )}
      {(mode === 'in' || mode === 'out') && (
        <input className="sx-input" placeholder={mode === 'out' ? 'На что: закупка, инкассация…' : 'Комментарий (необязательно)'} value={note} onChange={(e) => setNote(e.target.value)} />
      )}
      {err && <p className="err" style={{ margin: 0 }}>{err}</p>}
      <div className="sx-row">
        <button className="sx-btn" onClick={onClose}>
          Назад
        </button>
        <button className={`sx-btn ${mode === 'close' ? 'warn' : 'primary'} grow`} disabled={busy || (mode !== 'open' && mode !== 'close' && !n) || (mode === 'close' && !sum)} onClick={go}>
          {busy ? '…' : force ? 'Всё равно закрыть' : title}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- board ---------- */
const COLS: [string, string, (o: StaffOrder) => boolean][] = [
  ['new', 'Новые', (o) => o.status === 'new'],
  ['kitchen', 'На кухне', (o) => o.status === 'accepted' || o.status === 'cooking'],
  ['ready', 'Готовы, выдать', (o) => o.status === 'ready'],
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
                      <span className="num">{o.etaAt && o.status !== 'ready' ? `к ${clock(o.etaAt)}` : `${ago(o.createdAt)}`}</span>
                    </div>
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
