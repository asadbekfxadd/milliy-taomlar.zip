'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CartItem, Menu, Settings } from '@/lib/types';
import { cartKey } from '@/lib/pricing';
import { closedText, LANG_COOKIE, makeT, type Lang, type T } from '@/lib/i18n';
import DishModal from './DishModal';

type Ctx = {
  online: { payme: boolean; click: boolean };
  menu: Menu;
  settings: Settings;
  lang: Lang;
  t: T;
  setLang: (l: Lang) => void;
  cart: CartItem[];
  count: number;
  bump: number;
  /** `from` = the element the guest tapped: its picture flies into the cart */
  add: (id: string, si?: number, ex?: number[], qty?: number, from?: Element | null, silent?: boolean) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  openDish: (id: string) => void;
  toast: (msg: string) => void;
  fly: (from?: Element | null) => void;
};
const C = createContext<Ctx | null>(null);
export const useSite = () => {
  const c = useContext(C);
  if (!c) throw new Error('useSite outside Providers');
  return c;
};

const LS_KEY = 'mt-cart';

/** Picture of the tapped card flies along an arc into whichever cart button is visible. */
function flyToCart(from?: Element | null) {
  if (!from || typeof window === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = [...document.querySelectorAll<HTMLElement>('[data-cart-target]')].find((el) => el.offsetParent !== null && el.getBoundingClientRect().width > 0);
  if (!target) return;
  const card = (from.closest('[data-fly]') as HTMLElement | null) ?? (from as HTMLElement);
  const pic = card.querySelector<HTMLImageElement | HTMLCanvasElement>('.ph img.ld, .ph canvas.ld');
  const a = (pic ?? card).getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const size = Math.min(120, Math.max(48, Math.min(a.width, a.height) * 0.5));
  const dot = document.createElement('div');
  dot.className = 'flyer';
  let bg = '';
  try {
    bg = pic instanceof HTMLImageElement ? `url("${pic.currentSrc || pic.src}")` : pic ? `url(${(pic as HTMLCanvasElement).toDataURL('image/webp', 0.6)})` : '';
  } catch {}
  if (bg) dot.style.backgroundImage = bg;
  Object.assign(dot.style, { width: size + 'px', height: size + 'px', left: a.left + a.width / 2 - size / 2 + 'px', top: a.top + a.height / 2 - size / 2 + 'px' });
  document.body.appendChild(dot);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = dot.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 140}px) scale(.7)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: 0.6 },
    ],
    { duration: 820, easing: 'cubic-bezier(.45,.05,.3,1)' },
  );
  anim.onfinish = () => dot.remove();
}

export default function Providers({ menu, settings, lang, online = { payme: false, click: false }, children }: { menu: Menu; settings: Settings; lang: Lang; online?: { payme: boolean; click: boolean }; children: React.ReactNode }) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [dish, setDish] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: string; k: number } | null>(null);
  const [bump, setBump] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const t = useMemo(() => makeT(lang), [lang]);

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

  const toast = useCallback((m: string) => {
    setMsg({ t: m, k: Date.now() });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);

  const add = useCallback(
    (id: string, si = 0, ex: number[] = [], qty = 1, from?: Element | null, silent = false) => {
      const d = menu.dishes.find((x) => x.id === id);
      if (!d || !d.available) return;
      const key = cartKey(id, si, ex);
      setCart((c) => {
        const f = c.find((i) => i.key === key);
        return f ? c.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i)) : [...c, { key, id, si, ex: [...ex], qty }];
      });
      flyToCart(from);
      // the counter bumps when the picture lands
      setTimeout(() => setBump((b) => b + 1), from ? 700 : 0);
      if (!silent) toast(t('dish.inCart', { n: d.name }));
    },
    [menu, toast, t],
  );

  const setLang = useCallback(
    (l: Lang) => {
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = l;
      router.refresh();
    },
    [router],
  );

  const value: Ctx = {
    online,
    menu,
    settings,
    lang,
    t,
    setLang,
    cart: valid,
    count: valid.reduce((a, i) => a + i.qty, 0),
    bump,
    add,
    setQty: (key, qty) => setCart((c) => c.map((i) => (i.key === key ? { ...i, qty } : i)).filter((i) => i.qty > 0)),
    remove: (key) => setCart((c) => c.filter((i) => i.key !== key)),
    clear: () => setCart([]),
    openDish: setDish,
    toast,
    fly: flyToCart,
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

/** Closed/paused notice for the guest, recomputed every minute (client only, so no hydration mismatch). */
export function useClosed() {
  const { settings, lang } = useSite();
  const [c, setC] = useState<ReturnType<typeof closedText>>(null);
  useEffect(() => {
    const f = () => setC(closedText(settings, lang));
    f();
    const id = setInterval(f, 60_000);
    return () => clearInterval(id);
  }, [settings, lang]);
  return c;
}
