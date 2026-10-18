import { NextResponse } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/auth';
import { q } from '@/lib/db';
import { updateEmployee } from '@/lib/employees';
import { audit } from '@/lib/audit';
import { ROLES, ROLE_IDS, type Role } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

const patch = z.object({
  name: z.string().trim().min(2, 'Имя слишком короткое').max(60).optional(),
  role: z.enum(ROLE_IDS as [Role, ...Role[]]).optional(),
  pin: z.string().regex(/^\d{4,8}$/, 'PIN — от 4 до 8 цифр').optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const g = await guard('employees');
  if ('res' in g) return g.res;
  const p = patch.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message || 'Проверьте поля' }, { status: 400 });
  const cur = (await q('SELECT name, role FROM employees WHERE id = $1', [params.id])).rows[0];
  if (!cur) return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 });
  const touchesOwner = cur.role === 'owner' || p.data.role === 'owner';
  if (touchesOwner && g.user.role !== 'owner') return NextResponse.json({ error: 'Владельца меняет только владелец' }, { status: 403 });
  if (params.id === g.user.id && (p.data.active === false || (p.data.role && p.data.role !== cur.role)))
    return NextResponse.json({ error: 'Себя нельзя отключить или понизить. Попросите другого владельца.' }, { status: 400 });
  await updateEmployee(params.id, { ...p.data, pin: p.data.pin || undefined });
  const what = [
    p.data.name && p.data.name !== cur.name ? `имя → ${p.data.name}` : '',
    p.data.role && p.data.role !== cur.role ? `роль → ${ROLES[p.data.role].name}` : '',
    p.data.pin ? 'новый PIN' : '',
    p.data.active === false ? 'отключён' : p.data.active === true ? 'включён' : '',
  ].filter(Boolean);
  if (what.length) await audit(g.user, 'Изменён сотрудник', `${cur.name}: ${what.join(', ')}`);
  return NextResponse.json({ ok: true });
}
