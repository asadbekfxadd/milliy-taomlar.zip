import 'server-only';
import { q, type OrderRow } from './db';
import { earnFor, LOYALTY_DEFAULT, type LoyaltyCfg } from './offers';
import { normalizePhone } from './format';
import type { Settings } from './types';

/* Loyalty points, 1 point = 1 sum. Kept per phone number.
   Points are spent and earned when an order is completed, and given back if a completed order is cancelled. */

export const cfgOf = (st: Settings): LoyaltyCfg => ({ ...LOYALTY_DEFAULT, ...(st.loyalty || {}) });

export async function balance(phone: string) {
  const p = normalizePhone(phone);
  if (!p) return 0;
  const r = await q(`SELECT points FROM loyalty WHERE phone = $1`, [p]);
  return r.rows[0]?.points ?? 0;
}

export async function history(phone: string, limit = 20) {
  const r = await q(`SELECT points, kind, note, at FROM loyalty_tx WHERE phone = $1 ORDER BY at DESC LIMIT $2`, [phone, limit]);
  return r.rows.map((x) => ({ points: x.points as number, kind: x.kind as string, note: x.note as string, at: new Date(x.at).toISOString() }));
}

async function move(phone: string, points: number, kind: string, note: string, orderId: string | null, by = '') {
  if (!points) return true;
  if (points < 0) {
    const r = await q(`UPDATE loyalty SET points = points + $2::int, spent = spent - $2::int, updated_at = now() WHERE phone = $1 AND points >= -($2::int) RETURNING points`, [phone, points]);
    if (!r.rows[0]) return false;
  } else {
    await q(
      `INSERT INTO loyalty (phone, points, earned) VALUES ($1, $2, $2)
       ON CONFLICT (phone) DO UPDATE SET points = loyalty.points + $2, earned = loyalty.earned + $2, updated_at = now()`,
      [phone, points],
    );
  }
  await q(`INSERT INTO loyalty_tx (phone, order_id, points, kind, note, by_name) VALUES ($1, $2, $3, $4, $5, $6)`, [phone, orderId, points, kind, note, by]);
  return true;
}

/** Manual correction by a manager (gift, compensation, mistake). */
export async function adjust(phone: string, points: number, note: string, by: string) {
  const p = normalizePhone(phone);
  if (!p) return false;
  return move(p, Math.round(points), points > 0 ? 'gift' : 'fix', note, null, by);
}

/** Order completed: take the points used, give the points earned. Runs once per order. */
export async function settleOrder(o: OrderRow, st: Settings) {
  const cfg = cfgOf(st);
  const phone = normalizePhone(o.phone);
  if (!phone) return 0;
  const claim = await q(`UPDATE orders SET points_done = true WHERE id = $1 AND NOT points_done RETURNING id`, [o.id]);
  if (!claim.rows[0]) return 0;
  try {
    return await settle(o, phone, cfg);
  } catch (e) {
    await q(`UPDATE orders SET points_done = false WHERE id = $1`, [o.id]);
    throw e;
  }
}

async function settle(o: OrderRow, phone: string, cfg: LoyaltyCfg) {
  if (o.pointsUsed > 0 && !(await move(phone, -o.pointsUsed, 'spend', `Оплата заказа № ${o.no}`, o.id))) {
    // not enough points any more (spent elsewhere meanwhile): the order is already paid, so just record it
    console.error('loyalty: not enough points for order', o.no);
  }
  if (!cfg.enabled) return 0;
  const paidDishes = o.subtotal - o.discount - o.dealDiscount - o.pointsUsed;
  let earn = earnFor(cfg, paidDishes);
  if (cfg.welcome > 0) {
    const prev = await q(`SELECT 1 FROM loyalty_tx WHERE phone = $1 AND kind = 'welcome' LIMIT 1`, [phone]);
    if (!prev.rows[0]) await move(phone, cfg.welcome, 'welcome', 'Бонус за первый заказ', o.id);
  }
  if (earn > 0) await move(phone, earn, 'earn', `Начислено за заказ № ${o.no}`, o.id);
  else earn = 0;
  await q(`UPDATE orders SET points_earned = $2 WHERE id = $1`, [o.id, earn]);
  return earn;
}

/** A completed order was cancelled: give the spent points back and take the earned ones. */
export async function unsettleOrder(o: OrderRow) {
  const phone = normalizePhone(o.phone);
  if (!phone) return;
  const claim = await q(`UPDATE orders SET points_done = false WHERE id = $1 AND points_done RETURNING points_earned`, [o.id]);
  if (!claim.rows[0]) return;
  const earned = claim.rows[0].points_earned as number;
  if (o.pointsUsed > 0) await move(phone, o.pointsUsed, 'refund', `Возврат: заказ № ${o.no} отменён`, o.id);
  if (earned > 0) {
    // take back what is left; points already spent elsewhere stay spent
    const cur = await balance(phone);
    const back = Math.min(cur, earned);
    if (back > 0) await move(phone, -back, 'revoke', `Списано: заказ № ${o.no} отменён`, o.id);
  }
  await q(`UPDATE orders SET points_earned = 0 WHERE id = $1`, [o.id]);
}
