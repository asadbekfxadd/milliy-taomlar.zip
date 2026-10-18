import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { guardAny } from '@/lib/auth';
import { mapOrder, newId, q } from '@/lib/db';
import { posCreate } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

/** Open a check for a table (or a takeaway check). The person who opens it becomes its waiter. */
export async function POST(req: Request) {
  const g = await guardAny(['pos', 'waiter']);
  if ('res' in g) return g.res;
  const p = posCreate.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
  const { table, guests, type } = p.data;
  if (type === 'hall' && table) {
    const busy = await q(`SELECT id FROM orders WHERE type = 'hall' AND table_no = $1 AND status NOT IN ('done','cancelled') LIMIT 1`, [table]);
    if (busy.rows[0]) return NextResponse.json({ id: busy.rows[0].id, existing: true });
  }
  const r = await q(
    `INSERT INTO orders (id, token, type, name, phone, pay, items, subtotal, total, source, table_no, guests, waiter, waiter_id, status)
     VALUES ($1, $2, $3, $4, '', 'cash', '[]', 0, 0, 'pos', $5, $6, $7, $8, 'accepted') RETURNING *`,
    [newId(), randomBytes(16).toString('hex'), type, type === 'hall' ? `Стол ${table ?? ''}`.trim() : 'С собой', type === 'hall' ? table : null, guests, g.user.name, g.user.id],
  );
  return NextResponse.json({ id: mapOrder(r.rows[0]).id });
}
