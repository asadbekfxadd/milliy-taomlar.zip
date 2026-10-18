import { NextResponse } from 'next/server';
import { guardAny } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { kitchenUpdate } from '@/lib/schemas';
import { kitchenMove } from '@/lib/pos';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await guardAny(['kitchen', 'pos', 'waiter']);
  if ('res' in g) return g.res;
  const p = kitchenUpdate.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
  const o = await kitchenMove(params.id, p.data.lines, p.data.to, await getSettings());
  if (!o) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  return NextResponse.json({ ok: true, status: o.status });
}
