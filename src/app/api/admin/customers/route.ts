import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { mapOrder, q } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** One guest's orders (by phone). */
export async function GET(req: Request) {
  const g = await guard('customers');
  if ('res' in g) return g.res;
  const phone = new URL(req.url).searchParams.get('phone') || '';
  if (!phone) return NextResponse.json({ error: 'Нет телефона' }, { status: 400 });
  const [r, n] = await Promise.all([q(`SELECT * FROM orders WHERE phone = $1 ORDER BY created_at DESC LIMIT 100`, [phone]), q(`SELECT note FROM customer_notes WHERE phone = $1`, [phone])]);
  return NextResponse.json({
    note: n.rows[0]?.note || '',
    orders: r.rows.map((x) => {
      const o = mapOrder(x);
      return { id: o.id, no: o.no, status: o.status, type: o.type, total: o.total, createdAt: o.createdAt, items: o.items, address: o.address, zone: o.zone };
    }),
  });
}

export async function PATCH(req: Request) {
  const g = await guard('customers');
  if ('res' in g) return g.res;
  const b = await req.json().catch(() => ({}));
  const phone = String(b.phone || '').slice(0, 40);
  const note = String(b.note || '').slice(0, 1000);
  if (!phone) return NextResponse.json({ error: 'Нет телефона' }, { status: 400 });
  await q(`INSERT INTO customer_notes (phone, note, updated_at) VALUES ($1, $2, now()) ON CONFLICT (phone) DO UPDATE SET note = EXCLUDED.note, updated_at = now()`, [phone, note]);
  return NextResponse.json({ ok: true });
}
