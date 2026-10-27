import { NextResponse } from 'next/server';
import { guardAny } from '@/lib/auth';
import { getOrder, mapOrder, q } from '@/lib/db';
import { getSettings } from '@/lib/data';
import { listEmployees } from '@/lib/employees';
import { afterChange } from '@/lib/pos';
import { currentShift } from '@/lib/shifts';
import { audit } from '@/lib/audit';
import { can } from '@/lib/rbac';

export const dynamic = 'force-dynamic';
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/* Delivery: the dispatcher hands an order to a courier, or the courier takes it himself,
   then marks "picked up" and "delivered". Cash the courier collects counts in the open shift. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await guardAny(['courier', 'dispatch']);
  if ('res' in g) return g.res;
  const me = g.user;
  const b = await req.json().catch(() => null);
  const action = String(b?.action || '');
  const o = await getOrder(params.id);
  if (!o || o.type !== 'delivery') return bad('Доставка не найдена', 404);
  if (['done', 'cancelled'].includes(o.status)) return bad('Заказ уже закрыт');
  if (o.status === 'new') return bad('Заказ ещё не принят');
  const dispatcher = can(me.role, 'dispatch');
  const mine = o.courierId === me.id;
  const set = async (sql: string, args: unknown[]) => mapOrder((await q(`UPDATE orders SET ${sql}, updated_at = now() WHERE id = $1 RETURNING *`, [o.id, ...args])).rows[0]);

  switch (action) {
    case 'assign': {
      if (!dispatcher) return bad('Назначает кассир или управляющий', 403);
      if (o.pickedAt) return bad('Курьер уже забрал заказ');
      const id = String(b?.courier || '');
      if (!id) {
        const r = await set(`courier_id = '', courier = ''`, []);
        await audit(me, 'Курьер снят', `заказ № ${o.no}`);
        return NextResponse.json(r);
      }
      const c = (await listEmployees()).find((e) => e.id === id && e.role === 'courier');
      if (!c) return bad('Курьер не найден');
      const r = await set(`courier_id = $2, courier = $3`, [c.id, c.name]);
      await audit(me, 'Курьер назначен', `заказ № ${o.no} → ${c.name}`);
      return NextResponse.json(r);
    }
    case 'take': {
      if (!can(me.role, 'courier')) return bad('Только для курьера', 403);
      if (o.courierId && !mine) return bad(`Заказ уже у курьера ${o.courier}`);
      return NextResponse.json(await set(`courier_id = $2, courier = $3`, [me.id, me.name]));
    }
    case 'release': {
      if (!mine && !dispatcher) return bad('Это не ваш заказ', 403);
      if (o.pickedAt) return bad('Заказ уже в пути');
      return NextResponse.json(await set(`courier_id = '', courier = ''`, []));
    }
    case 'pickup': {
      if (!mine && !dispatcher) return bad('Это не ваш заказ', 403);
      if (!o.courierId) return bad('Сначала назначьте курьера');
      if (o.status !== 'ready' && !b?.force) return bad('Кухня ещё готовит. Дождитесь «Готов» на кухне');
      const r = await set(`picked_at = now(), status = 'ready'`, []);
      if (o.status !== 'ready') await afterChange(o, r, await getSettings());
      return NextResponse.json(r);
    }
    case 'delivered': {
      if (!mine && !dispatcher) return bad('Это не ваш заказ', 403);
      if (!o.pickedAt) return bad('Сначала отметьте «Забрал»');
      const shift = await currentShift();
      const paidOnline = o.payStatus === 'paid';
      const method = paidOnline ? o.paidWith || o.pay : o.pay === 'card' ? 'card' : 'cash';
      const r = paidOnline
        ? await set(`status = 'done', delivered_at = now()`, [])
        : await set(`status = 'done', delivered_at = now(), pay_status = 'paid', paid_with = $2, paid_at = now(), cashier = $3, shift_id = $4`, [method, o.courier || me.name, shift?.id ?? null]);
      await afterChange(o, r, await getSettings());
      await audit(me, 'Доставлено', `заказ № ${o.no}${paidOnline ? ' (оплачен онлайн)' : `, получено ${r.total} сум (${method === 'card' ? 'карта' : 'наличные'})`}`);
      return NextResponse.json(r);
    }
    default:
      return bad('Неизвестное действие');
  }
}
