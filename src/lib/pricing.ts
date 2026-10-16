import type { CartItem, Dish, Menu } from './types';

/** Shared by the browser (display) and the server (the only source of truth for totals). */
export const basePrice = (d: Dish) => (d.sizes?.length ? Number(d.sizes[0].p) : Number(d.price)) || 0;

export function unitPrice(d: Dish, si: number, ex: number[]) {
  const size = d.sizes?.length ? d.sizes[si] ?? d.sizes[0] : null;
  const base = size ? Number(size.p) : Number(d.price);
  return (base || 0) + (ex || []).reduce((s, i) => s + (Number(d.extras?.[i]?.p) || 0), 0);
}

export function portionLabel(d: Dish, si = 0) {
  return d.sizes?.length ? (d.sizes[si] ?? d.sizes[0]).w : d.weight;
}

export function modsOf(d: Dish, si: number, ex: number[]) {
  const size = d.sizes?.length ? d.sizes[si] ?? d.sizes[0] : null;
  return [size && d.sizes.length > 1 ? size.label : null, ...ex.map((i) => d.extras?.[i]?.label)].filter(Boolean) as string[];
}

export const cartKey = (id: string, si: number, ex: number[]) => `${id}|${si}|${[...ex].sort((a, b) => a - b).join(',')}`;

export function priceCart(menu: Menu, cart: CartItem[]) {
  const lines = cart
    .map((i) => {
      const d = menu.dishes.find((x) => x.id === i.id);
      if (!d) return null;
      const unit = unitPrice(d, i.si, i.ex);
      return { ...i, d, unit, total: unit * i.qty, mods: modsOf(d, i.si, i.ex) };
    })
    .filter(Boolean) as (CartItem & { d: Dish; unit: number; total: number; mods: string[] })[];
  return { lines, subtotal: lines.reduce((s, l) => s + l.total, 0) };
}
