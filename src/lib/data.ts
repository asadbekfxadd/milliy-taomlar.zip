import 'server-only';
import { unstable_noStore as noStore } from 'next/cache';
import { loadDoc, saveDoc } from './db';
import { D, DEFAULT_CATS, DEFAULT_COMBOS, DEFAULT_DISHES, DEFAULT_SETTINGS, LEGACY_IDS, MENU_VERSION } from './defaults';
import type { Menu, Settings } from './types';
import { providers } from './payments';

const defaultMenu = (): Menu => ({ cats: DEFAULT_CATS, dishes: DEFAULT_DISHES, combos: DEFAULT_COMBOS, v: MENU_VERSION });

/* A menu saved before v2 that still holds only the stock example dishes (no own dishes, no uploaded photos)
   is replaced by the new default once; the old one is kept as `menu_backup_v1`. */
async function upgrade(m: Menu): Promise<Menu> {
  const untouched = m.dishes.every((d) => LEGACY_IDS.has(d.id) && (!d.photo || /^https:\/\/images\.unsplash\.com\//.test(d.photo)));
  if (untouched) {
    try {
      await saveDoc('menu_backup_v1', m);
      await saveDoc('menu', defaultMenu());
      console.log('menu: upgraded stock menu to v' + MENU_VERSION);
    } catch (e) {
      console.error('menu upgrade failed', e);
    }
    return defaultMenu();
  }
  // edited by the owner: keep everything, only add the new combos block
  return { ...m, combos: m.combos ?? DEFAULT_COMBOS.filter((c) => c.items.every((i) => m.dishes.some((d) => d.id === i.id))), v: MENU_VERSION };
}

/* v3 -> v4: stock photos were added. Prices and edits the owner made are kept; a dish only gets the stock
   photo when it still has no photo of its own. */
async function addStockPhotos(m: Menu): Promise<Menu> {
  const next: Menu = {
    ...m,
    dishes: m.dishes.map((d) => {
      if (d.photo) return d;
      const def = DEFAULT_DISHES.find((x) => x.id === d.id);
      return def?.photo ? { ...d, photo: def.photo } : d;
    }),
    v: MENU_VERSION,
  };
  try {
    await saveDoc('menu', next);
    console.log('menu: added stock photos (v' + MENU_VERSION + ')');
  } catch (e) {
    console.error('menu photo upgrade failed', e);
  }
  return next;
}

export async function getMenu(): Promise<Menu> {
  noStore();
  try {
    let m = await loadDoc<Menu>('menu');
    if (m?.cats && m?.dishes) {
      if ((m.v ?? 1) < 3) m = await upgrade(m);
      else if ((m.v ?? 1) < MENU_VERSION) m = await addStockPhotos(m);
      return { cats: m.cats, dishes: m.dishes.map((d) => D(d)), combos: m.combos ?? [], v: m.v };
    }
  } catch (e) {
    console.error('getMenu: falling back to defaults', e);
  }
  return defaultMenu();
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
  ...providers(),
  site: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
});
