import { pageUser } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { q } from '@/lib/db';
import { PromosPage } from '@/components/panel/SettingsEditor';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('promos', '/admin/promos');
  const [st, r] = await Promise.all([
    getSettings(),
    q(`SELECT promo, count(*)::int AS n, sum(discount)::bigint AS d FROM orders WHERE promo <> '' AND status <> 'cancelled' AND created_at > now() - interval '90 days' GROUP BY promo`),
  ]);
  const usage = Object.fromEntries(r.rows.map((x) => [x.promo, { n: x.n, discount: Number(x.d) }]));
  return <PromosPage initial={st} usage={usage} />;
}
