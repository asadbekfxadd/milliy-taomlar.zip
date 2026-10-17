'use client';
import { useState } from 'react';
import type { Dish } from '@/lib/types';
import { TAGS } from '@/lib/defaults';
import { basePrice, portionLabel, unitPrice } from '@/lib/pricing';
import { fmt } from '@/lib/format';
import { dishDesc, dishSub, unitText } from '@/lib/i18n';
import { useSite } from './Providers';
import DishArt from './DishArt';

/** Only real tags become badges (TOP TANLOV / HIT / YANGI). */
export function Badges({ d }: { d: Dish }) {
  const { lang } = useSite();
  const t = d.tags.filter((x) => TAGS[x]?.badge);
  if (!t.length) return null;
  return (
    <div className="badges">
      {t.map((x) => (
        <span key={x} className={`badge ${x}`}>
          {TAGS[x][lang]}
        </span>
      ))}
    </div>
  );
}

export function Price({ v, className = '' }: { v: number; className?: string }) {
  const { t } = useSite();
  return (
    <span className={`price num ${className}`}>
      {fmt(v)}
      <small>{t('sum')}</small>
    </span>
  );
}

const hasOptions = (d: Dish) => d.sizes.length > 1 || d.extras.length > 0;

/** The signature round "+" — adds and flies the picture into the cart, or opens options. */
export function PlusButton({ d, qty = 1, className = '' }: { d: Dish; qty?: number; className?: string }) {
  const { add, openDish, t } = useSite();
  const [done, setDone] = useState(0);
  if (!d.available) return <span className="soldout">{t('dish.soldout')}</span>;
  return (
    <button
      type="button"
      className={`plus ${done ? 'done' : ''} ${className}`}
      aria-label={hasOptions(d) ? t('dish.choose') + ': ' + d.name : t('dish.addAria', { n: d.name })}
      onClick={(e) => {
        e.stopPropagation();
        if (hasOptions(d) && qty === 1) return openDish(d.id);
        add(d.id, 0, [], qty, e.currentTarget);
        setDone((n) => n + 1);
        setTimeout(() => setDone(0), 1300);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {done ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 5v14M5 12h14" />}
      </svg>
    </button>
  );
}

/** Clickable picture that opens the dish sheet. */
export function Opener({ d, children, className = '' }: { d: Dish; children: React.ReactNode; className?: string }) {
  const { openDish, t } = useSite();
  return (
    <div
      className={`opener ${className}`}
      role="button"
      tabIndex={0}
      aria-label={t('dish.more', { n: d.name })}
      onClick={() => openDish(d.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDish(d.id);
        }
      }}
    >
      {children}
    </div>
  );
}

/** Menu card. `tile` = grid card (row on phones), `feature` = large editorial card. */
export function DishCard({ d, variant = 'tile', eager = false }: { d: Dish; variant?: 'tile' | 'feature'; eager?: boolean }) {
  const { lang, openDish } = useSite();
  const sub = dishSub(d, lang);
  return (
    <article className={`card-${variant} ${d.available ? '' : 'off'}`} data-fly>
      <div className="fig">
        <Opener d={d}>
          <DishArt art={d.art} photo={d.photo} className={variant === 'feature' ? 'r45' : ''} label={d.name} eager={eager} sizes={variant === 'feature' ? '(max-width: 1020px) 100vw, 720px' : '(max-width: 640px) 116px, 360px'} />
        </Opener>
        <Badges d={d} />
        <PlusButton d={d} />
      </div>
      <div className="txt">
        <h3 onClick={() => openDish(d.id)}>{d.name}</h3>
        {sub && <div className="sub">{sub}</div>}
        <p>{dishDesc(d, lang)}</p>
        <div className="meta">
          <Price v={basePrice(d)} />
          <span className="weight">{unitText(portionLabel(d), lang)}</span>
        </div>
      </div>
    </article>
  );
}

/** Grill card: compare portions and pick the number of skewers right on the card. */
export function GrillCard({ d }: { d: Dish }) {
  const { lang, t, add, openDish } = useSite();
  const [n, setN] = useState(d.skewer ? 2 : 1);
  const u = unitPrice(d, 0, []);
  return (
    <article className={`card-grill ${d.available ? '' : 'off'}`} data-fly>
      <div className="fig">
        <Opener d={d}>
          <DishArt art={d.art} photo={d.photo} label={d.name} sizes="(max-width: 640px) 116px, 360px" />
        </Opener>
        <Badges d={d} />
      </div>
      <div className="txt">
        <h3 onClick={() => openDish(d.id)}>{d.name}</h3>
        {dishSub(d, lang) && <div className="sub">{dishSub(d, lang)}</div>}
        <p>{dishDesc(d, lang)}</p>
        <div className="meta">
          <Price v={u} />
          <span className="weight">{d.skewer ? t('grill.per') : unitText(portionLabel(d), lang)}</span>
        </div>
        {d.available ? (
          <div className="grill-buy">
            {d.skewer && (
              <div className="stepper sm" aria-label={t('grill.count')}>
                <button type="button" onClick={() => setN(Math.max(1, n - 1))} aria-label={t('dish.less')}>
                  −
                </button>
                <span className="num" aria-live="polite">
                  {n}
                </span>
                <button type="button" onClick={() => setN(Math.min(40, n + 1))} aria-label={t('dish.moreQty')}>
                  +
                </button>
              </div>
            )}
            <button
              type="button"
              className="btn sm"
              onClick={(e) => (d.extras.length && !d.skewer ? openDish(d.id) : add(d.id, 0, [], n, e.currentTarget))}
            >
              <span className="lbl-full">{t('dish.add')} · </span>
              <span className="num">+ {fmt(u * n)}</span>
            </button>
          </div>
        ) : (
          <span className="soldout">{t('dish.soldout')}</span>
        )}
      </div>
    </article>
  );
}
