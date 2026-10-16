'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Menu, Settings } from '@/lib/types';
import type { StaffOrder } from './types';

type Ctx = {
  menu: Menu;
  settings: Settings;
  orders: StaffOrder[];
  online: boolean;
  refresh: () => Promise<void>;
  act: (id: string, body: Record<string, unknown>) => Promise<StaffOrder | null>;
  toast: (m: string) => void;
};
const C = createContext<Ctx | null>(null);
export const useStaff = () => useContext(C)!;

export default function StaffShell({ menu, settings, children }: { menu: Menu; settings: Settings; children: React.ReactNode }) {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [online, setOnline] = useState(true);
  const [msg, setMsg] = useState<{ t: string; k: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const path = usePathname();
  const router = useRouter();

  const toast = useCallback((t: string) => {
    setMsg({ t, k: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/staff/state', { cache: 'no-store' });
      if (r.status === 401) return router.refresh();
      const j = await r.json();
      setOrders(j.orders);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, [router]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const act = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      try {
        const r = await fetch(`/api/staff/orders/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          toast(j.error || 'Ошибка');
          return null;
        }
        await refresh();
        return j as StaffOrder;
      } catch {
        toast('Нет связи с сервером');
        return null;
      }
    },
    [refresh, toast],
  );

  const nav = [
    ['/staff/pos', 'Касса'],
    ['/staff/kitchen', 'Кухня'],
    ['/staff/print', 'Печать'],
  ];
  const newOnline = orders.filter((o) => o.source === 'site' && o.status === 'new').length;

  return (
    <C.Provider value={{ menu, settings, orders, online, refresh, act, toast }}>
      <div className="sx">
        <header className="sx-bar">
          <Link href="/staff" className="sx-brand">
            {settings.name} <small>персонал</small>
          </Link>
          <nav className="sx-nav">
            {nav.map(([h, l]) => (
              <Link key={h} href={h} className={path === h ? 'on' : ''}>
                {l}
                {h === '/staff/pos' && newOnline > 0 && <span className="sx-dot">{newOnline}</span>}
              </Link>
            ))}
          </nav>
          <span className={`sx-net ${online ? 'ok' : 'bad'}`}>{online ? 'онлайн' : 'нет связи'}</span>
          <button
            className="sx-link"
            onClick={async () => {
              await fetch('/api/staff/logout', { method: 'POST' });
              router.refresh();
            }}
          >
            Выйти
          </button>
        </header>
        <main className="sx-main">{children}</main>
        {msg && (
          <div key={msg.k} className="sx-toast" role="status">
            {msg.t}
          </div>
        )}
      </div>
    </C.Provider>
  );
}
