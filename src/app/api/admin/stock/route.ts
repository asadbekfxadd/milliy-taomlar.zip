import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { countStock, createIngredient, listIngredients, listMoves, receive, UNITS, updateIngredient, writeOff } from '@/lib/stock';

export const dynamic = 'force-dynamic';
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const qty = z.coerce.number().positive('Количество должно быть больше нуля').max(1_000_000);
const unit = z.enum(UNITS as unknown as [string, ...string[]]);
const f = (n: number) => (Math.round(n * 1000) / 1000).toLocaleString('ru-RU');

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), name: z.string().trim().min(2, 'Название слишком короткое').max(80), unit, min: z.coerce.number().min(0).default(0), stock: z.coerce.number().min(0).default(0), cost: z.coerce.number().min(0).default(0) }),
  z.object({ action: z.literal('update'), id: z.string(), name: z.string().trim().min(2).max(80).optional(), unit: unit.optional(), min: z.coerce.number().min(0).optional(), active: z.boolean().optional() }),
  z.object({ action: z.literal('receive'), note: z.string().trim().max(160).default(''), lines: z.array(z.object({ ing: z.string(), qty, price: z.coerce.number().min(0).max(100_000_000) })).min(1).max(100) }),
  z.object({ action: z.literal('writeoff'), ing: z.string(), qty, note: z.string().trim().min(2, 'Укажите причину').max(160) }),
  z.object({ action: z.literal('count'), note: z.string().trim().max(160).default(''), lines: z.array(z.object({ ing: z.string(), actual: z.coerce.number().min(0).max(1_000_000) })).min(1).max(1000) }),
]);

export async function GET(req: Request) {
  const g = await guard('stock');
  if ('res' in g) return g.res;
  const sp = new URL(req.url).searchParams;
  const [ings, moves] = await Promise.all([listIngredients(true), listMoves({ ing: sp.get('ing') || undefined, kind: sp.get('kind') || undefined, days: Number(sp.get('days')) || 30, limit: 400 })]);
  return NextResponse.json({ ings, moves });
}

export async function POST(req: Request) {
  const g = await guard('stock');
  if ('res' in g) return g.res;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return bad(p.error.issues[0]?.message || 'Проверьте поля');
  const d = p.data;
  const ings = new Map((await listIngredients(true)).map((i) => [i.id, i]));
  const name = (id: string) => ings.get(id)?.name || '?';
  switch (d.action) {
    case 'create': {
      if ([...ings.values()].some((i) => i.name.toLowerCase() === d.name.toLowerCase())) return bad('Такой продукт уже есть');
      const id = await createIngredient({ name: d.name, unit: d.unit, min: d.min, cost: d.cost });
      if (d.stock > 0) await receive(id, d.stock, d.cost, 'начальный остаток', g.user.name);
      await audit(g.user, 'Склад: новый продукт', `${d.name}, ${d.unit}${d.stock ? `, остаток ${f(d.stock)}` : ''}`);
      return NextResponse.json({ id });
    }
    case 'update': {
      if (!ings.has(d.id)) return bad('Продукт не найден', 404);
      await updateIngredient(d.id, d);
      if (d.active === false) await audit(g.user, 'Склад: продукт скрыт', name(d.id));
      return NextResponse.json({ ok: true });
    }
    case 'receive': {
      for (const l of d.lines) if (!ings.has(l.ing)) return bad('В накладной неизвестный продукт');
      for (const l of d.lines) await receive(l.ing, l.qty, l.price, d.note, g.user.name);
      const sum = d.lines.reduce((s, l) => s + l.qty * l.price, 0);
      await audit(g.user, 'Склад: приход', `${d.note ? d.note + ' · ' : ''}${d.lines.length} поз. на ${f(Math.round(sum))} сум`);
      return NextResponse.json({ ok: true });
    }
    case 'writeoff': {
      if (!ings.has(d.ing)) return bad('Продукт не найден', 404);
      await writeOff(d.ing, d.qty, d.note, g.user.name);
      const i = ings.get(d.ing)!;
      await audit(g.user, 'Склад: списание', `${i.name} ${f(d.qty)} ${i.unit} (≈ ${f(Math.round(d.qty * i.cost))} сум). ${d.note}`);
      return NextResponse.json({ ok: true });
    }
    case 'count': {
      let changed = 0;
      for (const l of d.lines) {
        const i = ings.get(l.ing);
        if (!i) continue;
        if (Math.abs(i.stock - l.actual) > 1e-9) changed++;
        await countStock(l.ing, l.actual, g.user.name, d.note || 'инвентаризация');
      }
      await audit(g.user, 'Склад: инвентаризация', `${d.lines.length} поз., расхождений ${changed}`);
      return NextResponse.json({ ok: true, changed });
    }
  }
}
