import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import '../panel.css';
import { getUser } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { listEmployees } from '@/lib/employees';
import { ROLES } from '@/lib/rbac';
import LoginForm from '@/components/panel/LoginForm';
import Girih from '@/components/Girih';

export const metadata: Metadata = { title: 'Вход для сотрудников', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; switch?: string } }) {
  const user = await getUser();
  const next = searchParams.next && searchParams.next.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : '';
  if (user && !searchParams.switch) redirect(next || ROLES[user.role].home);
  const [st, emps] = await Promise.all([getSettings(), listEmployees().catch(() => [])]);
  return (
    <div className="pn lg">
      <section className="lg-art">
        <div>
          <span className="ad-logo">{st.name.slice(0, 1)}</span>
        </div>
        <div>
          <h1>{st.name}</h1>
          <p>Касса, зал, кухня, склад и отчёты ресторана. Каждый сотрудник входит под своим именем и видит только свою работу.</p>
        </div>
        <p className="lg-foot small">Забыли PIN — попросите владельца или управляющего сменить его в разделе «Сотрудники».</p>
        <div className="lg-tile" aria-hidden="true">
          <Girih w={420} h={420} step={140} />
        </div>
      </section>
      <LoginForm employees={emps.map((e) => ({ id: e.id, name: e.name, role: ROLES[e.role].name }))} next={next} />
    </div>
  );
}
