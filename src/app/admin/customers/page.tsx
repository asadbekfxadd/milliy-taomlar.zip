import { pageUser } from '@/lib/auth';
import { q } from '@/lib/db';
import Customers from '@/components/panel/Customers';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('customers', '/admin/customers');
  const r = await q(`
    SELECT o.phone,
           (array_agg(o.name ORDER BY o.created_at DESC))[1] AS name,
           count(*) FILTER (WHERE o.status = 'done')::int AS orders,
           COALESCE(sum(o.total) FILTER (WHERE o.status = 'done'), 0)::bigint AS spent,
           min(o.created_at) AS first, max(o.created_at) AS last,
           bool_or(o.type = 'delivery') AS delivery,
           max(n.note) AS note, COALESCE(max(l.points), 0)::int AS points
      FROM orders o LEFT JOIN customer_notes n ON n.phone = o.phone LEFT JOIN loyalty l ON l.phone = o.phone
     WHERE o.phone <> ''
     GROUP BY o.phone
     ORDER BY max(o.created_at) DESC
     LIMIT 2000`);
  const list = r.rows.map((x) => ({ phone: x.phone, name: x.name, orders: x.orders, spent: Number(x.spent), first: new Date(x.first).toISOString(), last: new Date(x.last).toISOString(), delivery: x.delivery, note: x.note || '', points: x.points }));
  return <Customers list={list} />;
}
