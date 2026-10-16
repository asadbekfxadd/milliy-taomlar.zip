import 'server-only';
import { fmt, prettyPhone } from './format';

/* Telegram notifications for new orders, with inline buttons that change the status.
   Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (group or personal chat id),
        TELEGRAM_WEBHOOK_SECRET + PUBLIC_URL (for button presses). */

export const STATUS_RU: Record<string, string> = {
  new: '🆕 Новый',
  accepted: '✅ Принят',
  cooking: '🔥 Готовится',
  ready: '📦 Готов / в пути',
  done: '🏁 Завершён',
  cancelled: '✖️ Отменён',
};

export const tg = (method: string, body: unknown) => api(method, body);

const api = (method: string, body: unknown) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return Promise.resolve(null);
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
    .then((r) => r.json())
    .catch((e) => {
      console.error('telegram', method, e);
      return null;
    });
};

const h = (s: string) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

type O = {
  id: string; no: number; status: string; type: string; zone: string; address: string; name: string; phone: string;
  note: string; when: string; pay: string; fee: number; total: number; items: any; payStatus?: string; source?: string; tableNo?: number | null;
};
const PAY_TXT: Record<string, string> = { cash: 'Наличные', card: 'Карта при получении', payme: 'Payme', click: 'Click' };

export function orderText(o: O) {
  const items = (o.items as { name: string; mods: string; qty: number; sum: number }[])
    .map((i) => `• ${h(i.name)}${i.mods ? ` <i>(${h(i.mods)})</i>` : ''} × ${i.qty} — ${fmt(i.sum)}`)
    .join('\n');
  return [
    `<b>Заказ № ${o.no}</b> · ${STATUS_RU[o.status] ?? o.status}`,
    o.type === 'delivery' ? `🚗 Доставка: ${h(o.zone)}\n📍 ${h(o.address)}` : o.type === 'hall' ? `🍽 Стол ${o.tableNo ?? ''}` : '🛍 Самовывоз',
    `👤 ${h(o.name)} · <code>${h(prettyPhone(o.phone))}</code>`,
    o.when !== 'asap' ? `⏰ Ко времени: ${h(o.when)}` : '⏰ Как можно скорее',
    `💳 ${PAY_TXT[o.pay] || o.pay}${o.payStatus === 'paid' ? ' · ✅ оплачено' : o.payStatus === 'pending' ? ' · ⏳ ждём оплату' : ''}`,
    '',
    items,
    o.fee ? `Доставка — ${fmt(o.fee)}` : '',
    `<b>Итого: ${fmt(o.total)} сум</b>`,
    o.note ? `\n💬 ${h(o.note)}` : '',
  ]
    .filter((x) => x !== '')
    .join('\n');
}

export function keyboard(o: O) {
  const b = (text: string, st: string) => ({ text, callback_data: `st:${o.id}:${st}` });
  if (o.status === 'done' || o.status === 'cancelled') return { inline_keyboard: [] };
  return {
    inline_keyboard: [
      [b('✅ Принять', 'accepted'), b('🔥 Готовится', 'cooking')],
      [b(o.type === 'delivery' ? '🚗 Передан курьеру' : '📦 Готов к выдаче', 'ready'), b('🏁 Завершён', 'done')],
      [b('✖️ Отменить', 'cancelled')],
    ],
  };
}

export async function notifyNewOrder(o: O): Promise<number | null> {
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!chat) return null;
  const r: any = await api('sendMessage', { chat_id: chat, text: orderText(o), parse_mode: 'HTML', reply_markup: keyboard(o) });
  return r?.ok ? r.result.message_id : null;
}

export async function refreshOrderMessage(o: O & { tgMessageId: number | null }) {
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!chat || !o.tgMessageId) return;
  await api('editMessageText', {
    chat_id: chat,
    message_id: o.tgMessageId,
    text: orderText(o),
    parse_mode: 'HTML',
    reply_markup: keyboard(o),
  });
}

export const answerCallback = (id: string, text: string) => api('answerCallbackQuery', { callback_query_id: id, text });

export async function setWebhook() {
  const url = process.env.PUBLIC_URL?.replace(/\/$/, '');
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!url || !secret) return { ok: false, description: 'Нужны PUBLIC_URL и TELEGRAM_WEBHOOK_SECRET' };
  return api('setWebhook', { url: `${url}/api/telegram/webhook`, secret_token: secret, allowed_updates: ['callback_query', 'message'] });
}

let botName: string | null | undefined;
/** The bot's @username, used for the guest's "notify me in Telegram" link. */
export async function botUsername() {
  if (botName !== undefined) return botName;
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  const r: any = await api('getMe', {});
  botName = r?.ok ? r.result.username : null;
  return botName;
}

export const sendTest = () =>
  api('sendMessage', { chat_id: process.env.TELEGRAM_CHAT_ID, text: 'MANGO: уведомления о заказах подключены ✅' });
