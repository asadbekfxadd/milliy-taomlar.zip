'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSite } from './Providers';
import { DishBody, DishObj, DishRow, Opener, Tags } from './Dish';
import DishArt from './DishArt';
import { TAGS } from '@/lib/defaults';

export default function MenuView() {
  const { menu, settings } = useSite();
  const [filters, setFilters] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | undefined>(menu.cats[0]?.id);
  const catsBox = useRef<HTMLDivElement>(null);

  const groups = useMemo(
    () =>
      menu.cats
        .map((c) => ({ c, ds: menu.dishes.filter((d) => d.cat === c.id && filters.every((f) => d.tags.includes(f))) }))
        .filter((g) => g.ds.length),
    [menu, filters],
  );
  const total = menu.dishes.filter((d) => menu.cats.some((c) => c.id === d.cat)).length;

  // scroll-spy: highlight the category in view
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setActive((e.target as HTMLElement).dataset.catsec)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    document.querySelectorAll('[data-catsec]').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [groups]);
  useEffect(() => {
    const b = catsBox.current?.querySelector<HTMLElement>(`[data-cat="${active}"]`);
    if (b && catsBox.current) catsBox.current.scrollTo({ left: b.offsetLeft - catsBox.current.offsetLeft - 20, behavior: 'smooth' });
  }, [active]);

  const toggle = (k: string) => setFilters((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));
  const go = (id: string) => {
    const s = document.getElementById('cat-' + id);
    if (s) scrollTo({ top: s.getBoundingClientRect().top + scrollY - 130, behavior: 'smooth' });
  };

  return (
    <>
      <section className="masthead g">
        <div className="in">
          <div className="kicker">{settings.name}</div>
          <h1>Меню</h1>
          <div className="row">
            <p className="muted" style={{ maxWidth: '48ch', margin: 0, fontSize: 17 }}>
              Нажмите на блюдо, чтобы увидеть состав, аллергены и выбрать порцию. Цены в сумах.
            </p>
            <span className="cap num">
              {total} блюд · {menu.cats.length} разделов
            </span>
          </div>
        </div>
      </section>

      <nav className="catnav g" aria-label="Разделы меню">
        <div className="in">
          <div className="cats" ref={catsBox}>
            {menu.cats.map((c) => {
              const n = menu.dishes.filter((d) => d.cat === c.id).length;
              return n ? (
                <button key={c.id} data-cat={c.id} className={active === c.id ? 'on' : ''} onClick={() => go(c.id)}>
                  {c.name}
                  <sup className="num">{n}</sup>
                </button>
              ) : null;
            })}
          </div>
          <button className="filt-btn" aria-expanded={open} aria-controls="filters" onClick={() => setOpen(!open)}>
            {filters.length > 0 && <span className="dot" />}Фильтры
          </button>
        </div>
        <div className={`filters ${open ? 'open' : ''}`} id="filters">
          <div>
            <div className="in fl">
              {Object.entries(TAGS).map(([k, l]) => (
                <button key={k} className={`chk ${filters.includes(k) ? 'on' : ''}`} aria-pressed={filters.includes(k)} onClick={() => toggle(k)}>
                  {l}
                </button>
              ))}
              {filters.length > 0 && (
                <button className="link" onClick={() => setFilters([])}>
                  Сбросить
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="g">
        <div className="in">
          {groups.length ? (
            groups.map(({ c, ds }, ci) => {
              const [a, b, cc, ...rest] = ds;
              return (
                <section key={c.id} className="catsec" id={'cat-' + c.id} data-catsec={c.id}>
                  <div className="cat-h">
                    <h2>{c.name}</h2>
                    <span className="cap">
                      {c.ru} · {ds.length}
                    </span>
                  </div>
                  {a && (
                    <div className={`lead ${ci % 2 ? 'flip' : ''}`}>
                      <Opener d={a}>
                        <Tags d={a} />
                        <DishArt art={a.art} photo={a.photo} className="r4" label={a.ru} />
                      </Opener>
                      <div>
                        <DishBody d={a} />
                      </div>
                    </div>
                  )}
                  {b && (
                    <div className={`pair ${ci % 2 ? '' : 'flip'}`}>
                      <DishObj d={b} ph="r4" />
                      {cc && <DishObj d={cc} />}
                    </div>
                  )}
                  {rest.length > 0 && (
                    <div className="ledger">
                      {rest.map((d) => (
                        <DishRow key={d.id} d={d} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          ) : (
            <div className="empty">
              Нет блюд с такими метками.{' '}
              <button className="link" onClick={() => setFilters([])}>
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
