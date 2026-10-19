'use client';
import { useEffect, useState } from 'react';

/* Delivery or pickup, chosen in the header and remembered; the checkout starts from it. */
export type Mode = 'delivery' | 'pickup';
const KEY = 'mt-mode';
const EV = 'mt-mode';

export function readMode(): Mode | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'delivery' || v === 'pickup' ? v : null;
  } catch {
    return null;
  }
}
export function writeMode(m: Mode) {
  try {
    localStorage.setItem(KEY, m);
  } catch {}
  dispatchEvent(new Event(EV));
}
export function useMode(allowed: Mode[]) {
  const [m, setM] = useState<Mode | null>(allowed[0] ?? null);
  useEffect(() => {
    const f = () => {
      const v = readMode();
      if (v && allowed.includes(v)) setM(v);
    };
    f();
    addEventListener(EV, f);
    return () => removeEventListener(EV, f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed.join()]);
  return [m, (v: Mode) => (setM(v), writeMode(v))] as const;
}
