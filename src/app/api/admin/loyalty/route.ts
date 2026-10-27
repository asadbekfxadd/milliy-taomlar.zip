import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { adjust, balance, history } from '@/lib/loyalty';
import { normalizePhone } from '@/lib/format';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const g = await guard('customers');
  if ('res' in g) return g.res;
  const phone = normalizePhone(new URL(req.url).searchParams.get('phone') || '');
  if (!phone) return NextResponse.json({ error: 'Неверный телефон' }, { status: 400 });
  return NextResponse.json({ points: await balance(phone), history: await history(phone) });
}

/** A manager gives or takes points by hand (gift, compensation, mistake). */
export async function POST(req: Request) {
  const g = await guard('promos');
  if ('res' in g) return g.res;
  const b = await req.json().catch(() => null);
  const points = Math.round(Number(b?.points) || 0);
  const note = String(b?.note || '').trim().slice(0, 200);
  if (!points || Math.abs(points) > 10_000_000) return NextResponse.json({ error: 'Укажите количество баллов' }, { status: 400 });
  if (!note) return NextResponse.json({ error: 'Напишите причину' }, { status: 400 });
  if (!(await adjust(String(b?.phone || ''), points, note, g.user.name))) return NextResponse.json({ error: 'Баллов на счёте меньше' }, { status: 400 });
  await audit(g.user, 'Баллы вручную', `${b.phone}: ${points > 0 ? '+' : ''}${points} — ${note}`);
  return NextResponse.json({ points: await balance(String(b.phone)) });
}
