import { createHash } from 'crypto';
import { getOrder, q } from '@/lib/db';
import { getSettings } from '@/lib/data';
import { markPaid } from '@/lib/pos';

/* Click SHOP API. Give Click the same URL for Prepare and Complete: <PUBLIC_URL>/api/pay/click
   merchant_trans_id = our order id; merchant_prepare_id = our payment row id. Amounts in sum. */

export const dynamic = 'force-dynamic';

const md5 = (s: string) => createHash('md5').update(s).digest('hex');

async function readBody(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    const j = await req.json().catch(() => ({}));
    return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v ?? '')]));
  }
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export async function POST(req: Request) {
  const p = await readBody(req);
  const out = (extra: Record<string, unknown>, error: number, note: string) =>
    Response.json({ click_trans_id: p.click_trans_id, merchant_trans_id: p.merchant_trans_id, ...extra, error, error_note: note });

  const secret = process.env.CLICK_SECRET_KEY;
  const action = p.action;
  if (!secret || !p.click_trans_id || !p.service_id || !p.merchant_trans_id || !p.amount || !p.sign_time || !p.sign_string || (action !== '0' && action !== '1'))
    return out({}, -8, 'Error in request from click');
  if (String(p.service_id) !== String(process.env.CLICK_SERVICE_ID)) return out({}, -8, 'Error in request from click');

  const sign =
    action === '0'
      ? md5(p.click_trans_id + p.service_id + secret + p.merchant_trans_id + p.amount + p.action + p.sign_time)
      : md5(p.click_trans_id + p.service_id + secret + p.merchant_trans_id + (p.merchant_prepare_id || '') + p.amount + p.action + p.sign_time);
  if (sign !== p.sign_string) return out({}, -1, 'SIGN CHECK FAILED!');

  const o = /^[a-f0-9]{24}$/.test(p.merchant_trans_id) ? await getOrder(p.merchant_trans_id) : null;
  if (!o || o.pay !== 'click') return out({}, -5, 'Order not found');
  if (Math.abs(Number(p.amount) - o.total) > 0.009) return out({}, -2, 'Incorrect parameter amount');

  if (action === '0') {
    if (o.payStatus === 'paid') return out({}, -4, 'Already paid');
    if (o.status === 'cancelled') return out({}, -9, 'Transaction cancelled');
    const t = (
      await q(
        `INSERT INTO payments (provider, ext_id, order_id, amount, state, create_time) VALUES ('click', $1, $2, $3, 1, $4)
         ON CONFLICT (provider, ext_id) DO UPDATE SET amount = EXCLUDED.amount RETURNING *`,
        [p.click_trans_id, o.id, Math.round(Number(p.amount) * 100), Date.now()],
      )
    ).rows[0];
    return out({ merchant_prepare_id: t.id }, 0, 'Success');
  }

  // Complete
  const t = (await q(`SELECT * FROM payments WHERE provider = 'click' AND id = $1 AND ext_id = $2`, [Number(p.merchant_prepare_id) || 0, p.click_trans_id])).rows[0];
  if (!t) return out({}, -6, 'Transaction does not exist');
  if (t.state === 2) return out({ merchant_confirm_id: t.id }, -4, 'Already paid');
  if (t.state < 0) return out({}, -9, 'Transaction cancelled');
  if (Number(p.error) < 0) {
    await q(`UPDATE payments SET state = -1, cancel_time = $2 WHERE id = $1`, [t.id, Date.now()]);
    await q(`UPDATE orders SET pay_status = 'failed', updated_at = now() WHERE id = $1 AND pay_status <> 'paid'`, [o.id]);
    return out({}, -9, 'Transaction cancelled');
  }
  await q(`UPDATE payments SET state = 2, perform_time = $2 WHERE id = $1`, [t.id, Date.now()]);
  await markPaid(o.id, 'click', await getSettings());
  return out({ merchant_confirm_id: t.id }, 0, 'Success');
}
