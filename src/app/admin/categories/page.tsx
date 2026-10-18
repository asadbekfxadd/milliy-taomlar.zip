import { pageUser } from '@/lib/auth';
import { getMenu, getSettings } from '@/lib/data';
import { CategoriesPage } from '@/components/panel/MenuEditor';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('menu', '/admin/categories');
  const [menu, settings] = await Promise.all([getMenu(), getSettings()]);
  return <CategoriesPage initial={menu} settings={settings} />;
}
