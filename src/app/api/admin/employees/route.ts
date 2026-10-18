import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth';
import { createEmployee, listEmployees } from '@/lib/employees';
import { audit } from '@/lib/audit';
import { ROLES, ROLE_IDS, type Role } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const empInput = z.object({
  name: z.string().trim().min(2, 'Имя слишком короткое').max(60),
  role: z.enum(ROLE_IDS as [Role, ...Role[]]),
  pin: z.string().regex(/^\d{4,8}$/, 'PIN — от 4 до 8 цифр'),
  phone: z.string().trim().max(40).optional().default(''),
});

export async function GET() {
  const g = await guard('employees');
  if ('res' in g) return g.res;
  return NextResponse.json(await listEmployees(true));
}

export async function POST(req: Request) {
  const g = await guard('employees');
  if ('res' in g) return g.res;
  const p = empInput.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message || 'Проверьте поля' }, { status: 400 });
  if (p.data.role === 'owner' && g.user.role !== 'owner') return NextResponse.json({ error: 'Владельца может добавить только владелец' }, { status: 403 });
  const id = await createEmployee(p.data);
  await audit(g.user, 'Добавлен сотрудник', `${p.data.name} · ${ROLES[p.data.role].name}`);
  return NextResponse.json({ id });
}
