import { NextResponse } from 'next/server';
import { guardAny } from '@/lib/auth';
import { openOrders } from '@/lib/pos';
import { currentShift } from '@/lib/shifts';

export const dynamic = 'force-dynamic';

const isNewOnline = (o: { source: string; status: string; payStatus: string }) => o.source === 'site' && o.status === 'new' && !['pending', 'failed'].includes(o.payStatus);

export async function GET(req: Request) {
  const g = await guardAny(['pos', 'waiter', 'kitchen', 'orders']);
  if ('res' in g) return g.res;
  const all = await openOrders();
  const newOnline = all.filter(isNewOnline).length;
  if (new URL(req.url).searchParams.get('count')) return NextResponse.json({ newOnline });
  const orders = all.map(({ token, tgMessageId, ...o }) => o);
  const shift = await currentShift();
  return NextResponse.json({ orders, newOnline, shift: shift && { id: shift.id, openedAt: shift.openedAt, openedBy: shift.openedBy }, now: Date.now() });
}
