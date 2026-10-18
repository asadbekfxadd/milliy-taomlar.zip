import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkLegacyPin, checkOwnerPassword, issueSession } from '@/lib/auth';
import { checkEmployeePin, employeeCount } from '@/lib/employees';
import { audit } from '@/lib/audit';
import { clientIp, limited } from '@/lib/rate';
import { ROLES } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const body = z.union([
  z.object({ id: z.string().min(1).max(64), pin: z.string().min(1).max(32) }),
  z.object({ password: z.string().min(1).max(200) }),
  z.object({ pin: z.string().min(1).max(32) }),
]);

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (limited('login:' + ip, 12, 15 * 60_000)) return NextResponse.json({ error: 'Слишком много попыток. Подождите 15 минут.' }, { status: 429 });
  if (!process.env.SESSION_SECRET) return NextResponse.json({ error: 'На сервере не задан SESSION_SECRET' }, { status: 500 });
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Введите PIN' }, { status: 400 });
  const d = p.data;

  if ('id' in d) {
    if (limited('login-emp:' + d.id, 8, 15 * 60_000)) return NextResponse.json({ error: 'Много неверных попыток для этого сотрудника. Подождите 15 минут.' }, { status: 429 });
    const e = await checkEmployeePin(d.id, d.pin);
    if (!e) return NextResponse.json({ error: 'Неверный PIN' }, { status: 401 });
    const u = { id: e.id, name: e.name, role: e.role };
    issueSession(u);
    await audit(u, 'Вход');
    return NextResponse.json({ ok: true, home: ROLES[e.role].home });
  }
  if ('password' in d) {
    if (!checkOwnerPassword(d.password)) return NextResponse.json({ error: 'Неверный пароль владельца' }, { status: 401 });
    const u = { id: 'owner', name: 'Владелец', role: 'owner' as const };
    issueSession(u);
    await audit(u, 'Вход по паролю владельца');
    return NextResponse.json({ ok: true, home: '/admin' });
  }
  // old shared PIN: only while no employees exist yet
  if ((await employeeCount()) === 0 && checkLegacyPin(d.pin)) {
    const u = { id: 'legacy', name: 'Касса', role: 'cashier' as const };
    issueSession(u);
    return NextResponse.json({ ok: true, home: '/pos' });
  }
  return NextResponse.json({ error: 'Неверный PIN' }, { status: 401 });
}
