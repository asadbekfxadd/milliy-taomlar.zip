import { pageUser } from '@/lib/auth';
import { getMenu } from '@/lib/data';
import { DishesPage } from '@/components/panel/MenuEditor';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('menu', '/admin/menu');
  return <DishesPage initial={await getMenu()} />;
}
