import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { listIngredients } from '@/lib/stock';
import { createPurchase, debts, getPurchase, listPurchases, listSuppliers, receivePurchase, saveSupplier, suggestion, updatePurchase } from '@/lib/purchases';

export const dynamic = 'force-dynamic';
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const money = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
const line = z.object({ ing: z.string().min(1), qty: z.coerce.number().min(0).max(1_000_000), price: z.coerce.number().min(0).max(100_000_000) });
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('supplier'), id: z.string().optional(), name: z.string().trim().min(2, 'Название поставщика').max(80), phone: z.string().trim().max(40).default(''), note: z.string().trim().max(200).default(''), active: z.boolean().default(true) }),
  z.object({ action: z.literal('create'), supplierId: z.string().default(''), note: z.string().trim().max(200).default(''), lines: z.array(line).min(1).max(100) }),
  z.object({ action: z.literal('auto') }),
  z.object({ action: z.literal('update'), id: z.number().int(), supplierId: z.string().optional(), note: z.string().trim().max(200).optional(), lines: z.array(line).max(100).optional() }),
  z.object({ action: z.literal('order'), id: z.number().int() }),
  z.object({ action: z.literal('receive'), id: z.number().int(), lines: z.array(line).min(1).max(100) }),
  z.object({ action: z.literal('cancel'), id: z.number().int() }),
  z.object({ action: z.literal('paid'), id: z.number().int(), paid: z.boolean() }),
]);

export async function GET() {
  const g = await guard('stock');
  if ('res' in g) return g.res;
  const [suppliers, purchases, suggest, owe, ings] = await Promise.all([listSuppliers(), listPurchases(), suggestion(), debts(), listIngredients()]);
  return NextResponse.json({ suppliers, purchases, suggest, debts: owe, ings });
}

export async function POST(req: Request) {
  const g = await guard('stock');
  if ('res' in g) return g.res;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return bad(p.error.issues[0]?.message || 'Проверьте поля');
  const d = p.data;
  const sups = await listSuppliers();
  const sname = (id: string) => sups.find((x) => x.id === id)?.name || 'без поставщика';
  const ings = new Set((await listIngredients(true)).map((i) => i.id));
  const known = (ls?: { ing: string }[]) => !ls || ls.every((l) => ings.has(l.ing));
  switch (d.action) {
    case 'supplier': {
      const id = await saveSupplier(d);
      await audit(g.user, d.id ? 'Поставщик изменён' : 'Новый поставщик', d.name);
      return NextResponse.json({ id });
    }
    case 'create': {
      if (!known(d.lines)) return bad('Неизвестный продукт в заказе');
      const r = await createPurchase(d.supplierId, d.lines, d.note, g.user.name);
      await audit(g.user, 'Закупка создана', `№ ${r.id} · ${sname(d.supplierId)} · ${money(r.total)} сум`);
      return NextResponse.json(r);
    }
    case 'auto': {
      // one draft per supplier for everything that runs low
      const s = await suggestion();
      if (!s.length) return bad('Всё в норме: нет продуктов ниже минимума');
      const groups = new Map<string, typeof s>();
      for (const x of s) if (x.qty > 0) groups.set(x.supplierId, [...(groups.get(x.supplierId) || []), x]);
      const made = [];
      for (const [sid, ls] of groups) made.push(await createPurchase(sid, ls.map((x) => ({ ing: x.ing, qty: x.qty, price: x.price })), 'автозаказ', g.user.name));
      await audit(g.user, 'Автозаказ', `${made.length} заказ(ов) поставщикам, ${s.length} продуктов`);
      return NextResponse.json({ made: made.length });
    }
    case 'update': {
      const cur = await getPurchase(d.id);
      if (!cur || !['draft', 'ordered'].includes(cur.status)) return bad('Закупку уже нельзя менять');
      if (!known(d.lines)) return bad('Неизвестный продукт в заказе');
      return NextResponse.json(await updatePurchase(d.id, { lines: d.lines, note: d.note, supplierId: d.supplierId }));
    }
    case 'order': {
      const cur = await getPurchase(d.id);
      if (!cur || cur.status !== 'draft') return bad('Заказ уже отправлен');
      const r = await updatePurchase(d.id, { status: 'ordered' });
      await audit(g.user, 'Заказ поставщику отправлен', `№ ${d.id} · ${sname(cur.supplierId)}`);
      return NextResponse.json(r);
    }
    case 'receive': {
      const cur = await getPurchase(d.id);
      if (!cur) return bad('Закупка не найдена', 404);
      if (!known(d.lines)) return bad('Неизвестный продукт');
      const r = await receivePurchase(d.id, d.lines.filter((l) => l.qty > 0), g.user.name, sname(cur.supplierId));
      if (!r) return bad('Закупка уже принята или отменена');
      await audit(g.user, 'Закупка принята на склад', `№ ${d.id} · ${sname(cur.supplierId)} · ${money(r.total)} сум`);
      return NextResponse.json(r);
    }
    case 'cancel': {
      const cur = await getPurchase(d.id);
      if (!cur || !['draft', 'ordered'].includes(cur.status)) return bad('Отменить нельзя');
      await updatePurchase(d.id, { status: 'cancelled' });
      await audit(g.user, 'Закупка отменена', `№ ${d.id}`);
      return NextResponse.json({ ok: true });
    }
    case 'paid': {
      const cur = await getPurchase(d.id);
      if (!cur || cur.status !== 'received') return bad('Оплатить можно только принятую закупку');
      await updatePurchase(d.id, { paid: d.paid });
      await audit(g.user, d.paid ? 'Закупка оплачена' : 'Оплата закупки снята', `№ ${d.id} · ${sname(cur.supplierId)} · ${money(cur.total)} сум`);
      return NextResponse.json({ ok: true });
    }
  }
}
