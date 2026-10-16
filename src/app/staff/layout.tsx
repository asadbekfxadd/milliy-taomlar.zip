import type { Metadata } from 'next';
import './staff.css';
import { isStaff } from '@/lib/auth';
import { getMenu, getSettings } from '@/lib/data';
import StaffLogin from '@/components/staff/StaffLogin';
import StaffShell from '@/components/staff/StaffShell';

export const metadata: Metadata = { title: 'Персонал', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  if (!isStaff()) return <StaffLogin />;
  const [menu, settings] = await Promise.all([getMenu(), getSettings()]);
  return (
    <StaffShell menu={menu} settings={settings}>
      {children}
    </StaffShell>
  );
}
