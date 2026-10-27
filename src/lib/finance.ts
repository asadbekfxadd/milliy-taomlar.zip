import 'server-only';
import { q } from './db';
import { currentShift, cashMove } from './shifts';
import { listIngredients, listRecipes, recipeFor, gross } from './stock';
import type { Menu } from './types';

/* Money: expenses, profit and loss for a month, staff sales, ABC×XYZ and dishes that do not sell. */

export const EXPENSE_CATS = ['Аренда', 'Зарплата', 'Коммунальные', 'Газ и уголь', 'Продукты вне склада', 'Хозтовары', 'Ремонт', 'Реклама', 'Налоги', 'Банк и эквайринг', 'Доставка и такси', 'Прочее'];
export const PAID_FROM: Record<string, string> = { cash: 'Из кассы', card: 'Картой', bank: 'С расчётного счёта' };

export type Expense = { id: number; day: string; cat: string; amount: number; note: string; from: string; by: string; at: string };

const T = `COALESCE(o.paid_at, o.updated_at)`;
const n = (v: unknown) => Number(v) || 0;

/** "2026-10" → first day and the day after the last, as Tashkent timestamps. */
export function monthRange(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const a = new Date(Date.UTC(y, m - 1, 1) - 5 * 3600_000).toISOString();
  const z = new Date(Date.UTC(y, m, 1) - 5 * 3600_000).toISOString();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { a, z, days, first: `${ym}-01`, last: `${ym}-${String(days).padStart(2, '0')}` };
}

export const thisMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date()).slice(0, 7);

export async function listExpenses(ym: string): Promise<Expense[]> {
  const { first, last } = monthRange(ym);
  const r = await q(`SELECT *, day::text AS d FROM expenses WHERE day BETWEEN $1 AND $2 ORDER BY day DESC, id DESC`, [first, last]);
  return r.rows.map((x) => ({ id: x.id, day: x.d, cat: x.cat, amount: n(x.amount), note: x.note, from: x.paid_from, by: x.by_name, at: new Date(x.created_at).toISOString() }));
}

/** An expense paid from the till also leaves the open shift as a cash withdrawal, so the drawer reconciles. */
export async function addExpense(d: { day: string; cat: string; amount: number; note: string; from: string }, by: string) {
  let shiftId: number | null = null;
  if (d.from === 'cash') {
    const s = await currentShift();
    if (s) {
      shiftId = s.id;
      await cashMove(s.id, 'out', d.amount, `расход: ${d.cat}${d.note ? ' · ' + d.note : ''}`, by);
    }
  }
  const r = await q(`INSERT INTO expenses (day, cat, amount, note, paid_from, shift_id, by_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, [d.day, d.cat, d.amount, d.note, d.from, shiftId, by]);
  return { id: r.rows[0].id as number, shiftId };
}

export async function deleteExpense(id: number) {
  const r = await q(`DELETE FROM expenses WHERE id = $1 RETURNING shift_id, amount, cat`, [id]);
  return r.rows[0] || null;
}

/** Copy last month's regular expenses (rent, salary…) as a starting point. */
export async function copyRegular(ym: string, by: string) {
  const [y, m] = ym.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const src = (await listExpenses(prev)).filter((e) => ['Аренда', 'Зарплата', 'Коммунальные', 'Налоги', 'Реклама'].includes(e.cat));
  for (const e of src) await q(`INSERT INTO expenses (day, cat, amount, note, paid_from, by_name) VALUES ($1, $2, $3, $4, $5, $6)`, [`${ym}-01`, e.cat, e.amount, e.note, e.from === 'cash' ? 'bank' : e.from, by]);
  return src.length;
}

/** Profit and loss for a month. Food cost = what the stock really lost to sales (moves "sale"/"return"). */
export async function pnl(ym: string) {
  const { a, z, first, last } = monthRange(ym);
  const [rev, moves, exp, buys, pays] = await Promise.all([
    q(
      `SELECT COALESCE(sum(total),0)::bigint AS total, COALESCE(sum(fee),0)::bigint AS fee, COALESCE(sum(service),0)::bigint AS service,
              COALESCE(sum(subtotal),0)::bigint AS dishes, COALESCE(sum(discount + deal_discount),0)::bigint AS disc, COALESCE(sum(points_used),0)::bigint AS points,
              COALESCE(sum(tips),0)::bigint AS tips, count(*)::int AS checks
         FROM orders o WHERE status = 'done' AND ${T} >= $1 AND ${T} < $2`,
      [a, z],
    ),
    q(
      `SELECT kind, COALESCE(sum(-qty * price),0) AS v FROM stock_moves WHERE created_at >= $1 AND created_at < $2 AND kind IN ('sale','return','writeoff','adjust') GROUP BY kind`,
      [a, z],
    ),
    q(`SELECT cat, sum(amount)::bigint AS v FROM expenses WHERE day BETWEEN $1 AND $2 GROUP BY cat ORDER BY 2 DESC`, [first, last]),
    q(`SELECT COALESCE(sum(total),0)::bigint AS v, COALESCE(sum(total) FILTER (WHERE NOT paid),0)::bigint AS unpaid FROM purchases WHERE status = 'received' AND received_at >= $1 AND received_at < $2`, [a, z]),
    q(`SELECT COALESCE(NULLIF(paid_with,''), pay) AS k, sum(total)::bigint AS v FROM orders o WHERE status = 'done' AND ${T} >= $1 AND ${T} < $2 GROUP BY 1`, [a, z]),
  ]);
  const r = rev.rows[0];
  const mv = Object.fromEntries(moves.rows.map((x) => [x.kind, n(x.v)]));
  const revenue = n(r.total);
  const food = (mv.sale || 0) + (mv.return || 0);
  const writeoff = mv.writeoff || 0;
  const shortage = mv.adjust || 0; // positive = lost at the count
  const gross = revenue - food - writeoff - shortage;
  const expenses = exp.rows.map((x) => ({ cat: x.cat as string, v: n(x.v) }));
  const expTotal = expenses.reduce((s, e) => s + e.v, 0);
  return {
    revenue,
    checks: r.checks as number,
    dishes: n(r.dishes),
    fee: n(r.fee),
    service: n(r.service),
    discounts: n(r.disc),
    points: n(r.points),
    tips: n(r.tips),
    food,
    writeoff,
    shortage,
    gross,
    expenses,
    expTotal,
    net: gross - expTotal,
    bought: n(buys.rows[0].v),
    unpaidBuys: n(buys.rows[0].unpaid),
    byPay: pays.rows.map((x) => ({ k: x.k as string, v: n(x.v) })),
  };
}

/** Sales per person: waiters by tables, cashiers by payments taken, couriers by deliveries; plus voids they made. */
export async function staffReport(a: string, z: string) {
  const [w, c, cr, v] = await Promise.all([
    q(
      `SELECT waiter AS k, count(*)::int AS n, sum(total)::bigint AS v, COALESCE(sum(tips),0)::bigint AS tips, COALESCE(sum(guests),0)::int AS guests
         FROM orders o WHERE status = 'done' AND waiter <> '' AND ${T} >= $1 AND ${T} < $2 GROUP BY 1 ORDER BY 3 DESC`,
      [a, z],
    ),
    q(`SELECT cashier AS k, count(*)::int AS n, sum(total)::bigint AS v FROM orders o WHERE status = 'done' AND cashier <> '' AND ${T} >= $1 AND ${T} < $2 GROUP BY 1 ORDER BY 3 DESC`, [a, z]),
    q(
      `SELECT courier AS k, count(*)::int AS n, sum(total)::bigint AS v,
              avg(extract(epoch FROM delivered_at - picked_at) / 60)::int AS mins
         FROM orders o WHERE status = 'done' AND courier <> '' AND delivered_at >= $1 AND delivered_at < $2 GROUP BY 1 ORDER BY 2 DESC`,
      [a, z],
    ),
    q(
      `SELECT l->'void'->>'by' AS k, count(*)::int AS n, sum((l->>'unit')::bigint * (l->>'qty')::int)::bigint AS v
         FROM orders o, jsonb_array_elements(o.items) l
        WHERE l->'void' IS NOT NULL AND o.updated_at >= $1 AND o.updated_at < $2 GROUP BY 1`,
      [a, z],
    ),
  ]);
  const voids = Object.fromEntries(v.rows.map((x) => [x.k, { n: x.n, v: n(x.v) }]));
  return {
    waiters: w.rows.map((x) => ({ k: x.k as string, n: x.n as number, v: n(x.v), tips: n(x.tips), guests: x.guests as number })),
    cashiers: c.rows.map((x) => ({ k: x.k as string, n: x.n as number, v: n(x.v) })),
    couriers: cr.rows.map((x) => ({ k: x.k as string, n: x.n as number, v: n(x.v), mins: x.mins as number | null })),
    voids: voids as Record<string, { n: number; v: number }>,
  };
}

/** ABC by revenue (A = first 80%, B = next 15%, C = the rest) and XYZ by how steady weekly sales are
    (coefficient of variation: X ≤ 25%, Y ≤ 50%, Z above). */
export async function abcxyz(weeks: number, menu: Menu) {
  const r = await q(
    `SELECT l->>'id' AS id, max(l->>'name') AS name, floor(extract(epoch FROM now() - ${T}) / 604800)::int AS w,
            sum((l->>'qty')::int)::int AS qty, sum((l->>'unit')::bigint * (l->>'qty')::int)::bigint AS v
       FROM orders o, jsonb_array_elements(o.items) l
      WHERE o.status = 'done' AND l->'void' IS NULL AND ${T} > now() - make_interval(weeks => $1)
      GROUP BY 1, 3`,
    [weeks],
  );
  const by = new Map<string, { qty: number[]; v: number; name: string }>();
  for (const x of r.rows) {
    const cur = by.get(x.id) || { qty: Array(weeks).fill(0), v: 0, name: x.name || x.id };
    if (x.w >= 0 && x.w < weeks) cur.qty[x.w] += x.qty;
    cur.v += n(x.v);
    by.set(x.id, cur);
  }
  const total = [...by.values()].reduce((s, x) => s + x.v, 0);
  let run = 0;
  return [...by.entries()]
    .sort((a, b) => b[1].v - a[1].v)
    .map(([id, x]) => {
      run += x.v;
      const share = total ? run / total : 1;
      const abc = share <= 0.8 || run === x.v ? 'A' : share <= 0.95 ? 'B' : 'C';
      const mean = x.qty.reduce((s, q) => s + q, 0) / weeks;
      const sd = Math.sqrt(x.qty.reduce((s, q) => s + (q - mean) ** 2, 0) / weeks);
      const cv = mean ? sd / mean : 9;
      const xyz = cv <= 0.25 ? 'X' : cv <= 0.5 ? 'Y' : 'Z';
      const d = menu.dishes.find((m) => m.id === id);
      return { id, name: d?.ru || d?.name || x.name, v: x.v, qty: x.qty.reduce((s, q) => s + q, 0), share: total ? x.v / total : 0, abc, xyz, cv: Math.round(cv * 100), weekly: [...x.qty].reverse() };
    });
}

/** Dishes on the menu that sold nothing for `days`, with the last sale date if any. */
export async function unsold(days: number, menu: Menu) {
  const r = await q(
    `SELECT l->>'id' AS id, max(${T}) AS last,
            sum((l->>'qty')::int) FILTER (WHERE ${T} > now() - make_interval(days => $1))::int AS recent
       FROM orders o, jsonb_array_elements(o.items) l
      WHERE o.status = 'done' AND l->'void' IS NULL GROUP BY 1`,
    [days],
  );
  const m = new Map(r.rows.map((x) => [x.id as string, { last: x.last ? new Date(x.last).toISOString() : null, recent: x.recent || 0 }]));
  return menu.dishes
    .filter((d) => !d.hidden && menu.cats.some((c) => c.id === d.cat) && (d.price > 0 || d.sizes.some((s) => s.p > 0)))
    .filter((d) => !((m.get(d.id)?.recent || 0) > 0))
    .map((d) => ({ id: d.id, name: d.ru || d.name, cat: menu.cats.find((c) => c.id === d.cat)?.ru || '', available: d.available, last: m.get(d.id)?.last || null }));
}

/** Food cost of one portion from the recipe, gross amounts and today's average prices. */
export async function costing(menu: Menu, dishId: string) {
  const [recipes, ings] = await Promise.all([listRecipes(), listIngredients(true)]);
  const d = menu.dishes.find((x) => x.id === dishId);
  if (!d) return null;
  const im = new Map(ings.map((i) => [i.id, i]));
  const portions = d.sizes.length ? d.sizes.map((s, i) => ({ si: i, label: s.label, w: s.w, price: s.p })) : [{ si: -1, label: '', w: d.weight, price: d.price }];
  return {
    dish: { id: d.id, name: d.ru || d.name, cat: menu.cats.find((c) => c.id === d.cat)?.ru || '' },
    portions: portions.map((p) => {
      const r = recipeFor(recipes, d.id, p.si >= 0 ? p.si : undefined);
      const lines = (r?.lines || []).map((l) => {
        const i = im.get(l.ing);
        const g = gross(l.qty, i?.yield || 100);
        return { name: i?.name || '?', unit: i?.unit || '', net: l.qty, gross: g, yield: i?.yield || 100, price: i?.cost || 0, sum: g * (i?.cost || 0) };
      });
      const cost = lines.reduce((s, l) => s + l.sum, 0);
      return { ...p, lines, cost, hasRecipe: Boolean(r) };
    }),
  };
}
