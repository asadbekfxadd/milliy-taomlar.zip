import { pageUser } from '@/lib/auth';
import PrintStation from '@/components/floor/PrintStation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('print', '/print');
  return <PrintStation />;
}
