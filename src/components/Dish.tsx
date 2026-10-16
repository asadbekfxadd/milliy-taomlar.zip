'use client';
import type { Dish } from '@/lib/types';
import { TAGS } from '@/lib/defaults';
import { basePrice, portionLabel } from '@/lib/pricing';
import { fmt } from '@/lib/format';
import { useSite } from './Providers';
import DishArt from './DishArt';
import { useState } from 'react';

export function Tags({ d }: { d: Dish }) {
  const t = d.tags.filter((x) => TAGS[x]);
  if (!t.length) return null;
  return (
    <div className="tags">
      {t.map((x) => (
        <span key={x} className={`tag ${x}`}>
          {TAGS[x]}
        </span>
      ))}
    </div>
  );
}

export function Price({ v, className = '' }: { v: number; className?: string }) {
  return (
    <span className={`price num ${className}`}>
      {fmt(v)}
      <small>сум</small>
    </span>
  );
}

export function AddButton({ d }: { d: Dish }) {
  const { add, openDish } = useSite();
  const [done, setDone] = useState(false);
  if (!d.available) return <span className="soldout">Сегодня нет</span>;
  const opts = d.sizes.length > 1 || d.extras.length > 0;
  return (
    <button
      className={`add ${done ? 'done' : ''}`}
      onClick={() => {
        if (opts) return openDish(d.id);
        add(d.id);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {opts ? 'Выбрать' : done ? 'Добавлено' : 'В корзину'}
    </button>
  );
}

export function Opener({ d, children, style }: { d: Dish; children: React.ReactNode; style?: React.CSSProperties }) {
  const { openDish } = useSite();
  return (
    <div
      style={{ position: 'relative', cursor: 'pointer', ...style }}
      role="button"
      tabIndex={0}
      aria-label={`Подробнее: ${d.name}`}
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

export function DishObj({ d, className = '', ph = '' }: { d: Dish; className?: string; ph?: string }) {
  const { openDish } = useSite();
  return (
    <article className={`obj ${className}`}>
      <Opener d={d}>
        <Tags d={d} />
        <DishArt art={d.art} photo={d.photo} className={ph} label={d.ru} />
      </Opener>
      <div>
        <h3 style={{ cursor: 'pointer' }} onClick={() => openDish(d.id)}>
          {d.name}
        </h3>
        <div className="ru" style={{ marginTop: 8 }}>
          {d.ru}
        </div>
      </div>
      <p>{d.desc}</p>
      <div className="buyrow">
        <span>
          <Price v={basePrice(d)} /> <span className="weight">{portionLabel(d)}</span>
        </span>
        <AddButton d={d} />
      </div>
    </article>
  );
}

export function DishBody({ d }: { d: Dish }) {
  const { openDish } = useSite();
  return (
    <article className="obj" style={{ cursor: 'default' }}>
      <div className="ru">{d.ru}</div>
      <h3 style={{ cursor: 'pointer' }} onClick={() => openDish(d.id)}>
        {d.name}
      </h3>
      <p style={{ fontSize: 17 }}>{d.desc}</p>
      {d.ingr.length > 0 && (
        <p className="cap" style={{ maxWidth: 'none' }}>
          {d.ingr.slice(0, 6).join(' · ')}
        </p>
      )}
      <div className="buyrow">
        <span>
          <Price v={basePrice(d)} /> <span className="weight">{portionLabel(d)}</span>
        </span>
        <AddButton d={d} />
      </div>
    </article>
  );
}

export function DishRow({ d }: { d: Dish }) {
  const { openDish } = useSite();
  return (
    <div className="lrow">
      <Opener d={d} style={{ gridRow: '1/3' }}>
        <DishArt art={d.art} photo={d.photo} className="round" label={d.ru} />
      </Opener>
      <h4 style={{ cursor: 'pointer' }} onClick={() => openDish(d.id)}>
        {d.name}
      </h4>
      <div className="d">
        {d.ru} · {d.desc}
      </div>
      <div className="rt">
        <Price v={basePrice(d)} />
        <AddButton d={d} />
      </div>
    </div>
  );
}
