import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getOrder } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const t = new URL(req.url).searchParams.get('t') || '';
  const o = /^[a-f0-9]{24}$/.test(params.id) ? await getOrder(params.id) : null;
  const ok = o && t.length === o.token.length && timingSafeEqual(Buffer.from(t), Buffer.from(o.token));
  if (!o || !ok) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  return NextResponse.json({
    id: o.id,
    no: o.no,
    status: o.status,
    type: o.type,
    fee: o.fee,
    items: o.items,
    subtotal: o.subtotal,
    total: o.total,
    createdAt: o.createdAt,
  });
}
