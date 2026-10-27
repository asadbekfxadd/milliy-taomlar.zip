import { pageUser } from '@/lib/auth';
import { thisMonth } from '@/lib/finance';
import Finance from '@/components/panel/Finance';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('finance', '/admin/finance');
  return <Finance month={thisMonth()} />;
}
