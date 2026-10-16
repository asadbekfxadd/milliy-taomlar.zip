'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Dish, Settings } from '@/lib/types';
import { basePrice, portionLabel } from '@/lib/pricing';
import { fmt, photoSrc } from '@/lib/format';
import { artBitmap } from './DishArt';
import Girih from './Girih';

export default function Hero({ s, dish }: { s: Settings; dish?: Dish }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const lattice = useRef<HTMLDivElement>(null);

  // plate with rising steam
  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, alive = true;
    const steam: { x: number; y: number; r: number; l: number; m: number; s: number }[] = [];
    (async () => {
      const r = c.getBoundingClientRect();
      const W = Math.round(r.width * Math.min(innerWidth < 1020 ? 1.5 : 2, devicePixelRatio || 1));
      if (!W) return;
      const base = await artBitmap('plov', W);
      if (!alive) return;
      c.width = c.height = W;
      const g = c.getContext('2d')!;
      const frame = () => {
        g.clearRect(0, 0, W, W);
        g.drawImage(base, 0, 0);
        if (reduce) return;
        if (steam.length < 44 && Math.random() < 0.5)
          steam.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: W * 0.5 + (Math.random() - 0.5) * W * 0.16, r: W * (0.04 + Math.random() * 0.05), l: 0, m: 240 + Math.random() * 160, s: Math.random() * 6 });
        g.save();
        g.globalCompositeOperation = 'screen';
        for (let i = steam.length - 1; i >= 0; i--) {
          const p = steam[i];
          p.l++;
          p.y -= W * 0.0016;
          p.x += Math.sin((p.l + p.s * 30) / 40) * W * 0.0009;
          p.r *= 1.004;
          const a = Math.sin((p.l / p.m) * Math.PI) * 0.085;
          const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          gr.addColorStop(0, `rgba(255,246,230,${a})`);
          gr.addColorStop(1, 'rgba(255,246,230,0)');
          g.fillStyle = gr;
          g.beginPath();
          g.arc(p.x, p.y, p.r, 0, 7);
          g.fill();
          if (p.l >= p.m) steam.splice(i, 1);
        }
        g.restore();
        if (document.visibilityState === 'visible' && scrollY < innerHeight * 1.3) raf = requestAnimationFrame(frame);
        else raf = window.setTimeout(() => (raf = requestAnimationFrame(frame)), 400) as unknown as number;
      };
      frame();
    })();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(raf);
    };
  }, []);

  // soft parallax
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = scrollY;
        if (y > innerHeight * 1.2) return;
        if (plate.current) plate.current.style.transform = `translate3d(0,${y * 0.14}px,0) rotate(${y * 0.012}deg)`;
        if (lattice.current) lattice.current.style.transform = `translate3d(0,${y * 0.06}px,0)`;
      });
    };
    addEventListener('scroll', on, { passive: true });
    return () => removeEventListener('scroll', on);
  }, []);

  return (
    <section className="hero g">
      <div ref={lattice} style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
        <Girih w={1600} h={1000} step={200} className="lattice" />
      </div>
      <div className="edge">Ош · Сомса · Шашлик · Шўрва · Лағмон</div>
      <div className="in">
        <div className="hero-copy">
          <div className="issue">
            <i />
            <span className="kicker">
              {s.name}
              {s.city ? ` · ${s.city}` : ''}
            </span>
          </div>
          <h1>
            <span className="l">
              <span>Вкус,</span>
            </span>
            <span className="l">
              <span>в котором живёт</span>
            </span>
            <span className="l">
              <span>
                <em>Узбекистан</em>
              </span>
            </span>
          </h1>
          <p className="sub">{s.tagline}</p>
          <div className="ctas">
            <Link className="btn" href="/menu">
              Открыть меню
            </Link>
            <button className="btn ghost" onClick={() => document.getElementById('live')?.scrollIntoView({ behavior: 'smooth' })}>
              Как рождается ош
            </button>
          </div>
        </div>
        <div className="plate" ref={plate}>
          {dish?.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoSrc(dish.photo)} alt={dish.ru} fetchPriority="high" />
          ) : (
            <canvas ref={cv} role="img" aria-label="Плов на риштанском лагане" />
          )}
          {dish && (
            <div className="plate-tag">
              <i />
              <span className="cap">
                {dish.name} · {portionLabel(dish)} · {fmt(basePrice(dish))} сум
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
