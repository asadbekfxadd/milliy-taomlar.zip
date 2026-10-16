import { NextResponse } from 'next/server';
import { checkPassword, checkStaffPin, issueSession, issueStaffSession } from '@/lib/auth';
import { clientIp, limited } from '@/lib/rate';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (limited('staff:' + clientIp(req), 10, 15 * 60_000)) return NextResponse.json({ error: 'Слишком много попыток. Подождите 15 минут.' }, { status: 429 });
  const { pin } = await req.json().catch(() => ({ pin: '' }));
  const v = String(pin || '');
  if (!process.env.STAFF_PIN && !process.env.ADMIN_PASSWORD) return NextResponse.json({ error: 'На сервере не задан STAFF_PIN' }, { status: 500 });
  if (checkStaffPin(v)) issueStaffSession();
  else if (checkPassword(v)) issueSession();
  else return NextResponse.json({ error: 'Неверный PIN' }, { status: 401 });
  return NextResponse.json({ ok: true });
}
