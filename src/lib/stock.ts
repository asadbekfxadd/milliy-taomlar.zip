import 'server-only';
import { newId, q } from './db';
import type { OrderItem } from './types';

/* Warehouse: ingredients with a running balance, every change written to stock_moves.
   Sales are deducted once, when a check is closed (status "done"), by the dish's recipe (техкарта). */

export type Pack = { name: string; k: number };
export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  min: number;
  cost: number;
  active: boolean;
  /** usable share after cleaning/trimming, % (recipes are written net, the stock is taken gross) */
  yield: number;
  /** order up to this amount */
  par: number;
  supplierId: string;
  /** purchase units: "мешок = 50 кг" */
  packs: Pack[];
  /** semi-finished product made in-house from other products */
  isPrep: boolean;
};
export type RecipeLine = { ing: string; qty: number };
export type Recipe = { dishId: string; si: number; lines: RecipeLine[] };
export type Move = { id: number; ingredientId: string; name: string; unit: string; kind: string; qty: number; price: number; note: string; orderId: string | null; by: string; at: string };

export const UNITS = ['кг', 'л', 'шт', 'пачка', 'бутылка'] as const;
export const MOVE_RU: Record<string, string> = { in: 'Приход', writeoff: 'Списание', adjust: 'Инвентаризация', sale: 'Продажа', return: 'Возврат продажи', prod_out: 'На заготовку', prod_in: 'Заготовка готова' };

const n = (v: unknown) => Number(v) || 0;
const mapIng = (r: any): Ingredient => ({
  id: r.id,
  name: r.name,
  unit: r.unit,
  stock: n(r.stock),
  min: n(r.min_stock),
  cost: n(r.cost),
  active: r.active,
  yield: n(r.yield_pct) || 100,
  par: n(r.par),
  supplierId: r.supplier_id || '',
  packs: Array.isArray(r.packs) ? r.packs : [],
  isPrep: Boolean(r.is_prep),
});

/** Gross amount taken from stock for a net amount in a recipe. */
export const gross = (net: number, yieldPct: number) => net / ((yieldPct > 0 ? Math.min(100, yieldPct) : 100) / 100);

export async function listIngredients(all = false) {
  const r = await q(`SELECT * FROM ingredients ${all ? '' : 'WHERE active'} ORDER BY name`);
  return r.rows.map(mapIng);
}

export async function createIngredient(d: { name: string; unit: string; min: number; cost: number; isPrep?: boolean; yield?: number; supplierId?: string }) {
  const id = newId();
  await q('INSERT INTO ingredients (id, name, unit, min_stock, cost, is_prep, yield_pct, supplier_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [
    id,
    d.name,
    d.unit,
    d.min,
    d.cost,
    Boolean(d.isPrep),
    d.yield || 100,
    d.supplierId || '',
  ]);
  return id;
}

export async function updateIngredient(
  id: string,
  d: { name?: string; unit?: string; min?: number; active?: boolean; yield?: number; par?: number; supplierId?: string; packs?: Pack[]; isPrep?: boolean },
) {
  await q(
    `UPDATE ingredients SET name = COALESCE($2, name), unit = COALESCE($3, unit), min_stock = COALESCE($4, min_stock), active = COALESCE($5, active),
       yield_pct = COALESCE($6, yield_pct), par = COALESCE($7, par), supplier_id = COALESCE($8, supplier_id), packs = COALESCE($9, packs), is_prep = COALESCE($10, is_prep)
     WHERE id = $1`,
    [id, d.name ?? null, d.unit ?? null, d.min ?? null, d.active ?? null, d.yield ?? null, d.par ?? null, d.supplierId ?? null, d.packs ? JSON.stringify(d.packs) : null, d.isPrep ?? null],
  );
}

async function move(ing: string, kind: string, qty: number, by: string, note = '', price = 0, orderId: string | null = null) {
  await q('INSERT INTO stock_moves (ingredient_id, kind, qty, price, note, order_id, by_name) VALUES ($1, $2, $3, $4, $5, $6, $7)', [ing, kind, qty, price, note, orderId, by]);
}

/** Приход: the average cost is recalculated from what was in stock and what arrived. */
export async function receive(ing: string, qty: number, price: number, note: string, by: string) {
  const r = await q(
    `UPDATE ingredients SET
        cost = CASE WHEN stock > 0 AND stock + $2 > 0 THEN (stock * cost + $2 * $3) / (stock + $2) ELSE $3 END,
        stock = stock + $2
      WHERE id = $1 RETURNING id`,
    [ing, qty, price],
  );
  if (!r.rows[0]) return false;
  await move(ing, 'in', qty, by, note, price);
  return true;
}

export async function writeOff(ing: string, qty: number, note: string, by: string) {
  const r = await q('UPDATE ingredients SET stock = stock - $2 WHERE id = $1 RETURNING cost', [ing, qty]);
  if (!r.rows[0]) return false;
  await move(ing, 'writeoff', -qty, by, note, n(r.rows[0].cost));
  return true;
}

/** Инвентаризация: set the counted amount; the difference goes to the log. */
export async function countStock(ing: string, actual: number, by: string, note = '') {
  const r = await q('SELECT stock, cost FROM ingredients WHERE id = $1', [ing]);
  if (!r.rows[0]) return false;
  const diff = actual - n(r.rows[0].stock);
  if (Math.abs(diff) < 1e-9) return true;
  await q('UPDATE ingredients SET stock = stock + $2 WHERE id = $1', [ing, diff]);
  await move(ing, 'adjust', diff, by, note || 'пересчёт', n(r.rows[0].cost));
  return true;
}

export async function listMoves(opts: { ing?: string; kind?: string; days?: number; limit?: number } = {}) {
  const cond: string[] = [];
  const vals: unknown[] = [];
  if (opts.ing) cond.push(`m.ingredient_id = $${vals.push(opts.ing)}`);
  if (opts.kind) cond.push(`m.kind = $${vals.push(opts.kind)}`);
  if (opts.days) cond.push(`m.created_at > now() - make_interval(days => $${vals.push(opts.days)})`);
  const r = await q(
    `SELECT m.*, i.name, i.unit FROM stock_moves m JOIN ingredients i ON i.id = m.ingredient_id
      ${cond.length ? 'WHERE ' + cond.join(' AND ') : ''} ORDER BY m.created_at DESC LIMIT ${Math.min(opts.limit || 200, 1000)}`,
    vals,
  );
  return r.rows.map(
    (x): Move => ({ id: x.id, ingredientId: x.ingredient_id, name: x.name, unit: x.unit, kind: x.kind, qty: n(x.qty), price: n(x.price), note: x.note, orderId: x.order_id, by: x.by_name, at: new Date(x.created_at).toISOString() }),
  );
}

/* ---------- recipes ---------- */
export async function listRecipes(): Promise<Recipe[]> {
  const r = await q('SELECT dish_id, si, lines FROM recipes');
  return r.rows.map((x) => ({ dishId: x.dish_id, si: x.si, lines: (x.lines || []).map((l: any) => ({ ing: String(l.ing), qty: n(l.qty) })) }));
}

export async function saveRecipe(dishId: string, si: number, lines: RecipeLine[]) {
  const clean = lines.filter((l) => l.ing && l.qty > 0);
  if (!clean.length) {
    await q('DELETE FROM recipes WHERE dish_id = $1 AND si = $2', [dishId, si]);
    return;
  }
  await q(
    `INSERT INTO recipes (dish_id, si, lines, updated_at) VALUES ($1, $2, $3, now())
       ON CONFLICT (dish_id, si) DO UPDATE SET lines = EXCLUDED.lines, updated_at = now()`,
    [dishId, si, JSON.stringify(clean)],
  );
}

/** Recipe for a dish portion: the portion's own one if it has it, otherwise the dish's common one. */
export function recipeFor(recipes: Recipe[], dishId: string, si?: number) {
  return recipes.find((r) => r.dishId === dishId && r.si === (si ?? -1)) || recipes.find((r) => r.dishId === dishId && r.si === -1) || null;
}

export function recipeCost(r: Recipe | null, ings: Map<string, Ingredient>) {
  if (!r) return null;
  return r.lines.reduce((s, l) => {
    const i = ings.get(l.ing);
    return s + gross(l.qty, i?.yield || 100) * (i?.cost || 0);
  }, 0);
}

function need(items: OrderItem[], recipes: Recipe[], ings: Map<string, Ingredient>) {
  const out = new Map<string, number>();
  for (const l of items) {
    if (l.void) continue;
    const r = recipeFor(recipes, l.id, l.si);
    if (!r) continue;
    for (const x of r.lines) out.set(x.ing, (out.get(x.ing) || 0) + gross(x.qty, ings.get(x.ing)?.yield || 100) * l.qty);
  }
  return out;
}

/** Called when a check is closed. Safe to call twice: the order flag makes it happen once. */
export async function deductForOrder(orderId: string, no: number) {
  const r = await q(`UPDATE orders SET stock_done = true WHERE id = $1 AND NOT stock_done AND status = 'done' RETURNING items`, [orderId]);
  if (!r.rows[0]) return;
  const [recipes, all] = await Promise.all([listRecipes(), listIngredients(true)]);
  for (const [ing, qty] of need(r.rows[0].items || [], recipes, new Map(all.map((i) => [i.id, i])))) {
    const u = await q('UPDATE ingredients SET stock = stock - $2 WHERE id = $1 RETURNING cost', [ing, qty]);
    if (u.rows[0]) await move(ing, 'sale', -qty, 'касса', `чек № ${no}`, n(u.rows[0].cost), orderId);
  }
}

/** A closed check was cancelled afterwards: put the ingredients back. */
export async function returnForOrder(orderId: string, no: number) {
  const r = await q(`UPDATE orders SET stock_done = false WHERE id = $1 AND stock_done RETURNING items`, [orderId]);
  if (!r.rows[0]) return;
  const [recipes, all] = await Promise.all([listRecipes(), listIngredients(true)]);
  for (const [ing, qty] of need(r.rows[0].items || [], recipes, new Map(all.map((i) => [i.id, i])))) {
    const u = await q('UPDATE ingredients SET stock = stock + $2 WHERE id = $1 RETURNING cost', [ing, qty]);
    if (u.rows[0]) await move(ing, 'return', qty, 'касса', `отмена чека № ${no}`, n(u.rows[0].cost), orderId);
  }
}

/* ---------- turnover (оборотная ведомость) ---------- */

export type TurnRow = { id: string; name: string; unit: string; open: number; inQty: number; inSum: number; sale: number; off: number; adjust: number; prod: number; close: number; cost: number };

/** Opening and closing balance and the moves in between, per product. Balances are rebuilt from the current
    stock minus the moves made after each date. */
export async function turnover(from: string, to: string): Promise<TurnRow[]> {
  const r = await q(
    `WITH b AS (SELECT ($1::date)::timestamp AT TIME ZONE 'Asia/Tashkent' AS a, ($2::date + 1)::timestamp AT TIME ZONE 'Asia/Tashkent' AS z)
     SELECT i.id, i.name, i.unit, i.stock, i.cost,
       COALESCE(sum(m.qty) FILTER (WHERE m.created_at >= b.a), 0) AS after_a,
       COALESCE(sum(m.qty) FILTER (WHERE m.created_at >= b.z), 0) AS after_z,
       COALESCE(sum(m.qty) FILTER (WHERE m.kind = 'in' AND m.created_at >= b.a AND m.created_at < b.z), 0) AS in_qty,
       COALESCE(sum(m.qty * m.price) FILTER (WHERE m.kind = 'in' AND m.created_at >= b.a AND m.created_at < b.z), 0) AS in_sum,
       COALESCE(sum(m.qty) FILTER (WHERE m.kind IN ('sale','return') AND m.created_at >= b.a AND m.created_at < b.z), 0) AS sale,
       COALESCE(sum(m.qty) FILTER (WHERE m.kind = 'writeoff' AND m.created_at >= b.a AND m.created_at < b.z), 0) AS off,
       COALESCE(sum(m.qty) FILTER (WHERE m.kind = 'adjust' AND m.created_at >= b.a AND m.created_at < b.z), 0) AS adj,
       COALESCE(sum(m.qty) FILTER (WHERE m.kind IN ('prod_in','prod_out') AND m.created_at >= b.a AND m.created_at < b.z), 0) AS prod
     FROM ingredients i CROSS JOIN b LEFT JOIN stock_moves m ON m.ingredient_id = i.id
     GROUP BY i.id, i.name, i.unit, i.stock, i.cost ORDER BY i.name`,
    [from, to],
  );
  return r.rows
    .map((x) => ({
      id: x.id,
      name: x.name,
      unit: x.unit,
      cost: n(x.cost),
      open: n(x.stock) - n(x.after_a),
      close: n(x.stock) - n(x.after_z),
      inQty: n(x.in_qty),
      inSum: n(x.in_sum),
      sale: -n(x.sale),
      off: -n(x.off),
      adjust: n(x.adj),
      prod: n(x.prod),
    }))
    .filter((x) => x.open || x.close || x.inQty || x.sale || x.off || x.adjust || x.prod);
}

/* ---------- preps (заготовки) ---------- */

export type PrepRecipe = { ing: string; out: number; lines: RecipeLine[] };

export async function listPreps(): Promise<PrepRecipe[]> {
  const r = await q('SELECT ing_id, out_qty, lines FROM prep_recipes');
  return r.rows.map((x) => ({ ing: x.ing_id, out: n(x.out_qty), lines: (x.lines || []).map((l: any) => ({ ing: String(l.ing), qty: n(l.qty) })) }));
}

/** A prep may not contain itself, directly or through other preps. */
export async function savePrep(ing: string, out: number, lines: RecipeLine[]) {
  const preps = await listPreps();
  const map = new Map(preps.map((p) => [p.ing, p]));
  map.set(ing, { ing, out, lines });
  const seen = new Set<string>();
  const walk = (id: string): boolean => {
    if (seen.has(id)) return true;
    seen.add(id);
    const p = map.get(id);
    const bad = p ? p.lines.some((l) => l.ing === ing || walk(l.ing)) : false;
    seen.delete(id);
    return bad;
  };
  if (lines.some((l) => l.ing === ing || walk(l.ing))) return 'Заготовка не может входить сама в себя';
  await q(
    `INSERT INTO prep_recipes (ing_id, out_qty, lines, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (ing_id) DO UPDATE SET out_qty = EXCLUDED.out_qty, lines = EXCLUDED.lines, updated_at = now()`,
    [ing, out, JSON.stringify(lines.filter((l) => l.ing && l.qty > 0))],
  );
  await q('UPDATE ingredients SET is_prep = true WHERE id = $1', [ing]);
  return null;
}

/** Акт приготовления: raw products leave the stock in proportion, the prep arrives with the real cost.
    `planned` is how much the recipe says this batch gives; `actual` what really came out. */
export async function produce(prepId: string, planned: number, actual: number, by: string) {
  const p = (await listPreps()).find((x) => x.ing === prepId);
  if (!p || !(p.out > 0)) return { error: 'У заготовки нет рецепта' };
  const k = planned / p.out;
  const ings = new Map((await listIngredients(true)).map((i) => [i.id, i]));
  const prep = ings.get(prepId);
  if (!prep) return { error: 'Заготовка не найдена' };
  let cost = 0;
  const short: string[] = [];
  for (const l of p.lines) {
    const i = ings.get(l.ing);
    if (!i) continue;
    const qty = gross(l.qty, i.yield) * k;
    if (i.stock < qty - 1e-9) short.push(`${i.name}: нужно ${+qty.toFixed(3)} ${i.unit}, есть ${+i.stock.toFixed(3)}`);
    cost += qty * i.cost;
  }
  const note = `заготовка «${prep.name}»: ${+actual.toFixed(3)} ${prep.unit}`;
  for (const l of p.lines) {
    const i = ings.get(l.ing);
    if (!i) continue;
    const qty = gross(l.qty, i.yield) * k;
    await q('UPDATE ingredients SET stock = stock - $2 WHERE id = $1', [i.id, qty]);
    await move(i.id, 'prod_out', -qty, by, note, i.cost);
  }
  const unit = actual > 0 ? cost / actual : 0;
  await q(
    `UPDATE ingredients SET cost = CASE WHEN stock > 0 AND stock + $2 > 0 THEN (stock * cost + $2 * $3) / (stock + $2) ELSE $3 END, stock = stock + $2 WHERE id = $1`,
    [prepId, actual, unit],
  );
  await move(prepId, 'prod_in', actual, by, note, unit);
  return { ok: true, cost, unit, short };
}
