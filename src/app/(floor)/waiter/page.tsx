import { pageUser } from '@/lib/auth';
import Waiter from '@/components/floor/Waiter';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('waiter', '/waiter');
  return <Waiter />;
}
