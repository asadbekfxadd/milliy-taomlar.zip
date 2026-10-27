import { NextResponse } from 'next/server';
import { guardAny } from '@/lib/auth';
import { q } from '@/lib/db';
import { openOrders } from '@/lib/pos';
import { currentShift } from '@/lib/shifts';
import { listEmployees } from '@/lib/employees';
import { listDay, todayTashkent } from '@/lib/reservations';
import { can } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const isNewOnline = (o: { source: string; status: string; payStatus: string }) => o.source === 'site' && o.status === 'new' && !['pending', 'failed'].includes(o.payStatus);

/** Today's deliveries per courier: how many and how much cash they carry. */
async function courierDay(id?: string) {
  const r = await q(
    `SELECT courier_id, count(*)::int AS n,
            COALESCE(sum(total) FILTER (WHERE paid_with = 'cash' AND cashier = courier), 0)::bigint AS cash
       FROM orders
      WHERE type = 'delivery' AND status = 'done' AND courier_id <> '' AND delivered_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent'
        ${id ? 'AND courier_id = $1' : ''}
      GROUP BY courier_id`,
    id ? [id] : [],
  );
  return new Map(r.rows.map((x) => [x.courier_id as string, { n: x.n as number, cash: Number(x.cash) }]));
}

export async function GET(req: Request) {
  const g = await guardAny(['pos', 'waiter', 'kitchen', 'orders', 'courier', 'dispatch']);
  if ('res' in g) return g.res;
  const me = g.user;
  const all = await openOrders();
  const newOnline = all.filter(isNewOnline).length;
  if (new URL(req.url).searchParams.get('count')) return NextResponse.json({ newOnline });

  // a courier sees only deliveries the kitchen has accepted
  const onlyCourier = can(me.role, 'courier') && !can(me.role, 'dispatch') && !can(me.role, 'pos');
  const orders = all.filter((o) => !onlyCourier || (o.type === 'delivery' && o.status !== 'new')).map(({ token, tgMessageId, ...o }) => o);
  const shift = await currentShift();
  const bookings = onlyCourier ? [] : (await listDay(todayTashkent()).catch(() => [])).filter((r) => r.status === 'new' || r.status === 'confirmed').map(({ token, ...r }) => r);

  let couriers: { id: string; name: string; phone: string; n: number; cash: number }[] = [];
  if (can(me.role, 'dispatch')) {
    const day = await courierDay();
    couriers = (await listEmployees()).filter((e) => e.role === 'courier').map((e) => ({ id: e.id, name: e.name, phone: e.phone, ...(day.get(e.id) || { n: 0, cash: 0 }) }));
  } else if (onlyCourier) {
    const d = (await courierDay(me.id)).get(me.id) || { n: 0, cash: 0 };
    couriers = [{ id: me.id, name: me.name, phone: '', ...d }];
  }
  return NextResponse.json({ orders, bookings, couriers, newOnline, shift: shift && { id: shift.id, openedAt: shift.openedAt, openedBy: shift.openedBy }, now: Date.now() });
}
