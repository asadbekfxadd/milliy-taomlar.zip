'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TableNote } from './TableEntry';
import { useSite } from './Providers';
import { DishCard } from './Dish';
import DishArt from './DishArt';
import { MOODS, TAGS } from '@/lib/defaults';
import { catName, catSub } from '@/lib/i18n';

const LIGHT = new Set(['cream', 'herb', 'sand']);
const FILTER_TAGS = ['new', 'hit', 'veg', 'spicy'];

export default function MenuView() {
  const { menu, t, lang } = useSite();
  const [mood, setMood] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const [active, setActive] = useState<string | undefined>(menu.cats[0]?.id);
  const catsBox = useRef<HTMLDivElement>(null);

  const groups = useMemo(
    () =>
      menu.cats
        .map((c) => ({
          c,
          ds: menu.dishes.filter((d) => d.cat === c.id && filters.every((f) => d.tags.includes(f)) && (!mood || d.moods?.includes(mood))),
        }))
        .filter((g) => g.ds.length),
    [menu, filters, mood],
  );
  const total = menu.dishes.filter((d) => menu.cats.some((c) => c.id === d.cat)).length;

  // scroll-spy: highlight the category in view
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive((e.target as HTMLElement).dataset.catsec)), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('[data-catsec]').forEach((s) => io.observe(s));
    const top = () => {
      const first = document.querySelector<HTMLElement>('[data-catsec]');
      if (first && first.getBoundingClientRect().top > innerHeight * 0.5) setActive(first.dataset.catsec);
    };
    addEventListener('scroll', top, { passive: true });
    return () => (io.disconnect(), removeEventListener('scroll', top));
  }, [groups]);
  useEffect(() => {
    const b = catsBox.current?.querySelector<HTMLElement>(`[data-cat="${active}"]`);
    if (b && catsBox.current) catsBox.current.scrollTo({ left: b.offsetLeft - catsBox.current.offsetLeft - 20, behavior: 'smooth' });
  }, [active]);
  // deep link: /menu#cat-grill
  useEffect(() => {
    const h = location.hash.replace('#cat-', '');
    if (h) setTimeout(() => go(h), 200);
  }, []);

  const toggle = (k: string) => setFilters((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));
  const go = (id: string) => {
    const s = document.getElementById('cat-' + id);
    if (s) scrollTo({ top: s.getBoundingClientRect().top + scrollY - 120, behavior: 'smooth' });
  };
  const reset = () => (setFilters([]), setMood(null));

  return (
    <>
      <section className="masthead menu-mast g">
        <div className="in">
          <div className="kicker">MANGO · milliy taomlar</div>
          <h1>{t('menu.h')}</h1>
          <TableNote />
          <div className="row">
            <p className="muted lead-p">{t('menu.lead')}</p>
            <span className="cap num">{t('menu.count', { d: total, c: groups.length })}</span>
          </div>
          <div className="chips" aria-label={t('menu.mood')}>
            {MOODS.map((m) => (
              <button key={m.id} className={`chip m-${m.id} ${mood === m.id ? 'on' : ''}`} aria-pressed={mood === m.id} onClick={() => setMood(mood === m.id ? null : m.id)}>
                {lang === 'uz' ? m.uz : m.ru}
              </button>
            ))}
            <span className="sep" aria-hidden="true" />
            {FILTER_TAGS.map((k) => (
              <button key={k} className={`chip tagchip ${filters.includes(k) ? 'on' : ''}`} aria-pressed={filters.includes(k)} onClick={() => toggle(k)}>
                {TAGS[k][lang]}
              </button>
            ))}
            {(filters.length > 0 || mood) && (
              <button className="link" onClick={reset}>
                {t('menu.reset')}
              </button>
            )}
          </div>
        </div>
      </section>

      <nav className="catnav g" aria-label={t('nav.sections')}>
        <div className="in">
          <div className="cats" ref={catsBox}>
            {groups.map(({ c, ds }) => (
              <button key={c.id} data-cat={c.id} className={active === c.id ? 'on' : ''} onClick={() => go(c.id)}>
                {catName(c, lang)}
                <sup className="num">{ds.length}</sup>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {groups.length ? (
        groups.map(({ c, ds }) => {
          const theme = c.theme || 'pom';
          const lead = ds.find((d) => d.featured && d.available) ?? null;
          const rest = ds.filter((d) => d !== lead);
          const art = (lead ?? ds[0]).art;
          return (
            <section key={c.id} className={`catsec g th-${theme} ${LIGHT.has(theme) ? 'sec-light' : ''}`} id={'cat-' + c.id} data-catsec={c.id}>
              <div className="in">
                <header className="cat-h">
                  <div>
                    <span className="cap">{catSub(c, lang)}</span>
                    <h2>{catName(c, lang)}</h2>
                  </div>
                  <span className="cat-n num">{String(ds.length).padStart(2, '0')}</span>
                  <span className="cat-art" aria-hidden="true">
                    <DishArt art={art} className="round" sizes="220px" />
                  </span>
                </header>
                {lead && (
                  <div className="lead2">
                    <DishCard d={lead} variant="feature" />
                  </div>
                )}
                <div className="tile-grid">
                  {rest.map((d) => (
                    <DishCard key={d.id} d={d} />
                  ))}
                </div>
              </div>
            </section>
          );
        })
      ) : (
        <div className="empty g">
          {t('menu.none')}{' '}
          <button className="link" onClick={reset}>
            {t('menu.resetAll')}
          </button>
        </div>
      )}
    </>
  );
}
