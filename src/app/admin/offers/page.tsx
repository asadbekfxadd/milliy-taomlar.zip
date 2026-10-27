import { pageUser } from '@/lib/auth';
import { getMenu, getSettings } from '@/lib/data';
import { q } from '@/lib/db';
import Offers from '@/components/panel/Offers';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('promos', '/admin/offers');
  const [st, menu, r] = await Promise.all([
    getSettings(),
    getMenu(),
    q(`SELECT d->>'id' AS id, count(*)::int AS n, COALESCE(sum((d->>'amount')::int), 0)::bigint AS amount
         FROM orders, jsonb_array_elements(deals) d
        WHERE status <> 'cancelled' AND created_at > now() - interval '90 days'
        GROUP BY 1`),
  ]);
  const usage = Object.fromEntries(r.rows.map((x) => [x.id, { n: x.n, amount: Number(x.amount) }]));
  return <Offers initial={st} menu={menu} usage={usage} />;
}
