import { pageUser } from '@/lib/auth';
import { integrations } from '@/lib/data';
import Integrations from '@/components/panel/Integrations';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('settings', '/admin/integrations');
  return <Integrations integ={integrations()} />;
}
