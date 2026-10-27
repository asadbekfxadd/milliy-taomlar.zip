import 'server-only';
import { newId, q } from './db';
import { listIngredients, receive } from './stock';

/* Suppliers and purchase orders: draft → ordered (sent to the supplier) → received (goes into stock). */

export type Supplier = { id: string; name: string; phone: string; note: string; active: boolean };
export type PLine = { ing: string; qty: number; price: number };
export type Purchase = {
  id: number;
  supplierId: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  note: string;
  lines: PLine[];
  total: number;
  paid: boolean;
  createdBy: string;
  receivedBy: string;
  createdAt: string;
  orderedAt: string | null;
  receivedAt: string | null;
};

const n = (v: unknown) => Number(v) || 0;
const mapS = (r: any): Supplier => ({ id: r.id, name: r.name, phone: r.phone, note: r.note, active: r.active });
const mapP = (r: any): Purchase => ({
  id: r.id,
  supplierId: r.supplier_id,
  status: r.status,
  note: r.note,
  lines: (r.lines || []).map((l: any) => ({ ing: String(l.ing), qty: n(l.qty), price: n(l.price) })),
  total: n(r.total),
  paid: r.paid,
  createdBy: r.created_by,
  receivedBy: r.received_by,
  createdAt: new Date(r.created_at).toISOString(),
  orderedAt: r.ordered_at ? new Date(r.ordered_at).toISOString() : null,
  receivedAt: r.received_at ? new Date(r.received_at).toISOString() : null,
});
const total = (lines: PLine[]) => Math.round(lines.reduce((s, l) => s + l.qty * l.price, 0));

export async function listSuppliers(all = true) {
  const r = await q(`SELECT * FROM suppliers ${all ? '' : 'WHERE active'} ORDER BY active DESC, name`);
  return r.rows.map(mapS);
}

export async function saveSupplier(d: { id?: string; name: string; phone?: string; note?: string; active?: boolean }) {
  if (d.id) {
    await q(`UPDATE suppliers SET name = $2, phone = $3, note = $4, active = $5 WHERE id = $1`, [d.id, d.name, d.phone || '', d.note || '', d.active ?? true]);
    return d.id;
  }
  const id = newId();
  await q(`INSERT INTO suppliers (id, name, phone, note) VALUES ($1, $2, $3, $4)`, [id, d.name, d.phone || '', d.note || '']);
  return id;
}

export async function listPurchases(days = 90) {
  const r = await q(`SELECT * FROM purchases WHERE created_at > now() - make_interval(days => $1) OR status IN ('draft','ordered') ORDER BY id DESC LIMIT 300`, [days]);
  return r.rows.map(mapP);
}

export async function getPurchase(id: number) {
  const r = await q(`SELECT * FROM purchases WHERE id = $1`, [id]);
  return r.rows[0] ? mapP(r.rows[0]) : null;
}

export async function createPurchase(supplierId: string, lines: PLine[], note: string, by: string) {
  const r = await q(`INSERT INTO purchases (supplier_id, lines, total, note, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`, [supplierId, JSON.stringify(lines), total(lines), note, by]);
  return mapP(r.rows[0]);
}

export async function updatePurchase(id: number, d: { lines?: PLine[]; note?: string; supplierId?: string; paid?: boolean; status?: Purchase['status'] }) {
  const cur = await getPurchase(id);
  if (!cur) return null;
  const lines = d.lines ?? cur.lines;
  const r = await q(
    `UPDATE purchases SET lines = $2, total = $3, note = $4, supplier_id = $5, paid = $6, status = $7,
       ordered_at = CASE WHEN $7 = 'ordered' AND ordered_at IS NULL THEN now() ELSE ordered_at END
     WHERE id = $1 RETURNING *`,
    [id, JSON.stringify(lines), total(lines), d.note ?? cur.note, d.supplierId ?? cur.supplierId, d.paid ?? cur.paid, d.status ?? cur.status],
  );
  return mapP(r.rows[0]);
}

/** Goods arrived: put every line into stock (the average cost is recalculated) and close the order. */
export async function receivePurchase(id: number, lines: PLine[], by: string, supplierName: string) {
  const claim = await q(`UPDATE purchases SET status = 'received', received_at = now(), received_by = $2, lines = $3, total = $4 WHERE id = $1 AND status IN ('draft','ordered') RETURNING *`, [
    id,
    by,
    JSON.stringify(lines),
    total(lines),
  ]);
  if (!claim.rows[0]) return null;
  for (const l of lines) if (l.qty > 0) await receive(l.ing, l.qty, l.price, `закупка № ${id}${supplierName ? ' · ' + supplierName : ''}`, by);
  return mapP(claim.rows[0]);
}

/** What to buy: products at or below the minimum, up to the "order up to" level (or twice the minimum). */
export async function suggestion() {
  const ings = (await listIngredients()).filter((i) => !i.isPrep && i.min > 0 && i.stock <= i.min);
  return ings.map((i) => {
    const target = i.par > i.min ? i.par : i.min * 2;
    return { ing: i.id, name: i.name, unit: i.unit, supplierId: i.supplierId, stock: i.stock, qty: Math.max(0, +(target - i.stock).toFixed(3)), price: Math.round(i.cost) };
  });
}

/** Unpaid received purchases per supplier = what we owe. */
export async function debts() {
  const r = await q(`SELECT supplier_id, sum(total)::bigint AS s, count(*)::int AS n FROM purchases WHERE status = 'received' AND NOT paid GROUP BY supplier_id`);
  return Object.fromEntries(r.rows.map((x) => [x.supplier_id, { sum: Number(x.s), n: x.n }]));
}
