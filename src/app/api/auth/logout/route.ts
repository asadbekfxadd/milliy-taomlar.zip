import { NextResponse } from 'next/server';
import { clearSession, getUser } from '@/lib/auth';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST() {
  const u = await getUser();
  if (u) await audit(u, 'Выход');
  clearSession();
  return NextResponse.json({ ok: true });
}
