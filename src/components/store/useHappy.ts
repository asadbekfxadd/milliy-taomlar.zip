'use client';
import { useEffect, useState } from 'react';
import { happyPct, tkNow } from '@/lib/offers';
import { useSite } from '../Providers';

/** Happy-hour % for a category, computed after mount (the clock must not differ between server and browser). */
export function useHappy() {
  const { settings: st } = useSite();
  const [now, setNow] = useState<ReturnType<typeof tkNow> | null>(null);
  useEffect(() => {
    if (!st.happyHours?.some((h) => h.active)) return;
    const f = () => setNow(tkNow());
    f();
    const t = setInterval(f, 60_000);
    return () => clearInterval(t);
  }, [st.happyHours]);
  return (cat: string) => (now ? happyPct(st, cat, now) : 0);
}

