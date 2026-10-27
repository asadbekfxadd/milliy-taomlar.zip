import 'server-only';
import type { Menu, OrderItem, Settings } from './types';
import { getOrder, mapOrder, q, setOrderStatus, type OrderRow } from './db';
import { notifyNewOrder, refreshOrderMessage } from './telegram';
import { etaText, paidText, stageText, tellGuest } from './notify';
import { modsOf, unitPrice } from './pricing';
import { deductForOrder, returnForOrder } from './stock';
import { STATIONS as ST } from './rbac';

/* Restaurant floor logic shared by the waiter screen, online orders, kitchen screen and print station. */

export const STATIONS = ST;
const live = (items: OrderItem[]) => items.filter((l) => !l.void);

export function stationOf(menu: Menu, st: Settings, dishId: string) {
  const d = menu.dishes.find((x) => x.id === dishId);
  return (d && st.catStations?.[d.cat]) || 'kitchen';
}

/** Price a requested line from the stored menu; returns null when the dish or option is invalid. */
export const COURSE_RU: Record<number, string> = { 1: 'Сразу', 2: 'Горячее', 3: 'Десерт' };

export function priceLine(menu: Menu, st: Settings, i: { id: string; si: number; ex: number[]; qty: number; note?: string; course?: 1 | 2 | 3 }): OrderItem | string {
  const d = menu.dishes.find((x) => x.id === i.id);
  if (!d || !menu.cats.some((c) => c.id === d.cat)) return 'Блюда нет в меню';
  if (!d.available) return `«${d.name}» сейчас нет в наличии`;
  if (d.sizes.length ? i.si >= d.sizes.length : i.si !== 0) return 'Неверный размер порции';
  const ex = [...new Set(i.ex)];
  if (ex.some((x) => x >= d.extras.length)) return 'Неверная добавка';
  const unit = unitPrice(d, i.si, ex);
  if (unit <= 0) return `У «${d.name}» не указана цена — добавьте её в управлении`;
  return { id: d.id, name: d.name, mods: modsOf(d, i.si, ex).join(', '), qty: i.qty, unit, sum: unit * i.qty, note: i.note || '', station: stationOf(menu, st, d.id), sent: false, ks: null, si: d.sizes.length ? i.si : undefined, ...(i.course && i.course > 1 ? { course: i.course, hold: true } : {}) };
}

export function totals(o: { type: string; fee: number; items: OrderItem[]; promoPct?: number; promoFixed?: number }, st: Settings) {
  const subtotal = live(o.items).reduce((s, l) => s + l.unit * l.qty, 0);
  const service = o.type === 'hall' ? Math.round((subtotal * (st.servicePct || 0)) / 100) : 0;
  // a promo applied at checkout follows later changes: percent is recalculated, a fixed sum never exceeds the dishes
  const discount = o.promoPct ? Math.round((subtotal * o.promoPct) / 100) : Math.min(o.promoFixed || 0, subtotal);
  return { subtotal, service, discount, total: subtotal + service + (o.fee || 0) - discount };
}

export async function saveItems(o: OrderRow, items: OrderItem[], st: Settings, extra: Record<string, unknown> = {}) {
  items.forEach((l) => (l.sum = l.unit * l.qty));
  const t = totals({ type: o.type, fee: o.fee, items, promoPct: o.promoPct, promoFixed: o.promoFixed }, st);
  const keys = Object.keys(extra);
  const sets = keys.map((k, i) => `${k} = $${i + 7}`).join(', ');
  const r = await q(
    `UPDATE orders SET items = $2, subtotal = $3, service = $4, total = $5, discount = $6, updated_at = now()${sets ? ', ' + sets : ''} WHERE id = $1 RETURNING *`,
    [o.id, JSON.stringify(items), t.subtotal, t.service, t.total, t.discount, ...keys.map((k) => extra[k])],
  );
  const saved = mapOrder(r.rows[0]);
  await afterChange(o, saved, st);
  return saved;
}

/** One place that reacts to a status change: tells the guest and refreshes the staff Telegram card. */
export async function afterChange(prev: OrderRow, next: OrderRow, st: Settings) {
  if (prev.status === next.status) return;
  try {
    if (next.status === 'done') await deductForOrder(next.id, next.no);
    else if (prev.status === 'done') await returnForOrder(next.id, next.no);
  } catch (e) {
    console.error('stock', e);
  }
  try {
    await tellGuest(next, stageText(next, st.phone));
    if (next.source === 'site') await refreshOrderMessage(next);
  } catch (e) {
    console.error('afterChange', e);
  }
}

export async function updateStatus(id: string, status: string, st: Settings) {
  const prev = await getOrder(id);
  if (!prev) return null;
  const next = await setOrderStatus(id, status);
  if (next) await afterChange(prev, next, st);
  return next;
}

export async function adjustEta(o: OrderRow, minutes: number) {
  const r = await q(`UPDATE orders SET eta_at = COALESCE(eta_at, now()) + make_interval(mins => $2), updated_at = now() WHERE id = $1 RETURNING *`, [o.id, minutes]);
  const next = mapOrder(r.rows[0]);
  await tellGuest(next, etaText(next)).catch(() => {});
  return next;
}

/** A provider confirmed the money: mark paid, tell staff and guest, and (if enabled) send to the kitchen. */
export async function markPaid(orderId: string, provider: string, st: Settings) {
  const r = await q(
    `UPDATE orders SET pay_status = 'paid', paid_with = $2, paid_at = now(), updated_at = now() WHERE id = $1 RETURNING *`,
    [orderId, provider],
  );
  let o = r.rows[0] ? mapOrder(r.rows[0]) : null;
  if (!o) return null;
  await tellGuest(o, paidText(o)).catch(() => {});
  if (!o.tgMessageId) {
    const mid = await notifyNewOrder(o).catch(() => null);
    if (mid) await q('UPDATE orders SET tg_message_id = $2 WHERE id = $1', [o.id, mid]);
  } else await refreshOrderMessage(o).catch(() => {});
  if (st.autoAcceptOnline && o.status === 'new') o = (await sendToKitchen(o, st, { slip: true })).order;
  return o;
}

/** Where the order is going, as printed on tickets: "Стол 7", "Онлайн · Доставка". */
export function placeLabel(o: OrderRow) {
  if (o.type === 'hall') return o.tableNo ? `Стол ${o.tableNo}` : 'Зал';
  const kind = o.type === 'delivery' ? 'Доставка' : 'С собой';
  return o.source === 'site' ? `Онлайн · ${kind}` : kind;
}

type Job = { station: string; kind: string; orderId: string; body: unknown };
async function enqueue(jobs: Job[]) {
  for (const j of jobs) await q('INSERT INTO print_jobs (station, kind, order_id, body) VALUES ($1, $2, $3, $4)', [j.station, j.kind, j.orderId, JSON.stringify(j.body)]);
}

/** Send every unsent line to its station: marks lines as queued for the kitchen screen and prints a runner per station.
    Held courses (hot, dessert) stay until they are fired with `course`. */
export async function sendToKitchen(o: OrderRow, st: Settings, opts: { slip?: boolean; course?: 2 | 3 } = {}) {
  const items: OrderItem[] = (o.items as OrderItem[]).map((l) => ({ ...l }));
  if (opts.course) items.forEach((l) => !l.sent && !l.void && l.course === opts.course && (l.hold = false));
  const fresh = items.map((l, i) => ({ l, i })).filter(({ l }) => !l.sent && !l.void && !l.hold);
  const isAddition = items.some((l) => l.sent);
  if (!fresh.length) return { order: o, sent: 0 };
  const now = Date.now();
  fresh.forEach(({ l }) => {
    l.sent = true;
    l.ks = 'queued';
    l.at = now;
  });
  const status = ['new', 'accepted'].includes(o.status) ? 'accepted' : o.status === 'ready' ? 'cooking' : o.status;
  const extra: Record<string, unknown> = { status };
  if (!o.acceptedAt) {
    const mins = (st.prepMinutes || 25) + (o.type === 'delivery' ? st.deliveryMinutes || 0 : 0);
    extra.accepted_at = new Date(now).toISOString();
    extra.eta_at = new Date(now + mins * 60000).toISOString();
  }
  const saved = await saveItems(o, items, st, extra);
  const byStation = new Map<string, OrderItem[]>();
  fresh.forEach(({ l }) => byStation.set(l.station || 'kitchen', [...(byStation.get(l.station || 'kitchen') || []), l]));
  const jobs: Job[] = [...byStation].map(([station, lines]) => ({
    station,
    kind: 'runner',
    orderId: o.id,
    body: { add: isAddition, course: opts.course ? COURSE_RU[opts.course] : '', held: items.filter((l) => l.hold && !l.void).length, title: STATIONS[station] || station, place: placeLabel(saved), no: saved.no, waiter: saved.waiter, guests: saved.guests, when: saved.when, at: now, lines: lines.map(({ name, mods, qty, note }) => ({ name, mods, qty, note })) },
  }));
  if (opts.slip && st.printGuestChecks) jobs.push({ station: 'cashier', kind: 'online', orderId: o.id, body: checkBody(saved, st, 'online') });
  await enqueue(jobs);
  return { order: saved, sent: fresh.length };
}

export function checkBody(o: OrderRow, st: Settings, kind: 'precheck' | 'receipt' | 'online') {
  return {
    kind,
    brand: st.name,
    address: [st.address, st.city].filter(Boolean).join(', '),
    phone: st.phone,
    place: placeLabel(o),
    no: o.no,
    waiter: o.waiter,
    guests: o.guests,
    at: Date.now(),
    lines: live(o.items as OrderItem[]).map(({ name, mods, qty, unit, sum }) => ({ name, mods, qty, unit, sum })),
    subtotal: o.subtotal,
    service: o.service,
    servicePct: st.servicePct,
    fee: o.fee,
    discount: o.discount,
    promo: o.promo,
    total: o.total,
    tips: o.tips,
    pay: o.paidWith || o.pay,
    customer: o.source === 'site' ? { name: o.name, phone: o.phone, address: o.address, zone: o.zone, when: o.when, note: o.note } : null,
  };
}

export async function printCheck(o: OrderRow, st: Settings, kind: 'precheck' | 'receipt') {
  await enqueue([{ station: 'cashier', kind, orderId: o.id, body: checkBody(o, st, kind) }]);
}

/** Kitchen screen moves lines forward; the order follows its lines (cooking → ready). */
export async function kitchenMove(id: string, lineIdx: number[], to: 'cooking' | 'ready', st: Settings) {
  const o = await getOrder(id);
  if (!o) return null;
  const items: OrderItem[] = (o.items as OrderItem[]).map((l) => ({ ...l }));
  lineIdx.forEach((i) => {
    const l = items[i];
    if (l && l.sent && l.ks !== 'ready') l.ks = to;
  });
  const sent = items.filter((l) => l.sent && !l.void);
  let status = o.status;
  if (!['done', 'cancelled'].includes(o.status)) {
    if (sent.length && sent.every((l) => l.ks === 'ready')) status = 'ready';
    else if (sent.some((l) => l.ks === 'cooking' || l.ks === 'ready')) status = 'cooking';
  }
  return saveItems(o, items, st, { status });
}

/** Cancel a line that already went to the kitchen: it stays on the check struck through, the station gets an "ОТМЕНА" slip. */
export async function voidLine(o: OrderRow, idx: number, qty: number, reason: string, by: string, st: Settings) {
  const items: OrderItem[] = (o.items as OrderItem[]).map((l) => ({ ...l }));
  const l = items[idx];
  if (!l || l.void || !l.sent) return null;
  const n = Math.max(1, Math.min(qty, l.qty));
  const mark = { by, reason, at: Date.now() };
  if (n < l.qty) {
    l.qty -= n;
    items.splice(idx + 1, 0, { ...l, qty: n, sum: l.unit * n, void: mark });
  } else l.void = mark;
  const saved = await saveItems(o, items, st);
  // the order may now be fully ready / empty
  const sent = items.filter((x) => x.sent && !x.void);
  if (sent.length && sent.every((x) => x.ks === 'ready') && ['accepted', 'cooking'].includes(saved.status)) await setOrderStatus(o.id, 'ready');
  await enqueue([
    {
      station: l.station || 'kitchen',
      kind: 'runner',
      orderId: o.id,
      body: { cancel: true, reason, title: STATIONS[l.station || 'kitchen'] || 'Кухня', place: placeLabel(saved), no: saved.no, waiter: saved.waiter, at: Date.now(), lines: [{ name: l.name, mods: l.mods, qty: n, note: '' }] },
    },
  ]);
  return (await getOrder(o.id))!;
}

export async function openOrders() {
  const r = await q(
    `SELECT * FROM orders
      WHERE (status NOT IN ('done','cancelled') OR updated_at > now() - interval '20 minutes')
        AND NOT (status = 'new' AND pay_status IN ('pending','failed') AND created_at < now() - interval '3 hours')
      ORDER BY created_at ASC LIMIT 300`,
  );
  return r.rows.map(mapOrder);
}
