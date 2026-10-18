'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV, ROLES, can, type Role } from '@/lib/rbac';
import { Icon, PanelProvider } from './kit';

export default function AdminShell({ user, brand, children }: { user: { name: string; role: Role }; brand: string; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [newOnline, setNewOnline] = useState(0);
  useEffect(() => setOpen(false), [path]);

  // one light poll for the "new orders" counter in the sidebar
  useEffect(() => {
    if (!can(user.role, 'orders') && !can(user.role, 'pos')) return;
    let t: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await fetch('/api/staff/state?count=1', { cache: 'no-store' });
        if (r.ok) setNewOnline((await r.json()).newOnline || 0);
      } catch {}
      t = setTimeout(load, 15000);
    };
    load();
    return () => clearTimeout(t);
  }, [user.role]);

  const items = NAV.filter((n) => can(user.role, n.perm));
  const groups = [...new Set(items.map((i) => i.group))];
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path === href || path.startsWith(href + '/'));

  return (
    <PanelProvider>
      <div className={`pn ad ${open ? 'open' : ''}`}>
        <div className="ad-top">
          <button onClick={() => setOpen(true)} aria-label="Открыть меню">
            ☰
          </button>
          <b>{brand}</b>
        </div>
        <div className="ad-scrim" onClick={() => setOpen(false)} />
        <aside className="ad-side">
          <Link href="/admin" className="ad-brand">
            <span className="ad-logo">{brand.slice(0, 1)}</span>
            <div>
              <b>{brand}</b>
              <br />
              <span>управление рестораном</span>
            </div>
          </Link>
          <nav className="ad-nav">
            {groups.map((g) => (
              <div className="ad-group" key={g}>
                <p>{g}</p>
                {items
                  .filter((i) => i.group === g)
                  .map((i) => (
                    <Link key={i.href} href={i.href} className={active(i.href) ? 'on' : ''} aria-current={active(i.href) ? 'page' : undefined}>
                      <Icon name={i.icon} />
                      {i.label}
                      {i.href === '/admin/orders' && newOnline > 0 && <span className="cnt">{newOnline}</span>}
                    </Link>
                  ))}
              </div>
            ))}
          </nav>
          <div className="ad-me">
            <div>
              <b>{user.name}</b>
              <span>{ROLES[user.role].name}</span>
            </div>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                location.href = '/login';
              }}
            >
              Выйти
            </button>
          </div>
        </aside>
        <main className="ad-main">{children}</main>
      </div>
    </PanelProvider>
  );
}
