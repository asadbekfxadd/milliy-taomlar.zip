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
  const no = `№ ${o.no}`;
  const eta = o.etaAt ? ` Будет готов примерно к ${clock(o.etaAt)} (≈${minsLeft(o.etaAt)} мин).` : '';
  const etaDel = o.etaAt ? ` Привезём примерно к ${clock(o.etaAt)}.` : '';
  switch (o.status) {
    case 'accepted':
      return `✅ Заказ ${no} принят и передан на кухню.${o.type === 'delivery' ? etaDel : eta}`;
    case 'cooking':
      return `🔥 Повар готовит ваш заказ ${no}.`;
    case 'ready':
      return o.type === 'delivery'
        ? `🚗 Заказ ${no} готов и передан курьеру. Скоро будем у вас!`
        : o.type === 'pickup'
          ? `🛍 Заказ ${no} готов! Можно забирать.`
          : `🍽 Заказ ${no} готов, уже выносим.`;
    case 'done':
      return o.type === 'hall' ? null : `🙏 Спасибо за заказ ${no}! Приятного аппетита.`;
    case 'cancelled':
      return `✖️ Заказ ${no} отменён.${phone ? ` Если это ошибка, позвоните: ${phone}` : ''}`;
    default:
      return null;
  }
}

export async function tellGuest(o: OrderRow, text: string | null) {
  if (!text || !o.customerChat) return;
  await tg('sendMessage', { chat_id: o.customerChat, text });
}

export const paidText = (o: OrderRow) => `💳 Оплата получена: ${fmt(o.total)} сум. Спасибо!`;
export const etaText = (o: OrderRow) => `⏱ Новое время готовности заказа № ${o.no}: ${clock(o.etaAt)}.`;
