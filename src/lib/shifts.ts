import 'server-only';
import { q } from './db';
import type { OrderItem } from './types';

/* Cash-desk shift: opened with the cash in the drawer, closed with the counted cash.
   The report is built from checks paid during the shift, so it always matches the orders. */

export type Shift = { id: number; openedAt: string; openedBy: string; openingCash: number; closedAt: string | null; closedBy: string; countedCash: number | null; report: ShiftReport | null };
export type ShiftReport = {
  checks: number;
  revenue: number;
  byMethod: Record<string, number>;
  tips: number;
  tipsByMethod: Record<string, number>;
  tipsByWaiter: Record<string, number>;
  service: number;
  discount: number;
  avg: number;
  guests: number;
  cancelled: number;
  voids: number;
  voidSum: number;
  cashIn: number;
  cashOut: number;
  moves: { kind: string; amount: number; note: string; by: string; at: string }[];
  expectedCash: number;
  byType: Record<string, number>;
};

const map = (r: any): Shift => ({
  id: r.id,
  openedAt: new Date(r.opened_at).toISOString(),
  openedBy: r.opened_by,
  openingCash: r.opening_cash,
  closedAt: r.closed_at ? new Date(r.closed_at).toISOString() : null,
  closedBy: r.closed_by,
  countedCash: r.counted_cash,
  report: r.report,
});

export async function currentShift() {
  const r = await q('SELECT * FROM shifts WHERE closed_at IS NULL ORDER BY id DESC LIMIT 1');
  return r.rows[0] ? map(r.rows[0]) : null;
}

export async function getShift(id: number) {
  const r = await q('SELECT * FROM shifts WHERE id = $1', [id]);
  return r.rows[0] ? map(r.rows[0]) : null;
}

export async function listShifts(limit = 60) {
  const r = await q('SELECT * FROM shifts ORDER BY id DESC LIMIT $1', [limit]);
  return r.rows.map(map);
}

export async function openShift(by: string, cash: number) {
  try {
    const r = await q('INSERT INTO shifts (opened_by, opening_cash) VALUES ($1, $2) RETURNING *', [by, cash]);
    return map(r.rows[0]);
  } catch {
    return null; // another shift is already open (unique index)
  }
}

export async function cashMove(shiftId: number, kind: 'in' | 'out', amount: number, note: string, by: string) {
  await q('INSERT INTO cash_moves (shift_id, kind, amount, note, by_name) VALUES ($1, $2, $3, $4, $5)', [shiftId, kind, amount, note, by]);
}

export async function buildReport(s: Shift): Promise<ShiftReport> {
  const to = s.closedAt || new Date().toISOString();
  const [paid, cancelled, moves] = await Promise.all([
    q(`SELECT * FROM orders WHERE status = 'done' AND paid_at >= $1 AND paid_at <= $2`, [s.openedAt, to]),
    q(`SELECT count(*)::int AS n FROM orders WHERE status = 'cancelled' AND updated_at >= $1 AND updated_at <= $2 AND source = 'pos'`, [s.openedAt, to]),
    q(`SELECT * FROM cash_moves WHERE shift_id = $1 ORDER BY id`, [s.id]),
  ]);
  const rep: ShiftReport = {
    checks: 0, revenue: 0, byMethod: {}, tips: 0, tipsByMethod: {}, tipsByWaiter: {}, service: 0, discount: 0, avg: 0, guests: 0,
    cancelled: cancelled.rows[0]?.n || 0, voids: 0, voidSum: 0, cashIn: 0, cashOut: 0, moves: [], expectedCash: 0, byType: {},
  };
  for (const o of paid.rows) {
    const m = o.paid_with || o.pay || 'cash';
    rep.checks++;
    rep.revenue += o.total;
    rep.byMethod[m] = (rep.byMethod[m] || 0) + o.total;
    rep.byType[o.type] = (rep.byType[o.type] || 0) + o.total;
    rep.service += o.service || 0;
    rep.discount += o.discount || 0;
    rep.guests += o.guests || 0;
    if (o.tips) {
      rep.tips += o.tips;
      rep.tipsByMethod[m] = (rep.tipsByMethod[m] || 0) + o.tips;
      const w = o.waiter || 'без официанта';
      rep.tipsByWaiter[w] = (rep.tipsByWaiter[w] || 0) + o.tips;
    }
    for (const l of (o.items || []) as OrderItem[])
      if (l.void) {
        rep.voids += l.qty;
        rep.voidSum += l.unit * l.qty;
      }
  }
  for (const mv of moves.rows) {
    if (mv.kind === 'in') rep.cashIn += mv.amount;
    else rep.cashOut += mv.amount;
    rep.moves.push({ kind: mv.kind, amount: mv.amount, note: mv.note, by: mv.by_name, at: new Date(mv.created_at).toISOString() });
  }
  rep.avg = rep.checks ? Math.round(rep.revenue / rep.checks) : 0;
  rep.expectedCash = s.openingCash + (rep.byMethod.cash || 0) + (rep.tipsByMethod.cash || 0) + rep.cashIn - rep.cashOut;
  return rep;
}

export async function closeShift(s: Shift, by: string, counted: number) {
  const closedAt = new Date().toISOString();
  const rep = await buildReport({ ...s, closedAt });
  const r = await q('UPDATE shifts SET closed_at = $2, closed_by = $3, counted_cash = $4, report = $5 WHERE id = $1 AND closed_at IS NULL RETURNING *', [s.id, closedAt, by, counted, JSON.stringify(rep)]);
  return r.rows[0] ? map(r.rows[0]) : null;
}

const PAY: Record<string, string> = { cash: 'Наличные', card: 'Карта', payme: 'Payme', click: 'Click' };
const f = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');

/** Rows for the paper report (X-report while open, Z-report when closed). */
export function reportRows(s: Shift, r: ShiftReport): [string, string, boolean?][] {
  const rows: [string, string, boolean?][] = [
    ['Чеков', String(r.checks)],
    ['Выручка', f(r.revenue), true],
    ...Object.entries(r.byMethod).map(([k, v]) => ['  ' + (PAY[k] || k), f(v)] as [string, string]),
    ['Средний чек', f(r.avg)],
    ['Обслуживание', f(r.service)],
    ['Скидки', f(r.discount)],
    ['-', ''],
    ['Чаевые', f(r.tips)],
    ...Object.entries(r.tipsByWaiter).map(([k, v]) => ['  ' + k, f(v)] as [string, string]),
    ['-', ''],
    ['Отмены после кухни', `${r.voids} шт · ${f(r.voidSum)}`],
    ['Отменённые чеки', String(r.cancelled)],
    ['-', ''],
    ['Наличные на начало', f(s.openingCash)],
    ['Внесения', f(r.cashIn)],
    ['Изъятия', f(r.cashOut)],
    ['Ожидается в кассе', f(r.expectedCash), true],
  ];
  if (s.countedCash !== null) {
    rows.push(['Посчитано', f(s.countedCash), true]);
    const d = s.countedCash - r.expectedCash;
    rows.push([d === 0 ? 'Расхождения нет' : d > 0 ? 'Излишек' : 'Недостача', f(Math.abs(d)), true]);
  }
  return rows;
}
