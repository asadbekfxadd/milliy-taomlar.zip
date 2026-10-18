import { pageUser } from '@/lib/auth';
import Pos from '@/components/floor/Pos';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('pos', '/pos');
  return <Pos />;
}
