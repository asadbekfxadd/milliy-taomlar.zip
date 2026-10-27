import { pageUser } from '@/lib/auth';
import { listIngredients } from '@/lib/stock';
import { listSuppliers } from '@/lib/purchases';
import Stock from '@/components/panel/Stock';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('stock', '/admin/stock');
  const [ings, suppliers] = await Promise.all([listIngredients(true), listSuppliers()]);
  return <Stock initial={ings} suppliers={suppliers} />;
}
