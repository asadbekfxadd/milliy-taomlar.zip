import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { mapOrder, q } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const r = await q('SELECT * FROM orders ORDER BY created_at DESC LIMIT 150');
  return NextResponse.json(r.rows.map((row) => {
    const { token, tgMessageId, ...o } = mapOrder(row);
    return o;
  }));
}
