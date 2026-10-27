import 'server-only';
import { q } from './db';
import { tg } from './telegram';
import { normalizePhone, fmt, prettyPhone } from './format';
import { balance, cfgOf } from './loyalty';
import { upsertTgUser, type TgUser } from './tgapp';
import type { Settings } from './types';

/* The guests' side of the bot: menu as a Mini App, sharing the phone, points and recent orders.
   Works only in private chats. */

const site = () => process.env.PUBLIC_URL?.replace(/\/$/, '') || '';

const T = {
  hi: (n: string, uz: boolean) =>
    uz
      ? `Assalomu alaykum! Bu ${n} boti.\n\n🍽 «Menyu» tugmasi — taom tanlash va buyurtma berish.\n📱 Raqamingizni ulashing — buyurtmalarda avtomatik qoʻyiladi va ball yigʻiladi.\n\n/bonus — ballarim · /orders — buyurtmalarim`
      : `Здравствуйте! Это бот ${n}.\n\n🍽 Кнопка «Меню» — выбрать блюда и заказать.\n📱 Поделитесь номером — он подставится в заказ, и будут копиться баллы.\n\n/bonus — мои баллы · /orders — мои заказы`,
  share: (uz: boolean) => (uz ? '📱 Raqamni ulashish' : '📱 Поделиться номером'),
  menu: (uz: boolean) => (uz ? '🍽 Menyu' : '🍽 Меню'),
  notYours: (uz: boolean) => (uz ? 'Faqat oʻz raqamingizni tugma orqali yuboring.' : 'Отправьте свой номер кнопкой ниже — чужой контакт не подойдёт.'),
  saved: (p: string, pts: number, on: boolean, uz: boolean) =>
    uz ? `✅ Raqam saqlandi: ${p}.${on ? ` Hisobingizda ${fmt(pts)} ball.` : ''}` : `✅ Номер сохранён: ${p}.${on ? ` На счету ${fmt(pts)} баллов.` : ''}`,
  noPhone: (uz: boolean) => (uz ? 'Avval raqamingizni ulashing — pastdagi tugma.' : 'Сначала поделитесь номером — кнопка внизу.'),
};

function keyboard(uz: boolean, withShare: boolean) {
  const rows: unknown[][] = [];
  if (site()) rows.push([{ text: T.menu(uz), web_app: { url: site() + '/' } }]);
  if (withShare) rows.push([{ text: T.share(uz), request_contact: true }]);
  return { keyboard: rows, resize_keyboard: true, is_persistent: true };
}

async function say(chat: number, text: string, extra: Record<string, unknown> = {}) {
  const r: any = await tg('sendMessage', { chat_id: chat, text, ...extra });
  if (r && !r.ok && r.error_code === 403) await q(`UPDATE tg_users SET blocked = true WHERE id = $1`, [chat]);
  return r;
}

/** Handle a private message from a guest. Returns true when it was handled here. */
export async function guestMessage(msg: any, st: Settings) {
  const from: TgUser | undefined = msg?.from;
  if (!from || msg.chat?.type !== 'private') return false;
  const text: string = typeof msg.text === 'string' ? msg.text.trim() : '';
  const cfg = cfgOf(st);

  // a phone shared with Telegram's own button: trust it only if it is the sender's own contact
  if (msg.contact) {
    const uz = from.language_code !== 'ru';
    if (msg.contact.user_id !== from.id) {
      await say(msg.chat.id, T.notYours(uz));
      return true;
    }
    const phone = normalizePhone(String(msg.contact.phone_number || ''));
    if (!phone) {
      await say(msg.chat.id, uz ? 'Faqat Oʻzbekiston raqamlari qabul qilinadi.' : 'Принимаем только узбекские номера.');
      return true;
    }
    const row = await upsertTgUser(from, { phone });
    const pts = await balance(phone);
    await say(msg.chat.id, T.saved(prettyPhone(phone), pts, cfg.enabled, row.lang === 'uz'), { reply_markup: keyboard(row.lang === 'uz', false) });
    return true;
  }

  const row = await upsertTgUser(from);
  const uz = row.lang === 'uz';
  if (/^\/start(\s+(phone|menu))?$/.test(text) || text === '/menu') {
    await say(msg.chat.id, T.hi(st.name, uz), { reply_markup: keyboard(uz, !row.phone) });
    return true;
  }
  if (text === '/bonus') {
    if (!row.phone) await say(msg.chat.id, T.noPhone(uz), { reply_markup: keyboard(uz, true) });
    else if (!cfg.enabled) await say(msg.chat.id, uz ? 'Ballar tizimi hozircha yoqilmagan.' : 'Баллы пока не начисляются.');
    else {
      const pts = await balance(row.phone);
      await say(
        msg.chat.id,
        uz
          ? `🎁 Hisobingizda ${fmt(pts)} ball (1 ball = 1 soʻm).\nHar buyurtmadan ${cfg.earnPct}% qaytadi, buyurtmaning ${cfg.maxRedeemPct}% gacha ballar bilan toʻlash mumkin.`
          : `🎁 На счету ${fmt(pts)} баллов (1 балл = 1 сум).\nС каждого заказа возвращается ${cfg.earnPct}%, баллами можно оплатить до ${cfg.maxRedeemPct}% заказа.`,
      );
    }
    return true;
  }
  if (text === '/orders') {
    const r = await q(
      `SELECT id, no, status, total, created_at, token FROM orders WHERE (customer_chat = $1 OR ($2 <> '' AND phone = $2)) AND type <> 'hall' ORDER BY created_at DESC LIMIT 5`,
      [from.id, row.phone],
    );
    if (!r.rows.length) await say(msg.chat.id, uz ? 'Hozircha buyurtmalar yoʻq.' : 'Заказов пока нет.');
    else {
      const S: Record<string, [string, string]> = { new: ['Новый', 'Yangi'], accepted: ['Принят', 'Qabul qilindi'], cooking: ['Готовится', 'Tayyorlanmoqda'], ready: ['Готов', 'Tayyor'], done: ['Выдан', 'Berildi'], cancelled: ['Отменён', 'Bekor qilindi'] };
      const lines = r.rows.map((o) => `№ ${o.no} · ${fmt(o.total)} · ${S[o.status]?.[uz ? 1 : 0] || o.status}${site() ? `\n${site()}/order/${o.id}?t=${o.token}` : ''}`);
      await say(msg.chat.id, lines.join('\n\n'), { disable_web_page_preview: true });
    }
    return true;
  }
  if (text === '/help' || text.startsWith('/')) {
    await say(msg.chat.id, T.hi(st.name, uz), { reply_markup: keyboard(uz, !row.phone) });
    return true;
  }
  return false;
}

/** One click in the admin: commands, the "Menu" button that opens the site as a Mini App, and the description. */
export async function setupGuestBot(st: Settings) {
  const url = site();
  if (!url.startsWith('https://')) return { ok: false, description: 'Нужен PUBLIC_URL с https://' };
  const steps = await Promise.all([
    tg('setMyCommands', {
      commands: [
        { command: 'menu', description: 'Menyu / Меню' },
        { command: 'bonus', description: 'Ballarim / Мои баллы' },
        { command: 'orders', description: 'Buyurtmalarim / Мои заказы' },
      ],
    }),
    tg('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Menyu', web_app: { url: url + '/' } } }),
    tg('setMyShortDescription', { short_description: `${st.name}: buyurtma, yetkazish, ballar / заказ, доставка, баллы`.slice(0, 120) }),
  ]);
  const bad = steps.find((x: any) => !x?.ok) as any;
  return bad ? { ok: false, description: bad?.description || 'Telegram не ответил' } : { ok: true, description: '' };
}
