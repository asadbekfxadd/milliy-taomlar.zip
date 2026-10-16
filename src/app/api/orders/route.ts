import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { mapOrder, newId, q } from '@/lib/db';
import { getMenu, getSettings } from '@/lib/data';
import { orderInput } from '@/lib/schemas';
import { modsOf, unitPrice } from '@/lib/pricing';
import { normalizePhone } from '@/lib/format';
import { notifyNewOrder } from '@/lib/telegram';
import { clientIp, limited } from '@/lib/rate';

export const dynamic = 'force-dynamic';

const bad = (error: string, field?: string, status = 400) => NextResponse.json({ error, field }, { status });

export async function POST(req: Request) {
  if (limited('order:' + clientIp(req), 6, 10 * 60_000)) return bad('Слишком много заказов подряд. Попробуйте через несколько минут или позвоните нам.', undefined, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad('Некорректный запрос');
  }
  const parsed = orderInput.safeParse(body);
  if (!parsed.success) return bad('Проверьте поля формы');
  const o = parsed.data;
  if (o.website) return NextResponse.json({ ok: true }); // bot

  const [menu, st] = await Promise.all([getMenu(), getSettings()]);

  if (o.type === 'pickup' && !st.pickup) return bad('Самовывоз сейчас недоступен');
  if (o.type === 'delivery' && !st.delivery) return bad('Доставка сейчас недоступна');
  if (!st.pay[o.pay]) return bad('Этот способ оплаты недоступен');
  if (o.name.length < 2) return bad('Укажите имя', 'name');
  const phone = normalizePhone(o.phone);
  if (!phone) return bad('Номер в формате +998 90 123 45 67', 'phone');

  // Prices are always recalculated here from the stored menu; the browser only sends ids and choices.
  const items = [];
  for (const i of o.items) {
    const d = menu.dishes.find((x) => x.id === i.id);
    if (!d || !menu.cats.some((c) => c.id === d.cat)) return bad('Одного из блюд больше нет в меню. Обновите корзину.');
    if (!d.available) return bad(`«${d.name}» сегодня закончилось. Уберите его из корзины.`);
    if (d.sizes.length ? i.si >= d.sizes.length : i.si !== 0) return bad('Неверный размер порции. Обновите корзину.');
    const ex = [...new Set(i.ex)];
    if (ex.some((x) => x >= d.extras.length)) return bad('Неверная добавка. Обновите корзину.');
    const unit = unitPrice(d, i.si, ex);
    items.push({ id: d.id, name: d.name, mods: modsOf(d, i.si, ex).join(', '), qty: i.qty, unit, sum: unit * i.qty });
  }
  const subtotal = items.reduce((s, i) => s + i.sum, 0);

  let fee = 0,
    zone = '';
  if (o.type === 'delivery') {
    const z = st.zones[o.zone ?? -1];
    if (!z) return bad('Выберите зону доставки', 'zone');
    if (!o.address || o.address.length < 5) return bad('Укажите улицу и дом', 'address');
    if (subtotal < z.min) return bad(`Минимальный заказ для этой зоны ${z.min} сум`);
    fee = z.fee;
    zone = z.name;
  }

  const r = await q(
    `INSERT INTO orders (id, token, type, zone, fee, address, name, phone, note, "when", pay, items, subtotal, total)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [newId(), randomBytes(16).toString('hex'), o.type, zone, fee, o.type === 'delivery' ? o.address : '', o.name, phone, o.note, o.when, o.pay, JSON.stringify(items), subtotal, subtotal + fee],
  );
  const order = mapOrder(r.rows[0]);

  try {
    const mid = await notifyNewOrder({ ...order, items });
    if (mid) await q('UPDATE orders SET tg_message_id = $2 WHERE id = $1', [order.id, mid]);
  } catch (e) {
    console.error('notify failed', e);
  }

  return NextResponse.json({ id: order.id, token: order.token, no: order.no });
}
