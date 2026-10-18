import { pageUser } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { SettingsPage } from '@/components/panel/SettingsEditor';

export const dynamic = 'force-dynamic';

export default async function Page() {
  await pageUser('settings', '/admin/settings');
  return <SettingsPage initial={await getSettings()} />;
}
