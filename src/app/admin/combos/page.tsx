import { pageUser } from '@/lib/auth';
import { getMenu } from '@/lib/data';
import { CombosPage } from '@/components/panel/MenuEditor';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('menu', '/admin/combos');
  return <CombosPage initial={await getMenu()} />;
}
