import type { Settings } from './types';

export function findPromo(st: Settings, raw: string) {
  const code = (raw || '').trim().toUpperCase();
  if (!code) return null;
  return (st.promos ?? []).find((p) => p.active && p.code.toUpperCase() === code && (p.pct > 0 || p.fixed > 0)) ?? null;
}

import type { Menu } from './types';

/** Menu as guests see it: hidden dishes and combos that use them are left out. */
export function publicMenu(m: Menu): Menu {
  const dishes = m.dishes.filter((d) => !d.hidden);
  return { ...m, dishes, combos: (m.combos ?? []).filter((c) => c.items.every((i) => dishes.some((d) => d.id === i.id))) };
}

/** Settings as sent to guests' browsers: promo codes stay on the server. */
export const publicSettings = (st: Settings): Settings => ({ ...st, promos: [] });
