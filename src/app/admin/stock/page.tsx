import { pageUser } from '@/lib/auth';
import { listIngredients } from '@/lib/stock';
import Stock from '@/components/panel/Stock';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('stock', '/admin/stock');
  return <Stock initial={await listIngredients(true)} />;
}
