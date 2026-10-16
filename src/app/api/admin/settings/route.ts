import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdmin } from '@/lib/auth';
import { saveDoc } from '@/lib/db';
import { settingsSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const p = settingsSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Настройки не прошли проверку: ' + p.error.issues[0]?.path.join('.') }, { status: 400 });
  await saveDoc('settings', p.data);
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true });
}
