import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { mapOrder, newId, q } from '@/lib/db';
import { getMenu, getSettings } from '@/lib/data';
import { orderInput } from '@/lib/schemas';
import { modsOf, promoDiscount, unitPrice } from '@/lib/pricing';
import { findPromo } from '@/lib/promo';
import { normalizePhone } from '@/lib/format';
import { notifyNewOrder } from '@/lib/telegram';
import { clientIp, limited } from '@/lib/rate';
import { saveItems, sendToKitchen, stationOf } from '@/lib/pos';
import type { OrderItem } from '@/lib/types';
import { checkoutUrl, isOnline, providers } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const bad = (error: string, field?: string, status = 400) => NextResponse.json({ error, field }, { status });

/* Guest-facing errors in the guest's language (Russian text is the key). */
const UZ: Record<string, string> = {
  'Слишком много заказов подряд. Попробуйте через несколько минут или позвоните нам.': 'Ketma-ket juda koʻp buyurtma. Bir necha daqiqadan soʻng urinib koʻring yoki bizga qoʻngʻiroq qiling.',
  'Некорректный запрос': 'Notoʻgʻri soʻrov',
  'Проверьте поля формы': 'Forma maydonlarini tekshiring',
  'Самовывоз сейчас недоступен': 'Olib ketish hozir mavjud emas',
  'Доставка сейчас недоступна': 'Yetkazib berish hozir mavjud emas',
  'Этот способ оплаты недоступен': 'Bu toʻlov usuli mavjud emas',
  'Неизвестный стол. Отсканируйте метку на столе ещё раз.': 'Nomaʼlum stol. Stoldagi belgini qayta skanerlang.',
  'За столом оплата официанту: наличными или картой': 'Stolda toʻlov ofitsiantga: naqd yoki karta bilan',
  'Укажите имя': 'Ismingizni kiriting',
  'Номер в формате +998 90 123 45 67': 'Raqam +998 90 123 45 67 koʻrinishida',
  'Одного из блюд больше нет в меню. Обновите корзину.': 'Taomlardan biri menyuda yoʻq. Savatni yangilang.',
  'Неверный размер порции. Обновите корзину.': 'Porsiya notoʻgʻri. Savatni yangilang.',
  'Неверная добавка. Обновите корзину.': 'Qoʻshimcha notoʻgʻri. Savatni yangilang.',
  'Выберите зону доставки': 'Yetkazish hududini tanlang',
  'Укажите улицу и дом': 'Koʻcha va uyni kiriting',
  'Такого промокода нет или он больше не действует': 'Bunday promokod yoʻq yoki muddati tugagan',
};

export async function POST(req: Request) {
  if (limited('order:' + clientIp(req), 6, 10 * 60_000)) return bad('Слишком много заказов подряд. Попробуйте через несколько минут или позвоните нам.', undefined, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad('Некорректный запрос');
  }
  const parsed = orderInput.safeParse(body);
  const lang = (body as { lang?: string })?.lang === 'uz' ? 'uz' : 'ru';
  const err = (ru: string, field?: string, status = 400) => bad(lang === 'uz' ? UZ[ru] ?? ru : ru, field, status);
  if (!parsed.success) return err('Проверьте поля формы');
  const o = parsed.data;
  if (o.website) return NextResponse.json({ ok: true }); // bot

  const [menu, st] = await Promise.all([getMenu(), getSettings()]);

  if (o.type === 'pickup' && !st.pickup) return err('Самовывоз сейчас недоступен');
  if (o.type === 'delivery' && !st.delivery) return err('Доставка сейчас недоступна');
  const online = isOnline(o.pay);
  if (online ? !providers()[o.pay as 'payme' | 'click'] : !st.pay[o.pay as 'cash' | 'card']) return err('Этот способ оплаты недоступен');
  const hall = o.type === 'hall';
  if (hall) {
    if (!o.table || o.table > (st.tables || 0)) return err('Неизвестный стол. Отсканируйте метку на столе ещё раз.');
    if (online) return err('За столом оплата официанту: наличными или картой');
  }
  if (!hall && o.name.length < 2) return err('Укажите имя', 'name');
  const phone = normalizePhone(o.phone) || (hall && !o.phone ? '' : null);
  if (phone === null) return err('Номер в формате +998 90 123 45 67', 'phone');

  // Prices are always recalculated here from the stored menu; the browser only sends ids and choices.
  const items = [];
  for (const i of o.items) {
    const d = menu.dishes.find((x) => x.id === i.id);
    if (!d || d.hidden || !menu.cats.some((c) => c.id === d.cat)) return err('Одного из блюд больше нет в меню. Обновите корзину.');
    if (!d.available) return err(lang === 'uz' ? `«${d.name}» bugun tugadi. Uni savatdan olib tashlang.` : `«${d.name}» сегодня закончилось. Уберите его из корзины.`);
    if (d.sizes.length ? i.si >= d.sizes.length : i.si !== 0) return err('Неверный размер порции. Обновите корзину.');
    const ex = [...new Set(i.ex)];
    if (ex.some((x) => x >= d.extras.length)) return err('Неверная добавка. Обновите корзину.');
    const unit = unitPrice(d, i.si, ex);
    items.push({ id: d.id, name: d.name, mods: modsOf(d, i.si, ex).join(', '), qty: i.qty, unit, sum: unit * i.qty, note: '', station: stationOf(menu, st, d.id), sent: false, ks: null as null });
  }
  const subtotal = items.reduce((s, i) => s + i.sum, 0);

  // At a table: add to the table's open check if there is one (like a waiter would), otherwise open a new one.
  if (hall) {
    const open = await q(`SELECT * FROM orders WHERE type = 'hall' AND table_no = $1 AND status NOT IN ('done','cancelled') ORDER BY created_at DESC LIMIT 1`, [o.table]);
    let check = open.rows[0] ? mapOrder(open.rows[0]) : null;
    if (!check) {
      const ins = await q(
        `INSERT INTO orders (id, token, type, name, phone, pay, items, subtotal, total, source, table_no, note, lang)
         VALUES ($1, $2, 'hall', $3, $4, $5, '[]', 0, 0, 'site', $6, $7, $8) RETURNING *`,
        [newId(), randomBytes(16).toString('hex'), o.name || `Стол ${o.table}`, phone, o.pay, o.table, o.note, lang],
      );
      check = mapOrder(ins.rows[0]);
    }
    const lines: OrderItem[] = [...(check.items as OrderItem[]), ...items.map((l) => ({ ...l, note: o.note || '' }))];
    check = await saveItems(check, lines, st);
    if (st.autoAcceptOnline) check = (await sendToKitchen(check, st)).order;
    try {
      const mid = await notifyNewOrder(check);
      if (mid && !check.tgMessageId) await q('UPDATE orders SET tg_message_id = $2 WHERE id = $1', [check.id, mid]);
    } catch {}
    return NextResponse.json({ id: check.id, token: check.token, no: check.no });
  }

  // promo: checked again here; the browser only sends the code
  const promo = o.promo ? findPromo(st, o.promo) : null;
  if (o.promo && !promo) return err('Такого промокода нет или он больше не действует');
  const discount = promoDiscount(promo, subtotal);

  let fee = 0,
    zone = '';
  if (o.type === 'delivery') {
    const z = st.zones[o.zone ?? -1];
    if (!z) return err('Выберите зону доставки', 'zone');
    if (!o.address || o.address.length < 5) return err('Укажите улицу и дом', 'address');
    if (subtotal < z.min) return err(lang === 'uz' ? `Bu hudud uchun minimal buyurtma ${z.min} soʻm` : `Минимальный заказ для этой зоны ${z.min} сум`);
    fee = z.fee;
    zone = z.name;
  }

  const r = await q(
    `INSERT INTO orders (id, token, type, zone, fee, address, name, phone, note, "when", pay, items, subtotal, total, pay_status, promo, promo_pct, promo_fixed, discount, lang)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
    [
      newId(), randomBytes(16).toString('hex'), o.type, zone, fee, o.type === 'delivery' ? o.address : '', o.name, phone, o.note, o.when, o.pay,
      JSON.stringify(items), subtotal, subtotal + fee - discount, online ? 'pending' : 'unpaid',
      discount ? promo!.code : '', discount && promo!.pct > 0 ? promo!.pct : 0, discount && !(promo!.pct > 0) ? promo!.fixed : 0, discount, lang,
    ],
  );
  let order = mapOrder(r.rows[0]);

  // Paid online: nothing reaches the kitchen until the provider confirms the payment.
  if (online) return NextResponse.json({ id: order.id, token: order.token, no: order.no, payUrl: checkoutUrl(o.pay, order) });

  // Like Jowi/R-Keeper: an online order goes straight to the kitchen and a slip prints at the cashier.
  if (st.autoAcceptOnline) {
    try {
      order = (await sendToKitchen(order, st, { slip: true })).order;
    } catch (e) {
      console.error('auto-accept failed', e);
    }
  }

  try {
    const mid = await notifyNewOrder({ ...order, items });
    if (mid) await q('UPDATE orders SET tg_message_id = $2 WHERE id = $1', [order.id, mid]);
  } catch (e) {
    console.error('notify failed', e);
  }

  return NextResponse.json({ id: order.id, token: order.token, no: order.no });
}
