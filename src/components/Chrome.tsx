'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSite } from './Providers';
import { StarMark } from './Girih';

const NAV = [
  ['/menu', 'Меню'],
  ['/story', 'Больше, чем еда'],
  ['/contacts', 'Контакты'],
] as const;

function useBump(bump: number) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !bump) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }, [bump]);
  return ref;
}

export function Header() {
  const { settings, count, bump } = useSite();
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const n = useBump(bump);
  useEffect(() => {
    const f = () => setScrolled(scrollY > 10);
    f();
    addEventListener('scroll', f, { passive: true });
    return () => removeEventListener('scroll', f);
  }, []);
  return (
    <header className={`mast g ${scrolled ? 'scrolled' : ''}`}>
      <div className="in">
        <Link className="logo" href="/" aria-label="На главную">
          <StarMark style={{ color: 'var(--saffron)', width: 30, height: 30 }} />
          <span>
            <b>{settings.name}</b>
            <small>узбекская кухня</small>
          </span>
        </Link>
        <nav className="nav" aria-label="Разделы">
          {NAV.map(([href, l]) => (
            <Link key={href} href={href} className={path === href ? 'on' : ''} aria-current={path === href ? 'page' : undefined}>
              {l}
            </Link>
          ))}
        </nav>
        <Link className="cartbtn" href="/cart" aria-label={`Корзина, ${count} позиций`}>
          Корзина{' '}
          <span className="n num" ref={n}>
            {count}
          </span>
        </Link>
      </div>
    </header>
  );
}

export function TabBar() {
  const { count, bump } = useSite();
  const path = usePathname();
  const n = useBump(bump);
  const cls = (p: string) => (path === p ? 'on' : '');
  return (
    <nav className="tabbar" aria-label="Навигация">
      <Link href="/" className={cls('/')}>
        <StarMark style={{ width: 22, height: 22 }} />
        Главная
      </Link>
      <Link href="/menu" className={cls('/menu')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M5 4h14M5 9h14M5 14h9M5 19h7" />
        </svg>
        Меню
      </Link>
      <Link href="/cart" className={cls('/cart')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4 6h2l2 11h10l2-8H7" />
          <circle cx="10" cy="20" r="1.2" />
          <circle cx="17" cy="20" r="1.2" />
        </svg>
        Корзина
        <span className="n num" ref={n} hidden={!count}>
          {count}
        </span>
      </Link>
      <Link href="/contacts" className={cls('/contacts')}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        Контакты
      </Link>
    </nav>
  );
}

/** Fades sections in as they scroll into view; content is visible at rest without JS. */
export function Reveal() {
  const path = usePathname();
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.remove('pre');
            io.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -6% 0px' },
    );
    const t = setTimeout(() => {
      document.querySelectorAll('.rv').forEach((el) => {
        if (el.getBoundingClientRect().top > innerHeight) {
          el.classList.add('pre');
          io.observe(el);
        }
      });
    }, 30);
    return () => {
      clearTimeout(t);
      io.disconnect();
    };
  }, [path]);
  return null;
}
