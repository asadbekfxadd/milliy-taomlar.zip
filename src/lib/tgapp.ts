import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { q } from './db';

/* Telegram Mini App: the site opened inside Telegram sends `initData`, signed by Telegram with the bot token.
   We check the signature (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
   and trust the user id from it. No passwords, no cookies. */

export type TgUser = { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string };

export function verifyInitData(raw: string | undefined | null, maxAgeSec = 86400): TgUser | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!raw || !token || raw.length > 4096) return null;
  const p = new URLSearchParams(raw);
  const hash = p.get('hash');
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) return null;
  p.delete('hash');
  const check = [...p.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const mine = createHmac('sha256', secret).update(check).digest();
  if (!timingSafeEqual(mine, Buffer.from(hash, 'hex'))) return null;
  const at = Number(p.get('auth_date'));
  if (!at || Date.now() / 1000 - at > maxAgeSec) return null;
  try {
    const u = JSON.parse(p.get('user') || 'null');
    return u && typeof u.id === 'number' ? u : null;
  } catch {
    return null;
  }
}

export type TgRow = { id: number; name: string; username: string; phone: string; lang: string; blocked: boolean };
const map = (r: any): TgRow => ({ id: Number(r.id), name: r.name, username: r.username, phone: r.phone, lang: r.lang, blocked: r.blocked });

export async function getTgUser(id: number) {
  const r = await q(`SELECT * FROM tg_users WHERE id = $1`, [id]);
  return r.rows[0] ? map(r.rows[0]) : null;
}

/** Remember who wrote to the bot or opened the Mini App. The phone only comes from Telegram's own contact share. */
export async function upsertTgUser(u: TgUser, extra: { phone?: string; lang?: string } = {}) {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').slice(0, 80);
  const lang = extra.lang || (u.language_code === 'ru' ? 'ru' : 'uz');
  const r = await q(
    `INSERT INTO tg_users (id, name, username, phone, lang) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username,
       phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE tg_users.phone END, blocked = false, updated_at = now()
     RETURNING *`,
    [u.id, name, (u.username || '').slice(0, 64), extra.phone || '', lang],
  );
  return map(r.rows[0]);
}

export async function markBlocked(id: number) {
  await q(`UPDATE tg_users SET blocked = true, updated_at = now() WHERE id = $1`, [id]);
}
