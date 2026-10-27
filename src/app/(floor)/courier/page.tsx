import { pageUser } from '@/lib/auth';
import { Courier } from '@/components/floor/delivery';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('courier', '/courier');
  return <Courier />;
}
