import { timingSafeEqual } from 'crypto';
import { getOrder, q } from '@/lib/db';
import { getSettings } from '@/lib/data';
import { sendToKitchen, updateStatus } from '@/lib/pos';
import { answerCallback, STATUS_RU, tg } from '@/lib/telegram';
import { stageText } from '@/lib/notify';
import { guestMessage } from '@/lib/guestbot';
import { upsertTgUser } from '@/lib/tgapp';
import type { OrderItem } from '@/lib/types';

export const dynamic = 'force-dynamic';
const ALLOWED = ['accepted', 'cooking', 'ready', 'done', 'cancelled'];

/* Two kinds of updates:
   - button presses in the restaurant chat (change an order's status);
   - a guest opening the bot from their order page: /start o<orderId><token prefix> links the chat to the order. */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) return new Response('forbidden', { status: 403 });

  const u = await req.json().catch(() => null);
  const st = await getSettings();

  const msg = u?.message;
  if (msg?.chat?.type === 'private') {
    const m = typeof msg.text === 'string' ? msg.text.match(/^\/start\s+o([a-f0-9]{24})([a-f0-9]{16})$/) : null;
    if (!m) {
      const handled = await guestMessage(msg, st).catch((e) => (console.error('guestbot', e), false));
      if (!handled)
        await tg('sendMessage', {
          chat_id: msg.chat.id,
          text: `Assalomu alaykum! Bu ${st.name} boti. /menu — menyu, /bonus — ballar, /orders — buyurtmalar.\n\nЗдравствуйте! Это бот ${st.name}. /menu — меню, /bonus — баллы, /orders — заказы.`,
        });
      return Response.json({ ok: true });
    }
    if (msg.from) await upsertTgUser(msg.from).catch(() => {});
    const o = await getOrder(m[1]);
    const ok = o && o.token.length >= 16 && timingSafeEqual(Buffer.from(o.token.slice(0, 16)), Buffer.from(m[2]));
    if (!o || !ok) {
      await tg('sendMessage', { chat_id: msg.chat.id, text: 'Buyurtma topilmadi. Havolani buyurtma sahifasidan qayta oching.\nЗаказ не найден. Откройте ссылку со страницы заказа ещё раз.' });
      return Response.json({ ok: true });
    }
    await q('UPDATE orders SET customer_chat = $2 WHERE id = $1', [o.id, msg.chat.id]);
    const now = stageText({ ...o, customerChat: msg.chat.id }, st.phone);
    const waitPay = o.payStatus === 'pending' ? ' Ожидаем оплату.' : '';
    await tg('sendMessage', {
      chat_id: msg.chat.id,
      text:
        o.lang === 'uz'
          ? `Tayyor! № ${o.no} buyurtma boʻyicha barcha oʻzgarishlarni shu yerga yuboramiz.${o.payStatus === 'pending' ? ' Toʻlovni kutyapmiz.' : ''}${now ? '\n\n' + now : o.status === 'new' ? '\n\nBuyurtma qabul qilindi va tasdiqlanishini kutmoqda.' : ''}`
          : `Готово! Пришлём сюда все изменения по заказу № ${o.no}.${waitPay}${now ? '\n\n' + now : o.status === 'new' ? '\n\nЗаказ получен и ждёт подтверждения.' : ''}`,
    });
    return Response.json({ ok: true });
  }

  const cq = u?.callback_query;
  if (!cq) return Response.json({ ok: true });

  // Only the restaurant chat may change statuses.
  if (String(cq.message?.chat?.id) !== String(process.env.TELEGRAM_CHAT_ID)) {
    await answerCallback(cq.id, 'Нет доступа');
    return Response.json({ ok: true });
  }
  const [kind, id, status] = String(cq.data || '').split(':');
  if (kind !== 'st' || !id || !ALLOWED.includes(status)) {
    await answerCallback(cq.id, 'Неизвестная команда');
    return Response.json({ ok: true });
  }
  const cur = await getOrder(id);
  if (!cur) {
    await answerCallback(cq.id, 'Заказ не найден');
    return Response.json({ ok: true });
  }
  // "Принять" on an order that is not in the kitchen yet = send it there (runners print, guest gets the time).
  const o =
    status === 'accepted' && (cur.items as OrderItem[]).some((l) => !l.sent)
      ? (await sendToKitchen(cur, st, { slip: true })).order
      : await updateStatus(id, status, st);
  await answerCallback(cq.id, `№ ${o?.no ?? cur.no}: ${STATUS_RU[status]}`);
  return Response.json({ ok: true });
}
