'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CartItem, Menu, Settings } from '@/lib/types';
import { cartKey } from '@/lib/pricing';
import DishModal from './DishModal';

type Ctx = {
  menu: Menu;
  settings: Settings;
  cart: CartItem[];
  count: number;
  bump: number;
  add: (id: string, si?: number, ex?: number[], qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  openDish: (id: string) => void;
  toast: (msg: string) => void;
};
const C = createContext<Ctx | null>(null);
export const useSite = () => {
  const c = useContext(C);
  if (!c) throw new Error('useSite outside Providers');
  return c;
};

const LS_KEY = 'mt-cart';

export default function Providers({ menu, settings, children }: { menu: Menu; settings: Settings; children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [dish, setDish] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: string; k: number } | null>(null);
  const [bump, setBump] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      if (Array.isArray(v)) setCart(v);
    } catch {}
    setReady(true);
  }, []);
  // drop items whose dish was removed from the menu
  const valid = useMemo(() => cart.filter((i) => menu.dishes.some((d) => d.id === i.id) && i.qty > 0), [cart, menu]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(valid));
    } catch {}
  }, [valid, ready]);

  const toast = useCallback((t: string) => {
    setMsg({ t, k: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);

  const add = useCallback(
    (id: string, si = 0, ex: number[] = [], qty = 1) => {
      const d = menu.dishes.find((x) => x.id === id);
      if (!d || !d.available) return;
      const key = cartKey(id, si, ex);
      setCart((c) => {
        const f = c.find((i) => i.key === key);
        return f ? c.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i)) : [...c, { key, id, si, ex: [...ex], qty }];
      });
      setBump((b) => b + 1);
      toast(`${d.name} — в корзине`);
    },
    [menu, toast],
  );

  const value: Ctx = {
    menu,
    settings,
    cart: valid,
    count: valid.reduce((a, i) => a + i.qty, 0),
    bump,
    add,
    setQty: (key, qty) => setCart((c) => c.map((i) => (i.key === key ? { ...i, qty } : i)).filter((i) => i.qty > 0)),
    remove: (key) => setCart((c) => c.filter((i) => i.key !== key)),
    clear: () => setCart([]),
    openDish: setDish,
    toast,
  };

  return (
    <C.Provider value={value}>
      {children}
      {dish && <DishModal id={dish} onClose={() => setDish(null)} />}
      {msg && (
        <div key={msg.k} className="toast" role="status">
          {msg.t}
        </div>
      )}
    </C.Provider>
  );
}
