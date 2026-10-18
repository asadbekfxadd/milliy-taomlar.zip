import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { getMenu } from '@/lib/data';
import { saveRecipe } from '@/lib/stock';

export const dynamic = 'force-dynamic';

const schema = z.object({
  dishId: z.string().min(1).max(64),
  si: z.number().int().min(-1).max(50),
  lines: z.array(z.object({ ing: z.string().min(1).max(64), qty: z.coerce.number().min(0).max(1000) })).max(60),
});

export async function PUT(req: Request) {
  const g = await guard('recipes');
  if ('res' in g) return g.res;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Проверьте количества' }, { status: 400 });
  const d = (await getMenu()).dishes.find((x) => x.id === p.data.dishId);
  if (!d) return NextResponse.json({ error: 'Блюдо не найдено' }, { status: 404 });
  await saveRecipe(p.data.dishId, p.data.si, p.data.lines);
  await audit(g.user, 'Техкарта сохранена', `${d.ru || d.name}${p.data.si >= 0 ? ' · ' + (d.sizes[p.data.si]?.label || '') : ''}: ${p.data.lines.filter((l) => l.qty > 0).length} продуктов`);
  return NextResponse.json({ ok: true });
}
