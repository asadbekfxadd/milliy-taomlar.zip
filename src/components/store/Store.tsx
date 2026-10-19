'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Dish } from '@/lib/types';
import { basePrice, cartKey, portionLabel, priceCart } from '@/lib/pricing';
import { fmt } from '@/lib/format';
import { TAGS } from '@/lib/defaults';
import { catName, unitText } from '@/lib/i18n';
import { useSite } from '../Providers';
import DishArt from '../DishArt';
import { readTable } from '../TableEntry';
import { useMode, type Mode } from './mode';

const L = (lang: string, uz: string, ru: string) => (lang === 'uz' ? uz : ru);
const nameOf = (d: Dish, lang: string) => (lang === 'ru' ? d.ru || d.name : d.name);
const hasOptions = (d: Dish) => d.sizes.length > 1 || d.extras.length > 0;

/* ---------- one product card ---------- */
export function StoreCard({ d }: { d: Dish }) {
  const { lang, cart, add, setQty, openDish } = useSite();
  const price = basePrice(d);
  const key = cartKey(d.id, 0, []);
  const inCart = cart.filter((i) => i.id === d.id).reduce((s, i) => s + i.qty, 0);
  const simple = !hasOptions(d);
  const badge = d.tags.find((x) => TAGS[x]?.badge);
  const weight = unitText(portionLabel(d), lang as 'uz' | 'ru');
  return (
    <article className="s-card" data-fly onClick={() => openDish(d.id)}>
      <div className="pic">
        {badge && <span className="tag">{TAGS[badge][lang as 'uz' | 'ru']}</span>}
        <DishArt art={d.art} photo={d.photo} label={nameOf(d, lang)} sizes="(max-width: 860px) 50vw, 260px" />
      </div>
      <div className="info">
        {price > 0 ? (
          <span className="price">
            {hasOptions(d) && d.sizes.length > 1 ? L(lang, 'dan ', 'от ') : ''}
            {fmt(price)}
            <small>{L(lang, 'soʻm', 'сум')}</small>
          </span>
        ) : (
          <span className="price na">{L(lang, 'Narxi aniqlanmoqda', 'Цена уточняется')}</span>
        )}
        <span className="name">{nameOf(d, lang)}</span>
        {weight && <span className="w">{weight}</span>}
      </div>
      <div className="act" onClick={(e) => e.stopPropagation()}>
        {!d.available ? (
          <button className="s-add" disabled>
            {L(lang, 'Tugagan', 'Нет в наличии')}
          </button>
        ) : price <= 0 ? (
          <button className="s-add" disabled>
            {L(lang, 'Tez orada', 'Скоро')}
          </button>
        ) : simple && inCart > 0 ? (
          <div className="s-step">
            <button aria-label={L(lang, 'Kamaytirish', 'Меньше')} onClick={() => setQty(key, inCart - 1)}>
              −
            </button>
            <b>{inCart}</b>
            <button aria-label={L(lang, 'Koʻpaytirish', 'Больше')} onClick={(e) => add(d.id, 0, [], 1, e.currentTarget, true)}>
              +
            </button>
          </div>
        ) : (
          <button className="s-add" onClick={(e) => (simple ? add(d.id, 0, [], 1, e.currentTarget, true) : openDish(d.id))}>
            {simple ? '+ ' + L(lang, 'Qoʻshish', 'Добавить') : L(lang, 'Tanlash', 'Выбрать')}
            {!simple && inCart > 0 ? ` · ${inCart}` : ''}
          </button>
        )}
      </div>
    </article>
  );
}

/* ---------- the storefront: stories, banners, category bar, menu, cart ---------- */
export default function Store() {
  const { menu, lang, settings: st } = useSite();
  const cats = useMemo(
    () =>
      menu.cats
        .map((c) => {
          const ds = menu.dishes.filter((d) => d.cat === c.id);
          // orderable first, the rest after
          ds.sort((a, b) => Number(basePrice(b) > 0 && b.available) - Number(basePrice(a) > 0 && a.available));
          return { c, ds };
        })
        .filter((x) => x.ds.length),
    [menu],
  );
  const [active, setActive] = useState(cats[0]?.c.id);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (v) setActive((v.target as HTMLElement).id.replace('cat-', ''));
      },
      { rootMargin: '-160px 0px -55% 0px' },
    );
    document.querySelectorAll('.s-sec').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [cats.length]);
  // keep the active pill visible in the bar
  useEffect(() => {
    bar.current?.querySelector<HTMLElement>(`[data-c="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [active]);
  // /menu#cat-grill
  useEffect(() => {
    const h = location.hash;
    if (h.startsWith('#cat-')) setTimeout(() => document.querySelector(h)?.scrollIntoView(), 50);
  }, []);

  const go = (id: string) => document.getElementById('cat-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <div className="s-wrap">
        <div className="s-stories">
          {cats.map(({ c, ds }) => {
            const p = ds.find((d) => d.photo) || ds[0];
            return (
              <button key={c.id} className="s-story" onClick={() => go(c.id)}>
                <span>
                  <span>
                    <DishArt art={p.art} photo={p.photo} sizes="80px" />
                  </span>
                </span>
                <small>{catName(c, lang)}</small>
              </button>
            );
          })}
        </div>
      </div>

      <Banners onCat={go} />

      <div className="s-cats">
        <div className="s-wrap">
          <div className="row" ref={bar}>
            {cats.map(({ c }) => (
              <button key={c.id} data-c={c.id} className={active === c.id ? 'on' : ''} onClick={() => go(c.id)}>
                {catName(c, lang)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="s-wrap s-body">
        <div>
          {cats.map(({ c, ds }) => (
            <section key={c.id} id={'cat-' + c.id} className="s-sec">
              <h2>{catName(c, lang)}</h2>
              <div className="s-grid">
                {ds.map((d) => (
                  <StoreCard key={d.id} d={d} />
                ))}
              </div>
            </section>
          ))}
          {!cats.length && <p className="s-min">{L(lang, 'Menyu tez orada', 'Меню скоро появится')}</p>}
        </div>
        <CartPanel />
      </div>
      <MobileBar />
      <span hidden>{st.name}</span>
    </>
  );
}

/* ---------- banners ---------- */
function Banners({ onCat }: { onCat: (id: string) => void }) {
  const { menu, settings: st, lang } = useSite();
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);

  const withPhoto = menu.dishes.filter((d) => d.photo && d.available);
  const featured = [...withPhoto.filter((d) => d.featured), ...withPhoto].filter((d, k, a) => a.indexOf(d) === k);
  const grill = menu.dishes.filter((d) => d.cat === 'grill');
  const grillPics = [...grill.filter((d) => d.photo), ...grill];
  const brizol = menu.dishes.find((d) => d.id === 'm-brizol-cheese') || menu.dishes.find((d) => d.featured && d.cat !== 'grill');
  const minGrill = Math.min(...grill.map(basePrice).filter((p) => p > 0));
  const tel = st.phone;

  type Slide = { key: string; cls: string; body: React.ReactNode; pics: Dish[]; onClick?: () => void };
  const slides: Slide[] = [
    {
      key: 'brand',
      cls: '',
      pics: featured.slice(0, 3),
      body: (
        <>
          <div className="brand">
            {st.name}
            <small>milliy taomlar · {L(lang, 'Yangiyoʻl', 'Янгиюль')}</small>
          </div>
          <div>
            <p>{L(lang, 'Yetkazib berish va olib ketish', 'Доставка и самовывоз')}</p>
            {tel && <div className="big">{tel}</div>}
          </div>
        </>
      ),
    },
  ];
  if (grill.length)
    slides.push({
      key: 'grill',
      cls: 'warm',
      pics: grillPics.slice(0, 3),
      onClick: () => onCat('grill'),
      body: (
        <>
          <h2>{L(lang, 'Koʻmirda pishgan shashlik', 'Шашлык на углях')}</h2>
          <p>{L(lang, 'Lula, qoʻy va mol goʻshti, file dumba bilan — mangaldan toʻgʻri stolingizga.', 'Люля, баранина, говядина, филе с курдюком — с мангала прямо к вам.')}</p>
          <span className="cta">{Number.isFinite(minGrill) ? L(lang, `${fmt(minGrill)} soʻmdan`, `от ${fmt(minGrill)} сум`) : L(lang, 'Shashlik menyusi', 'Меню шашлыка')}</span>
        </>
      ),
    });
  if (brizol)
    slides.push({
      key: 'signature',
      cls: 'green',
      pics: [brizol, ...featured.filter((d) => d !== brizol).slice(0, 2)],
      onClick: () => onCat(brizol.cat),
      body: (
        <>
          <h2>{L(lang, `Firma taomi — ${brizol.name}`, `Фирменное — ${brizol.ru || brizol.name}`)}</h2>
          <p>{lang === 'uz' ? brizol.descUz || brizol.desc : brizol.desc}</p>
          <span className="cta">{basePrice(brizol) > 0 ? L(lang, `${fmt(basePrice(brizol))} soʻm`, `${fmt(basePrice(brizol))} сум`) : L(lang, 'Menyuda', 'В меню')}</span>
        </>
      ),
    });

  const to = (k: number) => {
    const el = track.current;
    const s = el?.children[k] as HTMLElement | undefined;
    if (!el || !s) return;
    el.scrollTo({ left: s.offsetLeft - (el.clientWidth - s.clientWidth) / 2, behavior: 'smooth' });
  };
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const f = () => {
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      [...el.children].forEach((c, k) => {
        const h = c as HTMLElement;
        if (Math.abs(h.offsetLeft + h.clientWidth / 2 - mid) < Math.abs((el.children[best] as HTMLElement).offsetLeft + (el.children[best] as HTMLElement).clientWidth / 2 - mid)) best = k;
      });
      setI(best);
    };
    el.addEventListener('scroll', f, { passive: true });
    return () => el.removeEventListener('scroll', f);
  }, []);
  useEffect(() => {
    if (pause || slides.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setTimeout(() => to((i + 1) % slides.length), 6500);
    return () => clearTimeout(t);
  }, [i, pause, slides.length]);

  return (
    <div className="s-banners" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)} onTouchStart={() => setPause(true)}>
      <div className="s-track" ref={track}>
        {slides.map((s) => (
          <div key={s.key} className={`s-slide ${s.cls}`} onClick={s.onClick} role={s.onClick ? 'button' : undefined} style={s.onClick ? { cursor: 'pointer' } : undefined}>
            <div className="copy">{s.body}</div>
            <div className="pics" aria-hidden="true">
              {s.pics.slice(0, 3).map((d, k) => (
                <span key={d.id} className={`p p${k + 1}`}>
                  <DishArt art={d.art} photo={d.photo} sizes="(max-width: 860px) 60vw, 520px" eager={k === 0} />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <>
          <button className="s-arrow l" aria-label={L(lang, 'Oldingi', 'Назад')} onClick={() => to((i - 1 + slides.length) % slides.length)}>
            <svg viewBox="0 0 24 24">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button className="s-arrow r" aria-label={L(lang, 'Keyingi', 'Вперёд')} onClick={() => to((i + 1) % slides.length)}>
            <svg viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="s-dots">
            {slides.map((s, k) => (
              <button key={s.key} className={k === i ? 'on' : ''} aria-label={`${k + 1}`} onClick={() => to(k)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- cart: sticky panel on wide screens, bottom bar on phones ---------- */
function useCartSummary() {
  const { menu, cart, settings: st } = useSite();
  const allowed = [st.delivery && 'delivery', st.pickup && 'pickup'].filter(Boolean) as Mode[];
  const [mode] = useMode(allowed);
  const [table, setTable] = useState<number | null>(null);
  useEffect(() => setTable(readTable()), []);
  const { lines, subtotal } = useMemo(() => priceCart(menu, cart), [menu, cart]);
  const zones = st.zones || [];
  const minOrder = !table && mode === 'delivery' && zones.length ? Math.min(...zones.map((z) => +z.min)) : 0;
  return { lines, subtotal, minOrder, mode, table };
}

function CartPanel() {
  const { lang, setQty, add } = useSite();
  const { lines, subtotal, minOrder, mode, table } = useCartSummary();
  const left = Math.max(0, minOrder - subtotal);
  return (
    <aside className="s-cart" aria-label={L(lang, 'Savat', 'Корзина')}>
      <h3>{L(lang, 'Savat', 'Корзина')}</h3>
      {!lines.length ? (
        <div className="empty">
          <b>{L(lang, 'Savat boʻsh', 'Пока пусто')}</b>
          {L(lang, 'Taomni tanlang — u shu yerda paydo boʻladi', 'Выберите блюдо — оно появится здесь')}
        </div>
      ) : (
        <>
          {lines.map((l) => (
            <div key={l.key} className="s-line">
              <div className="th">
                <DishArt art={l.d.art} photo={l.d.photo} sizes="56px" />
              </div>
              <div>
                <b>{nameOf(l.d, lang)}</b>
                {l.mods.length > 0 && <small>{l.mods.join(', ')}</small>}
                <div className="bot">
                  <div className="s-step sm">
                    <button aria-label="−" onClick={() => setQty(l.key, l.qty - 1)}>
                      −
                    </button>
                    <b>{l.qty}</b>
                    <button aria-label="+" onClick={() => (l.ex.length || l.si ? setQty(l.key, l.qty + 1) : add(l.id, 0, [], 1, null, true))}>
                      +
                    </button>
                  </div>
                  <span className="sum">{fmt(l.total)}</span>
                </div>
              </div>
            </div>
          ))}
          {minOrder > 0 && left > 0 && (
            <div className="s-min" style={{ ['--w' as string]: `${Math.min(100, (subtotal / minOrder) * 100)}%` }}>
              {L(lang, `Yetkazish uchun yana ${fmt(left)} soʻm`, `До минимальной суммы доставки ${fmt(left)} сум`)}
              <i />
            </div>
          )}
          <div className="s-total">
            <span>{L(lang, 'Jami', 'Итого')}</span>
            <span className="num">{fmt(subtotal)} {L(lang, 'soʻm', 'сум')}</span>
          </div>
        </>
      )}
      <Link href="/cart" className={`s-go ${lines.length ? '' : 'dis'}`}>
        {table ? L(lang, 'Stolga buyurtma', 'Заказать к столу') : mode === 'pickup' ? L(lang, 'Rasmiylashtirish · olib ketish', 'Оформить · самовывоз') : L(lang, 'Buyurtmani rasmiylashtirish', 'Оформить заказ')}
      </Link>
    </aside>
  );
}

function MobileBar() {
  const { lang, count } = useSite();
  const { subtotal } = useCartSummary();
  if (!count) return null;
  return (
    <Link href="/cart" className="s-mbar" data-cart-target>
      <span>
        <span className="n">{count}</span>
        {L(lang, 'Savat', 'Корзина')}
      </span>
      <span className="num">{fmt(subtotal)} {L(lang, 'soʻm', 'сум')}</span>
    </Link>
  );
}

/* ---------- search ---------- */
export function StoreSearch({ onClose }: { onClose: () => void }) {
  const { menu, lang } = useSite();
  const [q, setQ] = useState('');
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', f);
    document.body.style.overflow = 'hidden';
    return () => {
      removeEventListener('keydown', f);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  const s = q.trim().toLowerCase();
  const res = s ? menu.dishes.filter((d) => (d.name + ' ' + d.ru + ' ' + d.desc).toLowerCase().includes(s)).slice(0, 40) : [];
  return (
    <div className="s-search st" role="dialog" aria-modal="true" aria-label={L(lang, 'Qidirish', 'Поиск')}>
      <div className="top">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={L(lang, 'Taom nomi: lagʻmon, shashlik…', 'Название блюда: лагман, шашлык…')} />
        <button className="s-icon" onClick={onClose} aria-label={L(lang, 'Yopish', 'Закрыть')}>
          <svg viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div className="res">
        {s && !res.length && <p className="s-min">{L(lang, 'Hech narsa topilmadi', 'Ничего не нашлось')}</p>}
        <div className="s-grid">
          {res.map((d) => (
            <StoreCard key={d.id} d={d} />
          ))}
        </div>
      </div>
    </div>
  );
}
