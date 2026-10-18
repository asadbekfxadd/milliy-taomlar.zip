import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { getOrder } from '@/lib/db';
import { getSettings } from '@/lib/data';
import { statusInput } from '@/lib/schemas';
import { updateStatus } from '@/lib/pos';
import { audit } from '@/lib/audit';
import { STATUS_RU, can } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await guard('orders');
  if ('res' in g) return g.res;
  const p = statusInput.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Неверный статус' }, { status: 400 });
  const prev = await getOrder(params.id);
  if (!prev) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  if (!can(g.user.role, 'void')) return NextResponse.json({ error: 'Статус вручную меняет управляющий. Кассир работает с заказом на кассе.' }, { status: 403 });
  const o = await updateStatus(params.id, p.data.status, await getSettings()).catch(() => null);
  if (!o) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  await audit(g.user, 'Статус заказа изменён вручную', `№ ${o.no}: ${STATUS_RU[prev.status]} → ${STATUS_RU[o.status]}`);
  return NextResponse.json({ ok: true, status: o.status });
}
