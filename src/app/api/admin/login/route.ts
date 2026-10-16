import { NextResponse } from 'next/server';
import { checkPassword, issueSession } from '@/lib/auth';
import { clientIp, limited } from '@/lib/rate';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (limited('login:' + clientIp(req), 8, 15 * 60_000))
    return NextResponse.json({ error: 'Слишком много попыток. Подождите 15 минут.' }, { status: 429 });
  const { password } = await req.json().catch(() => ({ password: '' }));
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET)
    return NextResponse.json({ error: 'На сервере не заданы ADMIN_PASSWORD и SESSION_SECRET.' }, { status: 500 });
  if (!checkPassword(String(password || ''))) return NextResponse.json({ error: 'Неверный пароль' }, { status: 401 });
  issueSession();
  return NextResponse.json({ ok: true });
}
