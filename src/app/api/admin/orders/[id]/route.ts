import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { setOrderStatus } from '@/lib/db';
import { statusInput } from '@/lib/schemas';
import { refreshOrderMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const p = statusInput.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Неверный статус' }, { status: 400 });
  const o = await setOrderStatus(params.id, p.data.status).catch(() => null);
  if (!o) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  refreshOrderMessage(o).catch(() => {});
  return NextResponse.json({ ok: true, status: o.status });
}
