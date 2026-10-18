import 'server-only';
import { q } from './db';
import { listIngredients, listRecipes, recipeCost, recipeFor } from './stock';
import type { Menu } from './types';

/* Reports are built straight from closed checks (status "done"), so they always agree with the cash desk.
   Time of a sale = when it was paid (or closed, for checks closed without payment data). Days are Tashkent days. */

const T = `COALESCE(o.paid_at, o.updated_at)`;
const TZ = `'Asia/Tashkent'`;

export type Period = { from: string; to: string; label: string; days: number };

/** today / 7 / 30 / 90 days, ending now; start at Tashkent midnight. */
export function period(key: string | undefined): Period {
  const days = key === 'today' ? 1 : key === '30' ? 30 : key === '90' ? 90 : 7;
  const now = new Date();
  const tk = new Date(now.getTime() + 5 * 3600_000); // Tashkent is UTC+5, no DST
  const midnightTk = Date.UTC(tk.getUTCFullYear(), tk.getUTCMonth(), tk.getUTCDate()) - 5 * 3600_000;
  const from = new Date(midnightTk - (days - 1) * 86400_000);
  return { from: from.toISOString(), to: now.toISOString(), days, label: days === 1 ? 'Сегодня' : `${days} дней` };
}

export async function summary(p: Period) {
  const r = await q(
    `SELECT count(*)::int AS checks, COALESCE(sum(total),0)::bigint AS revenue, COALESCE(sum(guests),0)::int AS guests,
            COALESCE(sum(tips),0)::bigint AS tips, COALESCE(sum(discount),0)::bigint AS discount, COALESCE(sum(service),0)::bigint AS service
       FROM orders o WHERE status = 'done' AND ${T} >= $1 AND ${T} <= $2`,
    [p.from, p.to],
  );
  const x = r.rows[0];
  const c = await q(`SELECT count(*)::int AS n FROM orders o WHERE status = 'cancelled' AND updated_at >= $1 AND updated_at <= $2 AND total > 0`, [p.from, p.to]);
  const checks = x.checks;
  const revenue = Number(x.revenue);
  return { checks, revenue, avg: checks ? Math.round(revenue / checks) : 0, guests: x.guests, tips: Number(x.tips), discount: Number(x.discount), service: Number(x.service), cancelled: c.rows[0].n };
}

export async function byDay(p: Period) {
  const r = await q(
    `SELECT to_char(date_trunc('day', ${T} AT TIME ZONE ${TZ}), 'YYYY-MM-DD') AS d, sum(total)::bigint AS v, count(*)::int AS n
       FROM orders o WHERE status = 'done' AND ${T} >= $1 AND ${T} <= $2 GROUP BY 1 ORDER BY 1`,
    [p.from, p.to],
  );
  const map = new Map(r.rows.map((x) => [x.d, { v: Number(x.v), n: x.n }]));
  const out: { d: string; v: number; n: number }[] = [];
  for (let i = 0; i < p.days; i++) {
    const d = new Date(new Date(p.from).getTime() + 5 * 3600_000 + i * 86400_000).toISOString().slice(0, 10);
    out.push({ d, ...(map.get(d) || { v: 0, n: 0 }) });
  }
  return out;
}

export async function byHour(p: Period) {
  const r = await q(
    `SELECT extract(hour FROM ${T} AT TIME ZONE ${TZ})::int AS h, count(*)::int AS n, sum(total)::bigint AS v
       FROM orders o WHERE status = 'done' AND ${T} >= $1 AND ${T} <= $2 GROUP BY 1`,
    [p.from, p.to],
  );
  const out = Array.from({ length: 24 }, (_, h) => ({ h, n: 0, v: 0 }));
  r.rows.forEach((x) => (out[x.h] = { h: x.h, n: x.n, v: Number(x.v) }));
  return out;
}

export async function split(p: Period, col: 'type' | 'pay' | 'source' | 'waiter') {
  const expr = col === 'pay' ? `COALESCE(NULLIF(paid_with, ''), pay)` : col;
  const r = await q(
    `SELECT ${expr} AS k, count(*)::int AS n, sum(total)::bigint AS v, COALESCE(sum(tips),0)::bigint AS tips, COALESCE(sum(guests),0)::int AS guests
       FROM orders o WHERE status = 'done' AND ${T} >= $1 AND ${T} <= $2 GROUP BY 1 ORDER BY 3 DESC`,
    [p.from, p.to],
  );
  return r.rows.map((x) => ({ k: x.k || '', n: x.n, v: Number(x.v), tips: Number(x.tips), guests: x.guests }));
}

/** Dishes sold, with today's food cost from the recipes (null when the dish has no recipe yet). */
export async function dishes(p: Period, menu: Menu) {
  const [r, recipes, ings] = await Promise.all([
    q(
      `SELECT i->>'id' AS id, max(i->>'name') AS name, NULLIF(i->>'si','')::int AS si, sum((i->>'qty')::int)::int AS qty, sum((i->>'unit')::bigint * (i->>'qty')::int)::bigint AS sum
         FROM orders o, jsonb_array_elements(o.items) i
        WHERE o.status = 'done' AND ${T} >= $1 AND ${T} <= $2 AND i->'void' IS NULL
        GROUP BY 1, 3`,
      [p.from, p.to],
    ),
    listRecipes(),
    listIngredients(true),
  ]);
  const im = new Map(ings.map((i) => [i.id, i]));
  const merged = new Map<string, { id: string; name: string; cat: string; qty: number; sum: number; cost: number | null }>();
  for (const x of r.rows) {
    const d = menu.dishes.find((m) => m.id === x.id);
    const unitCost = recipeCost(recipeFor(recipes, x.id, x.si ?? undefined), im);
    const cur = merged.get(x.id) || { id: x.id, name: d?.ru || d?.name || x.name, cat: d?.cat || '', qty: 0, sum: 0, cost: 0 as number | null };
    cur.qty += x.qty;
    cur.sum += Number(x.sum);
    cur.cost = unitCost === null || cur.cost === null ? null : cur.cost + unitCost * x.qty;
    merged.set(x.id, cur);
  }
  return [...merged.values()].sort((a, b) => b.sum - a.sum);
}
