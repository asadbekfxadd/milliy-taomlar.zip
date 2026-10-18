import { pageUser } from '@/lib/auth';
import { getMenu } from '@/lib/data';
import { listIngredients, listRecipes } from '@/lib/stock';
import Recipes from '@/components/panel/Recipes';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('recipes', '/admin/recipes');
  const [menu, ings, recipes] = await Promise.all([getMenu(), listIngredients(), listRecipes()]);
  return <Recipes menu={menu} ings={ings} initial={recipes} />;
}
