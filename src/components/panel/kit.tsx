'use client';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

/* Small shared kit for every staff screen: toast, API helper, page header, icons. */

type Ctx = { toast: (m: string) => void };
const C = createContext<Ctx>({ toast: () => {} });
export const usePanel = () => useContext(C);

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<{ t: string; k: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const toast = useCallback((t: string) => {
    setMsg({ t, k: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 3200);
  }, []);
  return (
    <C.Provider value={{ toast }}>
      {children}
      {msg && (
        <div key={msg.k} className="pn-toast" role="status">
          {msg.t}
        </div>
      )}
    </C.Provider>
  );
}

export async function api<T = any>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    cache: 'no-store',
    headers: body instanceof FormData || body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) {
    location.href = '/login?next=' + encodeURIComponent(location.pathname);
    throw new Error('Войдите заново');
  }
  if (!r.ok) throw new Error(j.error || 'Ошибка сервера');
  return j as T;
}

export function PageHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="phd">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="phd-act">{children}</div>}
    </div>
  );
}

const P: Record<string, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  cash: 'M3 7h18v12H3zM3 11h18M7 15h3',
  tray: 'M3 17h18M5 17a7 7 0 0 1 14 0M12 7V5M10 5h4',
  fire: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  dish: 'M3 14h18M5 14a7 7 0 0 1 14 0M12 7V5M4 18h16',
  folder: 'M3 6h6l2 2h10v11H3z',
  stack: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  recipe: 'M6 3h9l4 4v14H6zM9 10h7M9 14h7M9 18h4',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a6 6 0 0 0-4-5.6',
  tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  wallet: 'M3 7h16v13H3zM3 7l12-4v4M16 13h2',
  badge: 'M8 3h8v4H8zM5 7h14v14H5zM12 12a2 2 0 1 0 0 .01M9 18h6',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-2V4h-4v2L9 8 7 7 5 11l2 1v0l-2 1 2 4 2-1 2 2v2h4v-2l2-2 2 1 2-4z',
  plug: 'M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v5M16 3v5M8 14h3M8 17h3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
};
export function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={P[name] || P.list} />
    </svg>
  );
}

export const money = (n: number) => Math.round(n || 0).toLocaleString('ru-RU').replace(/ /g, ' ');
export const qtyFmt = (n: number) => (Math.round((n || 0) * 1000) / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 3 });
export const when = (iso: string) => new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
export const clockT = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
