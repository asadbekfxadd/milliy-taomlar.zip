'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Dish } from '@/lib/types';
import { basePrice, portionLabel } from '@/lib/pricing';
import { fmt } from '@/lib/format';
import { prepRange, unitText } from '@/lib/i18n';
import { useClosed, useSite } from './Providers';
import DishArt from './DishArt';
import Girih from './Girih';

/* Spread of dishes: one dominant plate and supporting plates around it, with floating herbs and spices. */
const SLOTS = ['main', 'a', 'b', 'c', 'd', 'e'] as const;

function Leaf({ className, color = '#6E9E45' }: { className: string; color?: string }) {
  return (
    <svg className={`deco ${className}`} viewBox="0 0 60 30" aria-hidden="true">
      <path d="M2 15C14 2 40 0 58 15C40 30 14 28 2 15Z" fill={color} />
      <path d="M4 15H52" stroke="rgba(255,255,255,.35)" strokeWidth="1.2" />
    </svg>
  );
}
function Chili({ className }: { className: string }) {
  return (
    <svg className={`deco ${className}`} viewBox="0 0 70 30" aria-hidden="true">
      <path d="M8 14C20 6 46 4 62 18C50 26 22 26 8 20Z" fill="#C2362B" />
      <path d="M8 14C5 10 3 8 1 9" stroke="#5C8A3C" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M22 12C34 9 46 10 56 16" stroke="rgba(255,255,255,.35)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
function Seeds({ className }: { className: string }) {
  return (
    <svg className={`deco ${className}`} viewBox="0 0 60 40" aria-hidden="true">
      {[[8, 10], [22, 6], [36, 14], [14, 24], [30, 28], [48, 22], [44, 6]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="4.2" ry="2" transform={`rotate(${i * 37} ${x} ${y})`} fill={i % 3 ? '#C9A46A' : '#8C6A3C'} />
      ))}
    </svg>
  );
}
function Pomegranate({ className }: { className: string }) {
  return (
    <svg className={`deco ${className}`} viewBox="0 0 40 40" aria-hidden="true">
      {[[10, 12], [20, 8], [28, 16], [16, 22], [26, 28], [12, 32]].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx="4" ry="5" fill="#B5202A" />
          <ellipse cx={x - 1.2} cy={y - 1.8} rx="1.2" ry="1.6" fill="rgba(255,255,255,.55)" />
        </g>
      ))}
    </svg>
  );
}

export default function Hero({ dishes }: { dishes: Dish[] }) {
  const { settings: s, t, lang, count } = useSite();
  const closed = useClosed();
  const stage = useRef<HTMLDivElement>(null);
  const main = dishes[0];

  // gentle parallax on scroll and pointer (skipped with reduced motion)
  useEffect(() => {
    const el = stage.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0,
      mx = 0,
      my = 0;
    const apply = () => {
      raf = 0;
      const y = Math.min(scrollY, innerHeight);
      el.style.setProperty('--sy', String(y));
      el.style.setProperty('--mx', mx.toFixed(3));
      el.style.setProperty('--my', my.toFixed(3));
    };
    const ask = () => (raf ||= requestAnimationFrame(apply));
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
      ask();
    };
    addEventListener('scroll', ask, { passive: true });
    addEventListener('pointermove', onMove, { passive: true });
    return () => {
      removeEventListener('scroll', ask);
      removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const zones = s.delivery ? s.zones : [];
  const minFee = zones.length ? Math.min(...zones.map((z) => +z.fee)) : null;
  const minOrder = zones.length ? Math.min(...zones.map((z) => +z.min)) : null;

  return (
    <section className="hero2 g">
      <div className="hero-bg" aria-hidden="true">
        <Girih w={1600} h={1000} step={200} className="lattice" />
      </div>
      <div className="in">
        <div className="hero-copy">
          <div className="issue">
            <i />
            <span className="kicker">
              {s.name} · milliy taomlar · {lang === 'uz' ? 'Yangiyoʻl' : 'Янгиюль'}
            </span>
          </div>
          <h1>
            <span className="l">
              <span>{t('hero.h1a')}</span>
            </span>
            <span className="l">
              <span>
                <em>{t('hero.h1b')}</em>
              </span>
            </span>
          </h1>
          <p className="sub">{t('hero.sub')}</p>
          <div className="ctas">
            <Link className="btn" href="/menu">
              {t('hero.cta1')}
            </Link>
            <Link className="btn ghost" href={count ? '/cart' : '#moods'}>
              {t('hero.cta2')}
            </Link>
          </div>
          {closed && (
            <p className="closed-note" role="status">
              <b>{closed.title}</b> · {closed.when}
            </p>
          )}
          <ul className="strip" aria-label="info">
            <li>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l3 2M9 2h6" />
              </svg>
              {t('strip.time', { t: prepRange(s) })}
            </li>
            {minFee !== null ? (
              <>
                <li>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 7h11v9H2zM13 10h4l4 3v3h-8z" />
                    <circle cx="6" cy="18" r="2" />
                    <circle cx="17" cy="18" r="2" />
                  </svg>
                  {t('strip.delivery', { f: fmt(minFee) })}
                </li>
                <li>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2" />
                  </svg>
                  {t('strip.min', { m: fmt(minOrder!) })}
                </li>
              </>
            ) : (
              <li>{s.pickup ? t('strip.pickup') : t('strip.hall')}</li>
            )}
          </ul>
        </div>

        <div className="spread2" ref={stage}>
          <div className="glow" aria-hidden="true" />
          {dishes.slice(0, SLOTS.length).map((d, i) => (
            <div key={d.id} className={`pl pl-${SLOTS[i]}`} style={{ ['--i' as string]: i }}>
              <DishArt art={d.art} photo={d.photo} className="round" label={d.name} eager={i < 3} sizes={i === 0 ? '(max-width: 1020px) 62vw, 480px' : '(max-width: 1020px) 34vw, 240px'} />
            </div>
          ))}
          <Leaf className="dl1" />
          <Leaf className="dl2" color="#7FAE4E" />
          <Leaf className="dl3" color="#4F7A34" />
          <Chili className="dc1" />
          <Seeds className="ds1" />
          <Seeds className="ds2" />
          <Pomegranate className="dp1" />
          {main && (
            <div className="plate-tag">
              <i />
              <span className="cap">
                {main.name} · {unitText(portionLabel(main), lang)} · {fmt(basePrice(main))} {t('sum')}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
