'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Combo, Dish } from '@/lib/types';
import { MOODS } from '@/lib/defaults';
import { basePrice, unitPrice } from '@/lib/pricing';
import { fmt } from '@/lib/format';
import { comboDesc, comboName, prepRange, sizeLabel, zoneName } from '@/lib/i18n';
import { useSite } from './Providers';
import DishArt from './DishArt';
import { DishCard, GrillCard } from './Dish';

const listed = (menu: { cats: { id: string }[]; dishes: Dish[] }) => menu.dishes.filter((d) => menu.cats.some((c) => c.id === d.cat));
/** dishes that can be ordered right now come first */
const priced = (a: Dish, b: Dish) => Number(basePrice(b) > 0) - Number(basePrice(a) > 0);

/* ---------- Bugun nima yeymiz? ---------- */
export function Moods() {
  const { menu, t, lang } = useSite();
  const [mood, setMood] = useState('hearty');
  const dishes = useMemo(() => listed(menu).filter((d) => d.available && d.moods?.includes(mood)).sort(priced), [menu, mood]);
  return (
    <section className="moods sec-light g" id="moods">
      <div className="in">
        <div className="head2 rv">
          <div>
            <div className="kicker">{t('moods.kicker')}</div>
            <h2>{t('moods.h')}</h2>
          </div>
          <p>{t('moods.sub')}</p>
        </div>
        <div className="mood-tiles" role="group" aria-label={t('menu.mood')}>
          {MOODS.map((m) => (
            <button
              key={m.id}
              aria-pressed={mood === m.id}
              className={`mood m-${m.id} ${mood === m.id ? 'on' : ''}`}
              onClick={() => setMood(m.id)}
            >
              <span className="mood-art" aria-hidden="true">
                <DishArt art={m.art} className="round" sizes="160px" />
              </span>
              <b>{lang === 'uz' ? m.uz : m.ru}</b>
              <span>{lang === 'uz' ? m.subUz : m.subRu}</span>
            </button>
          ))}
        </div>
        <div className="rail" key={mood} aria-live="polite">
          {dishes.length ? dishes.slice(0, 10).map((d) => <DishCard key={d.id} d={d} />) : <p className="muted">{t('moods.empty')}</p>}
        </div>
        <div className="more">
          <Link className="btn ghost" href="/menu">
            {t('moods.all')}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Shashlik va gril: ember chapter ---------- */
export function GrillChapter() {
  const { menu, t } = useSite();
  const grill = listed(menu).filter((d) => d.cat === 'grill');
  if (!grill.length) return null;
  return (
    <section className="grill-ch g" aria-labelledby="grillH">
      <div className="smoke" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="sparks" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ ['--k' as string]: i }} />
        ))}
      </div>
      <div className="in">
        <div className="head2 rv">
          <div>
            <div className="kicker">{t('grill.kicker')}</div>
            <h2 id="grillH">{t('grill.h')}</h2>
          </div>
          <p>{t('grill.sub')}</p>
        </div>
        <div className="grill-grid">
          {grill.map((d) => (
            <GrillCard key={d.id} d={d} />
          ))}
        </div>
        <div className="more">
          <Link className="btn ghost" href="/menu#cat-grill">
            {t('grill.all')}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------- Signature dishes ---------- */
export function Featured() {
  const { menu, t } = useSite();
  const feat = listed(menu).filter((d) => d.featured && d.available && d.cat !== 'grill').slice(0, 5);
  if (!feat.length) return null;
  return (
    <section className="feat g">
      <div className="in">
        <div className="head2 rv">
          <h2>
            {t('feat.h1')} <em>{t('feat.h2')}</em> {t('feat.h3')}
          </h2>
          <p>{t('feat.sub')}</p>
        </div>
        <div className="feat-grid">
          {feat.map((d, i) => (
            <div key={d.id} className={`fg fg-${i}`}>
              <DishCard d={d} variant={i === 0 ? 'feature' : 'tile'} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Salads & fresh: bright chapter ---------- */
export function FreshChapter() {
  const { menu, t } = useSite();
  const fresh = listed(menu).filter((d) => (d.cat === 'salat' || d.cat === 'mayonez' || d.cat === 'gazak') && d.available).sort(priced).slice(0, 8);
  if (!fresh.length) return null;
  return (
    <section className="fresh-ch sec-light g" aria-labelledby="freshH">
      <svg className="fresh-deco f1" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="42" r="32" fill="#D8342A" />
        <circle cx="40" cy="42" r="22" fill="#E8574A" />
        <path d="M40 10c-6 2-10 6-12 10 6-1 9 0 12 3 3-3 6-4 12-3-2-4-6-8-12-10z" fill="#4F7A34" />
      </svg>
      <svg className="fresh-deco f2" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="30" fill="#7FAE4E" />
        <circle cx="40" cy="40" r="24" fill="#DDEBB8" />
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse key={i} cx={40 + Math.cos((i / 8) * 6.28) * 12} cy={40 + Math.sin((i / 8) * 6.28) * 12} rx="2.4" ry="4" fill="#B9D27F" transform={`rotate(${i * 45} ${40 + Math.cos((i / 8) * 6.28) * 12} ${40 + Math.sin((i / 8) * 6.28) * 12})`} />
        ))}
      </svg>
      <svg className="fresh-deco f3" viewBox="0 0 60 30" aria-hidden="true">
        <path d="M2 15C14 2 40 0 58 15C40 30 14 28 2 15Z" fill="#5C8A3C" />
      </svg>
      <div className="in">
        <div className="head2 rv">
          <div>
            <div className="kicker">{t('fresh.kicker')}</div>
            <h2 id="freshH">{t('fresh.h')}</h2>
          </div>
          <p>{t('fresh.sub')}</p>
        </div>
        <div className="tile-grid">
          {fresh.map((d) => (
            <DishCard key={d.id} d={d} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Popular combinations (price = sum of current menu prices) ---------- */
export function comboLines(c: Combo, dishes: Dish[]) {
  const lines = c.items
    .map((i) => {
      const d = dishes.find((x) => x.id === i.id);
      if (!d || !d.available) return null;
      const si = d.sizes.length ? Math.min(i.si, d.sizes.length - 1) : 0;
      const unit = unitPrice(d, si, []);
      if (unit <= 0) return null; // price not set yet
      return { d, si, qty: i.qty, sum: unit * i.qty };
    })
    .filter(Boolean) as { d: Dish; si: number; qty: number; sum: number }[];
  return lines.length === c.items.length ? lines : null; // hide a combo if any part is off the menu today
}

export function Combos() {
  const { menu, t, lang, add, toast } = useSite();
  const combos = (menu.combos ?? []).filter((c) => c.active !== false).map((c) => ({ c, lines: comboLines(c, listed(menu)) })).filter((x) => x.lines);
  if (!combos.length) return null;
  return (
    <section className="combos g" aria-labelledby="comboH">
      <div className="in">
        <div className="head2 rv">
          <div>
            <div className="kicker">{t('combo.kicker')}</div>
            <h2 id="comboH">{t('combo.h')}</h2>
          </div>
          <p>{t('combo.sub')}</p>
        </div>
        <div className="combo-grid">
          {combos.map(({ c, lines }) => {
            const total = lines!.reduce((s, l) => s + l.sum, 0);
            return (
              <article key={c.id} className="combo" data-fly>
                <div className="combo-pics ph-stack" aria-hidden="true">
                  {lines!.slice(0, 4).map((l, i) => (
                    <span key={i} style={{ ['--i' as string]: i }}>
                      <DishArt art={l.d.art} photo={l.d.photo} className="round" sizes="84px" />
                    </span>
                  ))}
                </div>
                <h3>{comboName(c, lang)}</h3>
                {comboDesc(c, lang) && <p className="cd">{comboDesc(c, lang)}</p>}
                <ul>
                  {lines!.map((l, i) => (
                    <li key={i}>
                      <span>
                        {l.d.name}
                        {l.d.sizes.length > 1 ? ` · ${sizeLabel(l.d.sizes[l.si], lang)}` : ''}
                      </span>
                      <span className="num">×{l.qty}</span>
                    </li>
                  ))}
                </ul>
                <div className="combo-buy">
                  <span className="price num">
                    {fmt(total)}
                    <small>{t('sum')}</small>
                  </span>
                  <button
                    className="btn sm"
                    onClick={(e) => {
                      lines!.forEach((l, i) => add(l.d.id, l.si, [], l.qty, i === 0 ? e.currentTarget : null, true));
                      toast(t('combo.added', { n: comboName(c, lang) }));
                    }}
                  >
                    {t('combo.add')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- Order band ---------- */
export function OrderBand() {
  const { settings: st, t, lang } = useSite();
  const parts: string[] = [];
  if (st.pickup) parts.push(t('band.pickup', { t: prepRange(st) }));
  if (st.delivery && st.zones.length) {
    const n = st.zones.length;
    parts.push(t('band.delivery', { n, zones: n === 1 ? t('band.zone1') : t('band.zones'), f: fmt(Math.min(...st.zones.map((z) => +z.fee))), m: fmt(Math.min(...st.zones.map((z) => +z.min))) }));
  }
  if (!parts.length) parts.push(t('band.hallOnly'));
  return (
    <section className="band g">
      <div className="in">
        <h2 className="rv">
          {t('band.h1')} <em>{t('band.h2')}</em> {t('band.h3')}
        </h2>
        <div>
          <p>{parts.join(' ')}</p>
          {st.delivery && st.zones.length > 0 && (
            <p className="zones-line">{st.zones.map((z) => zoneName(z, lang)).join(' · ')}</p>
          )}
          <div className="ctas">
            <Link className="btn dark" href="/menu">
              {t('band.cta')}
            </Link>
            <Link className="btn ghost dark" href="/contacts">
              {t('band.zonesCta')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
