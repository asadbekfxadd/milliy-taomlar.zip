import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { q } from '@/lib/db';
import { addExpense, copyRegular, deleteExpense, EXPENSE_CATS, listExpenses, pnl, thisMonth } from '@/lib/finance';
import { cashMove, currentShift } from '@/lib/shifts';

export const dynamic = 'force-dynamic';
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const money = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
const ym = z.string().regex(/^\d{4}-\d{2}$/);
const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add'),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Укажите дату'),
    cat: z.string().trim().min(2, 'Выберите статью').max(60),
    amount: z.coerce.number().int().positive('Сумма больше нуля').max(10_000_000_000),
    note: z.string().trim().max(200).default(''),
    from: z.enum(['cash', 'card', 'bank']),
  }),
  z.object({ action: z.literal('delete'), id: z.number().int() }),
  z.object({ action: z.literal('copy'), month: ym }),
]);

export async function GET(req: Request) {
  const g = await guard('finance');
  if ('res' in g) return g.res;
  const m = new URL(req.url).searchParams.get('m') || thisMonth();
  if (!ym.safeParse(m).success) return bad('Неверный месяц');
  const [list, p] = await Promise.all([listExpenses(m), pnl(m)]);
  return NextResponse.json({ month: m, list, pnl: p, cats: EXPENSE_CATS });
}

export async function POST(req: Request) {
  const g = await guard('finance');
  if ('res' in g) return g.res;
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return bad(p.error.issues[0]?.message || 'Проверьте поля');
  const d = p.data;
  if (d.action === 'add') {
    const r = await addExpense(d, g.user.name);
    await audit(g.user, 'Расход', `${d.cat}: ${money(d.amount)} сум${d.note ? ' · ' + d.note : ''}${d.from === 'cash' ? (r.shiftId ? ` · из кассы, смена № ${r.shiftId}` : ' · наличными (смена закрыта)') : ''}`);
    return NextResponse.json({ ...r, warn: d.from === 'cash' && !r.shiftId ? 'Смена кассы закрыта: изъятие из кассы не записано' : '' });
  }
  if (d.action === 'delete') {
    const r = await deleteExpense(d.id);
    if (!r) return bad('Расход не найден', 404);
    const s = await currentShift();
    // the cash went back into the open drawer
    if (r.shift_id && s && s.id === r.shift_id) await cashMove(s.id, 'in', Number(r.amount), `отмена расхода: ${r.cat}`, g.user.name);
    await audit(g.user, 'Расход удалён', `${r.cat}: ${money(Number(r.amount))} сум`);
    return NextResponse.json({ ok: true });
  }
  const exists = await q(`SELECT 1 FROM expenses WHERE to_char(day, 'YYYY-MM') = $1 AND cat IN ('Аренда','Зарплата') LIMIT 1`, [d.month]);
  if (exists.rows[0]) return bad('В этом месяце аренда или зарплата уже внесены');
  const n = await copyRegular(d.month, g.user.name);
  if (!n) return bad('В прошлом месяце нет постоянных расходов');
  await audit(g.user, 'Расходы скопированы', `${n} статей в ${d.month}`);
  return NextResponse.json({ copied: n });
}
