import 'server-only';
import { newId, q } from './db';
import type { OrderItem } from './types';

/* Warehouse: ingredients with a running balance, every change written to stock_moves.
   Sales are deducted once, when a check is closed (status "done"), by the dish's recipe (техкарта). */

export type Ingredient = { id: string; name: string; unit: string; stock: number; min: number; cost: number; active: boolean };
export type RecipeLine = { ing: string; qty: number };
export type Recipe = { dishId: string; si: number; lines: RecipeLine[] };
export type Move = { id: number; ingredientId: string; name: string; unit: string; kind: string; qty: number; price: number; note: string; orderId: string | null; by: string; at: string };

export const UNITS = ['кг', 'л', 'шт', 'пачка', 'бутылка'] as const;
export const MOVE_RU: Record<string, string> = { in: 'Приход', writeoff: 'Списание', adjust: 'Инвентаризация', sale: 'Продажа', return: 'Возврат продажи' };

const n = (v: unknown) => Number(v) || 0;
const mapIng = (r: any): Ingredient => ({ id: r.id, name: r.name, unit: r.unit, stock: n(r.stock), min: n(r.min_stock), cost: n(r.cost), active: r.active });

export async function listIngredients(all = false) {
  const r = await q(`SELECT * FROM ingredients ${all ? '' : 'WHERE active'} ORDER BY name`);
  return r.rows.map(mapIng);
}

export async function createIngredient(d: { name: string; unit: string; min: number; cost: number }) {
  const id = newId();
  await q('INSERT INTO ingredients (id, name, unit, min_stock, cost) VALUES ($1, $2, $3, $4, $5)', [id, d.name, d.unit, d.min, d.cost]);
  return id;
}

export async function updateIngredient(id: string, d: { name?: string; unit?: string; min?: number; active?: boolean }) {
  await q(
    `UPDATE ingredients SET name = COALESCE($2, name), unit = COALESCE($3, unit), min_stock = COALESCE($4, min_stock), active = COALESCE($5, active) WHERE id = $1`,
    [id, d.name ?? null, d.unit ?? null, d.min ?? null, d.active ?? null],
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
  return r.lines.reduce((s, l) => s + l.qty * (ings.get(l.ing)?.cost || 0), 0);
}

function need(items: OrderItem[], recipes: Recipe[]) {
  const out = new Map<string, number>();
  for (const l of items) {
    if (l.void) continue;
    const r = recipeFor(recipes, l.id, l.si);
    if (!r) continue;
    for (const x of r.lines) out.set(x.ing, (out.get(x.ing) || 0) + x.qty * l.qty);
  }
  return out;
}

/** Called when a check is closed. Safe to call twice: the order flag makes it happen once. */
export async function deductForOrder(orderId: string, no: number) {
  const r = await q(`UPDATE orders SET stock_done = true WHERE id = $1 AND NOT stock_done AND status = 'done' RETURNING items`, [orderId]);
  if (!r.rows[0]) return;
  const recipes = await listRecipes();
  for (const [ing, qty] of need(r.rows[0].items || [], recipes)) {
    const u = await q('UPDATE ingredients SET stock = stock - $2 WHERE id = $1 RETURNING cost', [ing, qty]);
    if (u.rows[0]) await move(ing, 'sale', -qty, 'касса', `чек № ${no}`, n(u.rows[0].cost), orderId);
  }
}

/** A closed check was cancelled afterwards: put the ingredients back. */
export async function returnForOrder(orderId: string, no: number) {
  const r = await q(`UPDATE orders SET stock_done = false WHERE id = $1 AND stock_done RETURNING items`, [orderId]);
  if (!r.rows[0]) return;
  const recipes = await listRecipes();
  for (const [ing, qty] of need(r.rows[0].items || [], recipes)) {
    const u = await q('UPDATE ingredients SET stock = stock + $2 WHERE id = $1 RETURNING cost', [ing, qty]);
    if (u.rows[0]) await move(ing, 'return', qty, 'касса', `отмена чека № ${no}`, n(u.rows[0].cost), orderId);
  }
}
