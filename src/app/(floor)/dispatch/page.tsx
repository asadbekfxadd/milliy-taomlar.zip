import { pageUser } from '@/lib/auth';
import { Dispatch } from '@/components/floor/delivery';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('dispatch', '/dispatch');
  return <Dispatch />;
}
