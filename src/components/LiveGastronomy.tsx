'use client';
import { useEffect, useRef, useState } from 'react';
import { LIVE_STEPS } from '@/lib/defaults';
import { loadArt } from './DishArt';

/* Scroll-driven kazan: heat → meat & onion → carrots → rice → finished osh with steam. */
export default function LiveGastronomy() {
  const sec = useRef<HTMLElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduce(rm);
    let raf = 0, alive = true, lastP = -1, lastStep = -1, visible = false;
    const steam: { x: number; y: number; r: number; l: number; m: number }[] = [];
    const io = new IntersectionObserver((es) => (visible = es[0].isIntersecting), { rootMargin: '100px 0px' });
    if (sec.current) io.observe(sec.current);

    loadArt().then((m) => {
      if (!alive || !cv.current) return;
      const c = cv.current;
      const size = () => {
        const r = c.getBoundingClientRect();
        const W = Math.round(r.width * Math.min(innerWidth < 1020 ? 1.25 : 1.75, devicePixelRatio || 1));
        c.width = c.height = W;
        m.GRILL.W = 0;
        lastP = -1;
      };
      size();
      const ro = new ResizeObserver(() => size());
      ro.observe(c);
      const loop = () => {
        if (!alive) return;
        if (visible && sec.current) {
          const r = sec.current.getBoundingClientRect();
          const p = rm ? 1 : m.clamp(-r.top / (r.height - innerHeight));
          const W = c.width;
          if (Math.abs(p - lastP) > 0.0005 || p > 0.86) {
            const g = c.getContext('2d')!;
            m.drawLiveGrill(g, W, W, p);
            if (p > 0.86 && !rm) {
              if (steam.length < 34 && Math.random() < 0.4) steam.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: W * 0.5, r: W * 0.05, l: 0, m: 200 + Math.random() * 120 });
              g.save();
              g.globalCompositeOperation = 'screen';
              const k = m.seg(p, 0.86, 1);
              for (let i = steam.length - 1; i >= 0; i--) {
                const s = steam[i];
                s.l++;
                s.y -= W * 0.0018;
                s.r *= 1.004;
                const a = Math.sin((s.l / s.m) * Math.PI) * 0.08 * k;
                const gr = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
                gr.addColorStop(0, `rgba(255,246,230,${a})`);
                gr.addColorStop(1, 'rgba(255,246,230,0)');
                g.fillStyle = gr;
                g.beginPath();
                g.arc(s.x, s.y, s.r, 0, 7);
                g.fill();
                if (s.l >= s.m) steam.splice(i, 1);
              }
              g.restore();
            }
            const st = Math.min(4, Math.floor(p * 5.2));
            if (st !== lastStep) {
              lastStep = st;
              setStep(st);
            }
            if (bar.current) bar.current.style.width = p * 100 + '%';
            lastP = p;
          }
        }
        raf = requestAnimationFrame(loop);
      };
      loop();
      return () => ro.disconnect();
    });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return (
    <section className="live" id="live" ref={sec} aria-label="Живая гастрономия: как жарят шашлык">
      <div className="live-stage g">
        <div className="live-copy">
          <div className="kicker">Живая гастрономия</div>
          <h2>
            Пять шагов <em>до тарелки</em>
          </h2>
          <ol className="steps">
            {LIVE_STEPS.map((s, i) => (
              <li key={i} className={reduce || i === step ? 'on' : ''}>
                <b className="num">0{i + 1}</b>
                <h3>{s[0]}</h3>
                <p>{s[1]}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="live-canvas">
          <canvas ref={cv} aria-hidden="true" />
          <div className="live-bar">
            <i ref={bar} />
          </div>
        </div>
      </div>
    </section>
  );
}
