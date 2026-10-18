import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { guard } from '@/lib/auth';
import { saveDoc } from '@/lib/db';
import { getMenu } from '@/lib/data';
import { menuSchema } from '@/lib/schemas';
import { MENU_VERSION } from '@/lib/defaults';
import { audit } from '@/lib/audit';
import type { Menu } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Short human summary of what changed, for the action log. */
function diff(a: Menu, b: Menu) {
  const out: string[] = [];
  const old = new Map(a.dishes.map((d) => [d.id, d]));
  for (const d of b.dishes) {
    const o = old.get(d.id);
    if (!o) out.push(`+ ${d.ru || d.name}`);
    else {
      if (o.price !== d.price) out.push(`${d.ru || d.name}: цена ${o.price} → ${d.price}`);
      if (JSON.stringify(o.sizes.map((s) => s.p)) !== JSON.stringify(d.sizes.map((s) => s.p))) out.push(`${d.ru || d.name}: цены порций`);
      if (o.available !== d.available) out.push(`${d.ru || d.name}: ${d.available ? 'в наличии' : 'стоп-лист'}`);
      if (o.hidden !== d.hidden) out.push(`${d.ru || d.name}: ${d.hidden ? 'скрыто' : 'показано'}`);
    }
    old.delete(d.id);
  }
  for (const d of old.values()) out.push(`− ${d.ru || d.name}`);
  if (JSON.stringify(a.cats) !== JSON.stringify(b.cats)) out.push('категории');
  if (JSON.stringify(a.combos ?? []) !== JSON.stringify(b.combos ?? [])) out.push('сеты');
  return out.slice(0, 30).join('; ') || 'описания и фото';
}

export async function PUT(req: Request) {
  const g = await guard('menu');
  if ('res' in g) return g.res;
  const p = menuSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Меню не прошло проверку: ' + p.error.issues[0]?.path.join('.') }, { status: 400 });
  const ids = new Set(p.data.dishes.map((d) => d.id));
  if (ids.size !== p.data.dishes.length) return NextResponse.json({ error: 'У двух блюд одинаковый id' }, { status: 400 });
  const before = await getMenu();
  await saveDoc('menu', { ...p.data, v: MENU_VERSION });
  const prev = menuSchema.safeParse(before);
  await audit(g.user, 'Меню сохранено', diff(prev.success ? (prev.data as Menu) : before, p.data as Menu));
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true });
}
