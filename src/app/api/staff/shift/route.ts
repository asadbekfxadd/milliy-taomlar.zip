import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { q } from '@/lib/db';
import { getSettings } from '@/lib/data';
import { buildReport, cashMove, closeShift, currentShift, openShift, reportRows } from '@/lib/shifts';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const amount = (v: unknown) => Math.max(0, Math.min(1_000_000_000, Math.round(Number(String(v ?? '').replace(/[^\d]/g, '')) || 0)));
const money = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');

export async function GET() {
  const g = await guard('pos');
  if ('res' in g) return g.res;
  const s = await currentShift();
  if (!s) return NextResponse.json({ shift: null });
  return NextResponse.json({ shift: s, report: await buildReport(s) });
}

export async function POST(req: Request) {
  const g = await guard('pos');
  if ('res' in g) return g.res;
  const me = g.user;
  const b = await req.json().catch(() => ({}));
  const s = await currentShift();
  switch (b.action) {
    case 'open': {
      if (s) return bad(`Смена уже открыта (${s.openedBy})`);
      const cash = amount(b.cash);
      const n = await openShift(me.name, cash);
      if (!n) return bad('Смена уже открыта');
      await audit(me, 'Смена открыта', `в кассе ${money(cash)} сум`);
      return NextResponse.json({ shift: n });
    }
    case 'in':
    case 'out': {
      if (!s) return bad('Смена не открыта');
      const a = amount(b.amount);
      if (!a) return bad('Укажите сумму');
      const note = String(b.note || '').trim().slice(0, 120);
      if (b.action === 'out' && !note) return bad('Напишите, на что взяли деньги');
      await cashMove(s.id, b.action, a, note, me.name);
      await audit(me, b.action === 'in' ? 'Внесение в кассу' : 'Изъятие из кассы', `${money(a)} сум${note ? ' · ' + note : ''}`);
      return NextResponse.json({ ok: true });
    }
    case 'print': {
      if (!s) return bad('Смена не открыта');
      const st = await getSettings();
      const rep = await buildReport(s);
      await q('INSERT INTO print_jobs (station, kind, body) VALUES ($1, $2, $3)', [
        'cashier',
        'shift',
        JSON.stringify({ brand: st.name, title: 'X-отчёт (смена открыта)', period: `с ${new Date(s.openedAt).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' })}`, rows: reportRows(s, rep), by: me.name }),
      ]);
      return NextResponse.json({ ok: true });
    }
    case 'close': {
      if (!s) return bad('Смена не открыта');
      const open = await q(`SELECT count(*)::int AS n FROM orders WHERE status NOT IN ('done','cancelled') AND source = 'pos' AND jsonb_array_length(items) > 0`);
      if (open.rows[0].n && !b.force) return bad(`Есть открытые чеки: ${open.rows[0].n}. Закройте их или подтвердите закрытие смены.`, 409);
      const counted = amount(b.counted);
      const closed = await closeShift(s, me.name, counted);
      if (!closed) return bad('Смена уже закрыта');
      const rep = closed.report!;
      await audit(me, 'Смена закрыта', `выручка ${money(rep.revenue)}, ожидалось наличных ${money(rep.expectedCash)}, посчитано ${money(counted)}`);
      const st = await getSettings();
      await q('INSERT INTO print_jobs (station, kind, body) VALUES ($1, $2, $3)', [
        'cashier',
        'shift',
        JSON.stringify({
          brand: st.name,
          title: `Z-отчёт · смена № ${closed.id}`,
          period: `${new Date(closed.openedAt).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' })} — ${new Date(closed.closedAt!).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' })}`,
          rows: reportRows(closed, rep),
          by: `Открыл: ${closed.openedBy} · закрыл: ${closed.closedBy}`,
        }),
      ]);
      return NextResponse.json({ shift: closed });
    }
    default:
      return bad('Неизвестное действие');
  }
}
