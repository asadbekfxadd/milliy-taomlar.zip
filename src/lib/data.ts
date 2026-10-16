import 'server-only';
import { unstable_noStore as noStore } from 'next/cache';
import { loadDoc } from './db';
import { D, DEFAULT_CATS, DEFAULT_DISHES, DEFAULT_SETTINGS } from './defaults';
import type { Menu, Settings } from './types';

export async function getMenu(): Promise<Menu> {
  noStore();
  try {
    const m = await loadDoc<Menu>('menu');
    if (m?.cats && m?.dishes) return { cats: m.cats, dishes: m.dishes.map((d) => D(d)) };
  } catch (e) {
    console.error('getMenu: falling back to defaults', e);
  }
  return { cats: DEFAULT_CATS, dishes: DEFAULT_DISHES };
}

export async function getSettings(): Promise<Settings> {
  noStore();
  try {
    const d = await loadDoc<Partial<Settings>>('settings');
    if (d) return { ...structuredClone(DEFAULT_SETTINGS), ...d } as Settings;
  } catch (e) {
    console.error('getSettings: falling back to defaults', e);
  }
  return structuredClone(DEFAULT_SETTINGS);
}

export const integrations = () => ({
  telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  telegramWebhook: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET && process.env.PUBLIC_URL),
  payme: false,
  click: false,
});
