import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import '../panel.css';
import { getUser } from '@/lib/auth';
import { getMenu, getSettings } from '@/lib/data';
import FloorShell from '@/components/floor/FloorShell';

export const metadata: Metadata = { title: 'Зал', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function FloorLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?next=' + encodeURIComponent(headers().get('x-path') || '/'));
  const [menu, settings] = await Promise.all([getMenu(), getSettings()]);
  return (
    <FloorShell me={user} menu={menu} settings={settings}>
      {children}
    </FloorShell>
  );
}
