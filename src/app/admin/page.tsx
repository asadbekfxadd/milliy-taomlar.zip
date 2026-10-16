import type { Metadata } from 'next';
import { isAdmin } from '@/lib/auth';
import { getMenu, getSettings, integrations } from '@/lib/data';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminApp from '@/components/admin/AdminApp';

export const metadata: Metadata = { title: 'Управление', robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!isAdmin()) return <AdminLogin />;
  const [menu, settings] = await Promise.all([getMenu(), getSettings()]);
  return <AdminApp initialMenu={menu} initialSettings={settings} integ={integrations()} />;
}
