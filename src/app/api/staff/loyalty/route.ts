import { NextResponse } from 'next/server';
import { guardAny } from '@/lib/auth';
import { q } from '@/lib/db';
import { normalizePhone } from '@/lib/format';
import { balance } from '@/lib/loyalty';

export const dynamic = 'force-dynamic';

/** The cashier looks up a guest by phone: name from past orders and the points balance. */
export async function GET(req: Request) {
  const g = await guardAny(['pos', 'customers']);
  if ('res' in g) return g.res;
  const phone = normalizePhone(new URL(req.url).searchParams.get('phone') || '');
  if (!phone) return NextResponse.json({ error: 'Телефон в формате +998 90 123 45 67' }, { status: 400 });
  const r = await q(`SELECT name FROM orders WHERE phone = $1 AND name <> '' ORDER BY created_at DESC LIMIT 1`, [phone]);
  return NextResponse.json({ phone, name: r.rows[0]?.name || '', points: await balance(phone) });
}
