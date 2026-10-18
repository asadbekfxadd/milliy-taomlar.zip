import { pageUser } from '@/lib/auth';
import Orders from '@/components/panel/Orders';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('orders', '/admin/orders');
  return <Orders />;
}
