import { pageUser } from '@/lib/auth';
import Kitchen from '@/components/floor/Kitchen';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('kitchen', '/kitchen');
  return <Kitchen />;
}
