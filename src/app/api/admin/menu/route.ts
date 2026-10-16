import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/auth';
import { saveDoc } from '@/lib/db';
import { menuSchema } from '@/lib/schemas';
import { MENU_VERSION } from '@/lib/defaults';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const p = menuSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Меню не прошло проверку: ' + p.error.issues[0]?.path.join('.') }, { status: 400 });
  const ids = new Set(p.data.dishes.map((d) => d.id));
  if (ids.size !== p.data.dishes.length) return NextResponse.json({ error: 'У двух блюд одинаковый id' }, { status: 400 });
  await saveDoc('menu', { ...p.data, v: MENU_VERSION });
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true });
}
