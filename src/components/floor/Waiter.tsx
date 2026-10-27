'use client';
import { useEffect, useMemo, useState } from 'react';
import { fmt } from '@/lib/format';
import { useStaff } from './FloorShell';
import { ago, type StaffOrder } from './types';
import { BookingsToday, FireButtons, bookingFor, Lines, MenuPicker, MoveModal, StatusChip, Totals, VoidModal } from './check';
import { api } from '../panel/kit';

/* Waiter on a phone: tables first, then one table's check with the menu under it.
   The waiter sends to the kitchen and asks for the bill; the cashier takes the money. */

export default function Waiter() {
  const { me, settings, orders, bookings, act, refresh, toast } = useStaff();
  const [sel, setSel] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | { k: 'void'; line: number | 'check' } | { k: 'move' }>(null);

  useEffect(() => {
    try {
      setOnlyMine(localStorage.getItem('mt-waiter-mine') === '1');
    } catch {}
  }, []);

  const hall = orders.filter((o) => o.type === 'hall' && o.tableNo && !['done', 'cancelled'].includes(o.status));
  const byTable = useMemo(() => new Map(hall.map((o) => [o.tableNo!, o])), [hall]);
  const tables = Array.from({ length: settings.tables || 0 }, (_, i) => i + 1).filter((n) => !onlyMine || byTable.get(n)?.waiterId === me.id || !byTable.get(n));
  const cur = orders.find((o) => o.id === sel) || null;

  // the check was paid or closed by the cashier while open here
  useEffect(() => {
    if (sel && cur && ['done', 'cancelled'].includes(cur.status)) {
      toast(cur.status === 'done' ? `Стол ${cur.tableNo}: оплачен` : `Стол ${cur.tableNo}: чек отменён`);
      setSel(null);
    }
  }, [sel, cur, toast]);

  async function openTable(n: number) {
    const ex = byTable.get(n);
    setAdding(true);
    if (ex) return setSel(ex.id);
    setBusy(true);
    try {
      const j = await api('/api/staff/orders', 'POST', { table: n, guests: 2, type: 'hall' });
      await refresh();
      setSel(j.id);
      setAdding(true);
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

  if (!cur)
    return (
      <div className="wt">
        <div className="wt-head">
          <h1>Столы</h1>
          <div className="seg">
            {[false, true].map((m) => (
              <button
                key={String(m)}
                className={onlyMine === m ? 'on' : ''}
                onClick={() => {
                  setOnlyMine(m);
                  try {
                    localStorage.setItem('mt-waiter-mine', m ? '1' : '0');
                  } catch {}
                }}
              >
                {m ? 'Мои и свободные' : 'Все'}
              </button>
            ))}
          </div>
        </div>
        <BookingsToday onSeat={(t) => t && openTable(t)} />
        {settings.tables ? (
          <div className="wt-tables">
            {tables.map((n) => {
              const o = byTable.get(n);
              const ready = o?.items.some((l) => l.ks === 'ready' && !l.void && o.status !== 'done');
              const bk = !o && bookingFor(bookings, n);
              return (
                <button key={n} className={`pos-table ${o ? 'busy' : ''} ${ready ? 'ready' : ''} ${o?.waiterId === me.id ? 'mine' : ''}`} onClick={() => openTable(n)} disabled={busy}>
                  <b>{n}</b>
                  <span className="num">{o ? `${fmt(o.total)} · ${ago(o.createdAt)}` : 'свободен'}</span>
                  {o && o.waiterId !== me.id && <span>{o.waiter || '—'}</span>}
                  {ready && <em>забрать с кухни</em>}
                  {bk && <em className="bk">бронь {bk.time} · {bk.guests}</em>}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="sx-muted">Столов нет. Управляющий задаёт их число в «Управление → Столы и QR».</p>
        )}
        <p className="sx-muted small" style={{ marginTop: 14 }}>
          Синяя рамка — ваши столы. Зелёный стол — на кухне что-то готово, заберите.
        </p>
      </div>
    );

  const live = cur.items.filter((l) => !l.void);
  const unsent = live.filter((l) => !l.sent && !l.hold).length;
  const held = live.filter((l) => !l.sent && l.hold).length;
  const ready = live.filter((l) => l.ks === 'ready').length;

  return (
    <div className="wt">
      <div className="wt-head">
        <button className="b sm" onClick={() => setSel(null)} aria-label="Ко всем столам">
          ← Столы
        </button>
        <h1>Стол {cur.tableNo}</h1>
        <div className="sx-step" aria-label="Гостей">
          <button onClick={() => run({ action: 'guests', guests: Math.max(0, cur.guests - 1) })} aria-label="Меньше гостей">
            −
          </button>
          <span className="num">{cur.guests} гост.</span>
          <button onClick={() => run({ action: 'guests', guests: cur.guests + 1 })} aria-label="Больше гостей">
            +
          </button>
        </div>
      </div>
      <div className="sx-row" style={{ marginBottom: 10 }}>
        <StatusChip o={cur} />
        <span className="sx-muted small">
          Чек № {cur.no} · {cur.waiter || 'без официанта'}
        </span>
        {cur.waiterId !== me.id && (
          <button className="b sm" onClick={() => run({ action: 'take' }, 'Стол теперь ваш')}>
            Взять стол себе
          </button>
        )}
        {ready > 0 && <span className="chip ok">готово к подаче: {ready}</span>}
      </div>

      {adding ? (
        <>
          <MenuPicker key={cur.id} o={cur} onAdd={(items) => act(cur.id, { action: 'add', items })} />
          <div className="wt-bottom">
            <button className="sx-btn ok grow" onClick={() => setAdding(false)}>
              Чек · {live.length} поз. · {fmt(cur.total)}
            </button>
            {(unsent > 0 || !held) && (
<button className="sx-btn primary" disabled={!unsent || busy} onClick={() => run({ action: 'send' }, 'Ушло на кухню')}>
              На кухню{unsent ? ` · ${unsent}` : ''}
            </button>
            )}
            <FireButtons o={cur} busy={busy} run={run} />
          </div>
        </>
      ) : (
        <>
          <Lines o={cur} busy={busy} onQty={(i, q) => run({ action: 'qty', line: i, qty: q })} onVoid={(i) => setModal({ k: 'void', line: i })} onCourse={(i, c) => run({ action: 'course', line: i, course: c }, 'Подаём сразу')} />
          <div style={{ margin: '12px 0' }}>
            <Totals o={cur} />
          </div>
          <button className="sx-btn wide" onClick={() => setAdding(true)}>
            + Добавить блюда
          </button>
          <div className="sx-row" style={{ justifyContent: 'space-between', margin: '14px 0' }}>
            <button className="sx-link" onClick={() => setModal({ k: 'move' })}>
              Пересадить
            </button>
            <button className="sx-link danger" onClick={() => setModal({ k: 'void', line: 'check' })}>
              Отменить чек
            </button>
          </div>
          <div className="wt-bottom">
            {(unsent > 0 || !held) && (
<button className="sx-btn primary grow" disabled={!unsent || busy} onClick={() => run({ action: 'send' }, 'Ушло на кухню')}>
              На кухню{unsent ? ` · ${unsent}` : ''}
            </button>
            )}
            <FireButtons o={cur} busy={busy} run={run} />
            {settings.printGuestChecks && (
              <button className="sx-btn" disabled={!live.length || busy || unsent > 0} onClick={() => run({ action: 'precheck' }, 'Пречек печатается на кассе')}>
                Счёт гостю
              </button>
            )}
          </div>
        </>
      )}

      {modal?.k === 'void' && <VoidModal o={cur as StaffOrder} line={modal.line} onClose={() => (setModal(null), modal.line === 'check' && setSel(null))} />}
      {modal?.k === 'move' && <MoveModal o={cur} onClose={() => setModal(null)} />}
    </div>
  );
}
