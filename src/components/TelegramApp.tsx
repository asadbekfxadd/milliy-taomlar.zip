'use client';
import { useEffect } from 'react';

/* The site opened as a Telegram Mini App. Outside Telegram nothing happens and Telegram's script is not loaded. */

const KEY = 'mt-tg';
type TgWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  BackButton?: { show: () => void; hide: () => void; onClick: (f: () => void) => void };
  requestContact?: (cb?: (ok: boolean) => void) => void;
};
declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

/** Signed Telegram data, if the site runs inside Telegram. */
export function tgInitData(): string {
  try {
    return window.Telegram?.WebApp?.initData || sessionStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export const inTelegram = () => typeof window !== 'undefined' && Boolean(tgInitData());

export function tgApp(): TgWebApp | undefined {
  return typeof window === 'undefined' ? undefined : window.Telegram?.WebApp;
}

export default function TelegramApp() {
  useEffect(() => {
    const fromHash = location.hash.includes('tgWebAppData');
    let saved = '';
    try {
      saved = sessionStorage.getItem(KEY) || '';
    } catch {}
    if (!fromHash && !saved) return;
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-web-app.js';
    s.async = true;
    s.onload = () => {
      const w = window.Telegram?.WebApp;
      if (!w) return;
      try {
        if (w.initData) sessionStorage.setItem(KEY, w.initData);
      } catch {}
      w.ready();
      w.expand();
      w.setHeaderColor?.('#ffffff');
      w.setBackgroundColor?.('#ffffff');
      // the in-app "back" button follows the site's history
      const back = w.BackButton;
      if (back) {
        const sync = () => (location.pathname === '/' ? back.hide() : back.show());
        back.onClick(() => history.back());
        sync();
        addEventListener('popstate', sync);
        const push = history.pushState;
        history.pushState = function (...a: Parameters<typeof history.pushState>) {
          push.apply(this, a);
          setTimeout(sync, 0);
        };
      }
      document.documentElement.classList.add('in-tg');
      window.dispatchEvent(new Event('mt-tg'));
    };
    document.head.appendChild(s);
  }, []);
  return null;
}
