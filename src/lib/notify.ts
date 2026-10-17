import 'server-only';
import { fmt } from './format';
import { tg } from './telegram';
import type { OrderRow } from './db';

/* Messages to the guest who linked their order to our Telegram bot.
   Sent whenever the order moves to a new stage. */

export const clock = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' }) : '';
const minsLeft = (iso: string | null) => (iso ? Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000)) : 0);

export function stageText(o: OrderRow, phone?: string): string | null {
  const uz = o.lang === 'uz';
  const no = `№ ${o.no}`;
  const at = clock(o.etaAt);
  const eta = o.etaAt ? (uz ? ` Taxminan ${at} da tayyor boʻladi (≈${minsLeft(o.etaAt)} daq).` : ` Будет готов примерно к ${at} (≈${minsLeft(o.etaAt)} мин).`) : '';
  const etaDel = o.etaAt ? (uz ? ` Taxminan ${at} da yetkazamiz.` : ` Привезём примерно к ${at}.`) : '';
  switch (o.status) {
    case 'accepted':
      return uz ? `✅ ${no} buyurtma qabul qilindi va oshxonaga berildi.${o.type === 'delivery' ? etaDel : eta}` : `✅ Заказ ${no} принят и передан на кухню.${o.type === 'delivery' ? etaDel : eta}`;
    case 'cooking':
      return uz ? `🔥 Oshpaz ${no} buyurtmangizni tayyorlayapti.` : `🔥 Повар готовит ваш заказ ${no}.`;
    case 'ready':
      if (o.type === 'delivery') return uz ? `🚗 ${no} buyurtma tayyor va kuryerga berildi. Tez orada yetib boramiz!` : `🚗 Заказ ${no} готов и передан курьеру. Скоро будем у вас!`;
      if (o.type === 'pickup') return uz ? `🛍 ${no} buyurtma tayyor! Olib ketishingiz mumkin.` : `🛍 Заказ ${no} готов! Можно забирать.`;
      return uz ? `🍽 ${no} buyurtma tayyor, olib chiqyapmiz.` : `🍽 Заказ ${no} готов, уже выносим.`;
    case 'done':
      return o.type === 'hall' ? null : uz ? `🙏 ${no} buyurtma uchun rahmat! Yoqimli ishtaha.` : `🙏 Спасибо за заказ ${no}! Приятного аппетита.`;
    case 'cancelled':
      return uz
        ? `✖️ ${no} buyurtma bekor qilindi.${phone ? ` Agar bu xato boʻlsa, qoʻngʻiroq qiling: ${phone}` : ''}`
        : `✖️ Заказ ${no} отменён.${phone ? ` Если это ошибка, позвоните: ${phone}` : ''}`;
    default:
      return null;
  }
}

export async function tellGuest(o: OrderRow, text: string | null) {
  if (!text || !o.customerChat) return;
  await tg('sendMessage', { chat_id: o.customerChat, text });
}

export const paidText = (o: OrderRow) => (o.lang === 'uz' ? `💳 Toʻlov qabul qilindi: ${fmt(o.total)} soʻm. Rahmat!` : `💳 Оплата получена: ${fmt(o.total)} сум. Спасибо!`);
export const etaText = (o: OrderRow) =>
  o.lang === 'uz' ? `⏱ № ${o.no} buyurtmaning yangi tayyor boʻlish vaqti: ${clock(o.etaAt)}.` : `⏱ Новое время готовности заказа № ${o.no}: ${clock(o.etaAt)}.`;
