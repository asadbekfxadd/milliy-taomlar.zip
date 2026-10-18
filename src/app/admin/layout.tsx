import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import '../panel.css';
import { getUser } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import AdminShell from '@/components/panel/AdminShell';

export const metadata: Metadata = { title: 'Управление', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login?next=' + encodeURIComponent(headers().get('x-path') || '/'));
  const st = await getSettings();
  return (
    <AdminShell user={{ name: user.name, role: user.role }} brand={st.name}>
      {children}
    </AdminShell>
  );
}
