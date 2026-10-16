import { timingSafeEqual } from 'crypto';
import { getOrder, q } from '@/lib/db';
import { getSettings } from '@/lib/data';
import { markPaid, updateStatus } from '@/lib/pos';

/* Payme Merchant API (JSON-RPC 2.0). Give Payme this URL: <PUBLIC_URL>/api/pay/payme
   Account field: order_id. Amounts are in tiyin. Transaction states: 1 created, 2 performed,
   -1 cancelled before perform, -2 cancelled after perform. */

export const dynamic = 'force-dynamic';
const TIMEOUT = 43_200_000; // 12 h

type Err = { code: number; ru: string; uz?: string; en?: string; data?: string };
const reply = (id: unknown, result: unknown) => Response.json({ jsonrpc: '2.0', id, result });
const fail = (id: unknown, e: Err) =>
  Response.json({ jsonrpc: '2.0', id, error: { code: e.code, message: { ru: e.ru, uz: e.uz || e.ru, en: e.en || e.ru }, data: e.data } });

const E = {
  auth: { code: -32504, ru: 'Недостаточно привилегий', en: 'Insufficient privileges' },
  method: { code: -32601, ru: 'Метод не найден', en: 'Method not found' },
  parse: { code: -32700, ru: 'Ошибка разбора JSON', en: 'Parse error' },
  amount: { code: -31001, ru: 'Неверная сумма', uz: "Noto'g'ri summa", en: 'Wrong amount' },
  notFound: { code: -31003, ru: 'Транзакция не найдена', uz: 'Tranzaksiya topilmadi', en: 'Transaction not found' },
  cantCancel: { code: -31007, ru: 'Заказ выполнен, отмена невозможна', en: 'Order completed, cannot cancel' },
  cantDo: { code: -31008, ru: 'Невозможно выполнить операцию', uz: "Amalni bajarib bo'lmaydi", en: 'Cannot perform operation' },
  order: { code: -31050, ru: 'Заказ не найден', uz: 'Buyurtma topilmadi', en: 'Order not found', data: 'order_id' },
  orderBusy: { code: -31051, ru: 'Заказ уже оплачивается или оплачен', uz: "Buyurtma allaqachon to'lanmoqda", en: 'Order is already being paid', data: 'order_id' },
} satisfies Record<string, Err>;

function authorized(req: Request) {
  const key = process.env.PAYME_KEY;
  if (!key) return false;
  const want = 'Basic ' + Buffer.from('Paycom:' + key).toString('base64');
  const got = req.headers.get('authorization') || '';
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

const txView = (t: any) => ({
  create_time: Number(t.create_time),
  perform_time: Number(t.perform_time),
  cancel_time: Number(t.cancel_time),
  transaction: String(t.id),
  state: t.state,
  reason: t.reason ?? null,
});

async function payableOrder(account: any, amount: number) {
  const id = String(account?.order_id || '');
  const o = /^[a-f0-9]{24}$/.test(id) ? await getOrder(id) : null;
  if (!o || o.pay !== 'payme' || o.status === 'cancelled') return { err: E.order };
  if (o.payStatus === 'paid') return { err: E.orderBusy };
  if (Number(amount) !== o.total * 100) return { err: E.amount };
  return { o };
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail(null, E.parse);
  }
  const { id, method, params = {} } = body || {};
  if (!authorized(req)) return fail(id, E.auth);

  switch (method) {
    case 'CheckPerformTransaction': {
      const r = await payableOrder(params.account, params.amount);
      if (r.err) return fail(id, r.err);
      const busy = await q(`SELECT 1 FROM payments WHERE provider = 'payme' AND order_id = $1 AND state = 1`, [r.o!.id]);
      if (busy.rows[0]) return fail(id, E.orderBusy);
      return reply(id, { allow: true });
    }

    case 'CreateTransaction': {
      const existing = (await q(`SELECT * FROM payments WHERE provider = 'payme' AND ext_id = $1`, [params.id])).rows[0];
      if (existing) {
        if (existing.state !== 1) return fail(id, E.cantDo);
        if (Date.now() - Number(existing.create_time) > TIMEOUT) {
          await q(`UPDATE payments SET state = -1, reason = 4, cancel_time = $2 WHERE id = $1`, [existing.id, Date.now()]);
          return fail(id, E.cantDo);
        }
        return reply(id, { create_time: Number(existing.create_time), transaction: String(existing.id), state: 1 });
      }
      const r = await payableOrder(params.account, params.amount);
      if (r.err) return fail(id, r.err);
      const busy = await q(`SELECT 1 FROM payments WHERE provider = 'payme' AND order_id = $1 AND state = 1`, [r.o!.id]);
      if (busy.rows[0]) return fail(id, E.orderBusy);
      const now = Date.now();
      const t = (
        await q(`INSERT INTO payments (provider, ext_id, order_id, amount, state, create_time) VALUES ('payme', $1, $2, $3, 1, $4) RETURNING *`, [
          params.id,
          r.o!.id,
          params.amount,
          now,
        ])
      ).rows[0];
      return reply(id, { create_time: now, transaction: String(t.id), state: 1 });
    }

    case 'PerformTransaction': {
      const t = (await q(`SELECT * FROM payments WHERE provider = 'payme' AND ext_id = $1`, [params.id])).rows[0];
      if (!t) return fail(id, E.notFound);
      if (t.state === 2) return reply(id, { transaction: String(t.id), perform_time: Number(t.perform_time), state: 2 });
      if (t.state !== 1) return fail(id, E.cantDo);
      if (Date.now() - Number(t.create_time) > TIMEOUT) {
        await q(`UPDATE payments SET state = -1, reason = 4, cancel_time = $2 WHERE id = $1`, [t.id, Date.now()]);
        return fail(id, E.cantDo);
      }
      const now = Date.now();
      await q(`UPDATE payments SET state = 2, perform_time = $2 WHERE id = $1`, [t.id, now]);
      await markPaid(t.order_id, 'payme', await getSettings());
      return reply(id, { transaction: String(t.id), perform_time: now, state: 2 });
    }

    case 'CancelTransaction': {
      const t = (await q(`SELECT * FROM payments WHERE provider = 'payme' AND ext_id = $1`, [params.id])).rows[0];
      if (!t) return fail(id, E.notFound);
      if (t.state === -1 || t.state === -2) return reply(id, { transaction: String(t.id), cancel_time: Number(t.cancel_time), state: t.state });
      const now = Date.now();
      if (t.state === 1) {
        await q(`UPDATE payments SET state = -1, reason = $2, cancel_time = $3 WHERE id = $1`, [t.id, params.reason ?? null, now]);
        await q(`UPDATE orders SET pay_status = 'failed', updated_at = now() WHERE id = $1 AND pay_status <> 'paid'`, [t.order_id]);
        return reply(id, { transaction: String(t.id), cancel_time: now, state: -1 });
      }
      // performed: refund allowed only while the order has not been handed over
      const o = await getOrder(t.order_id);
      if (o && o.status === 'done') return fail(id, E.cantCancel);
      await q(`UPDATE payments SET state = -2, reason = $2, cancel_time = $3 WHERE id = $1`, [t.id, params.reason ?? null, now]);
      await q(`UPDATE orders SET pay_status = 'refunded', updated_at = now() WHERE id = $1`, [t.order_id]);
      await updateStatus(t.order_id, 'cancelled', await getSettings());
      return reply(id, { transaction: String(t.id), cancel_time: now, state: -2 });
    }

    case 'CheckTransaction': {
      const t = (await q(`SELECT * FROM payments WHERE provider = 'payme' AND ext_id = $1`, [params.id])).rows[0];
      if (!t) return fail(id, E.notFound);
      return reply(id, txView(t));
    }

    case 'GetStatement': {
      const rows = (
        await q(`SELECT * FROM payments WHERE provider = 'payme' AND create_time BETWEEN $1 AND $2 ORDER BY create_time`, [Number(params.from) || 0, Number(params.to) || 0])
      ).rows;
      return reply(id, {
        transactions: rows.map((t) => ({
          id: t.ext_id,
          time: Number(t.create_time),
          amount: Number(t.amount),
          account: { order_id: t.order_id },
          ...txView(t),
        })),
      });
    }

    default:
      return fail(id, { ...E.method, data: String(method) });
  }
}
