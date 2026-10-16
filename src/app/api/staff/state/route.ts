import { NextResponse } from 'next/server';
import { isStaff } from '@/lib/auth';
import { openOrders } from '@/lib/pos';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isStaff()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const orders = (await openOrders()).map(({ token, tgMessageId, ...o }) => o);
  return NextResponse.json({ orders, now: Date.now() });
}
