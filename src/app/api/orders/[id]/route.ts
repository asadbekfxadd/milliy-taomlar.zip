import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getOrder } from '@/lib/db';
import { checkoutUrl, isOnline } from '@/lib/payments';
import { botUsername } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const t = new URL(req.url).searchParams.get('t') || '';
  const o = /^[a-f0-9]{24}$/.test(params.id) ? await getOrder(params.id) : null;
  const ok = o && t.length === o.token.length && timingSafeEqual(Buffer.from(t), Buffer.from(o.token));
  if (!o || !ok) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  const canPay = isOnline(o.pay) && o.payStatus !== 'paid' && o.payStatus !== 'refunded' && o.status !== 'cancelled';
  const bot = await botUsername().catch(() => null);
  return NextResponse.json({
    id: o.id,
    no: o.no,
    status: o.status,
    type: o.type,
    fee: o.fee,
    items: o.items,
    subtotal: o.subtotal,
    discount: o.discount,
    promo: o.promo,
    total: o.total,
    createdAt: o.createdAt,
    pay: o.pay,
    payStatus: o.payStatus,
    payUrl: canPay ? checkoutUrl(o.pay, o) : null,
    etaAt: o.etaAt,
    tgLink: bot ? `https://t.me/${bot}?start=o${o.id}${o.token.slice(0, 16)}` : null,
    tgLinked: Boolean(o.customerChat),
  });
}
