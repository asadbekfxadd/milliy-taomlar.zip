'use client';
import { useEffect, useRef, useState } from 'react';
import { useSite } from './Providers';
import DishArt from './DishArt';
import { Tags } from './Dish';
import { portionLabel, unitPrice } from '@/lib/pricing';
import { fmt } from '@/lib/format';

export default function DishModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { menu, add } = useSite();
  const d = menu.dishes.find((x) => x.id === id);
  const [si, setSi] = useState(0);
  const [ex, setEx] = useState<number[]>([]);
  const [qty, setQty] = useState(1);
  const sheet = useRef<HTMLDivElement>(null);
  const prev = useRef<Element | null>(null);

  useEffect(() => {
    prev.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    sheet.current?.querySelector<HTMLElement>('.x')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && sheet.current) {
        const f = [...sheet.current.querySelectorAll<HTMLElement>('button,input:not([disabled])')];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    addEventListener('keydown', onKey);
    return () => {
      removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      (prev.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  if (!d) return null;
  const cat = menu.cats.find((c) => c.id === d.cat);
  const u = unitPrice(d, si, ex);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dlgT">
      <div className="scrim" onClick={onClose} />
      <div className={`sheet ${d.photo ? '' : 'solo'}`} ref={sheet}>
        <button className="x" onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        {d.photo && (
          <div style={{ position: 'relative' }}>
            <Tags d={d} />
            <DishArt art={d.art} photo={d.photo} label={d.ru} eager />
          </div>
        )}
        <div className="body">
          <div>
            <div className="cap" style={{ letterSpacing: '.12em', textTransform: 'uppercase' }}>
              {cat?.name} · {d.ru}
            </div>
            <h2 id="dlgT" style={{ marginTop: 12 }}>
              {d.name}
            </h2>
          </div>
          <p style={{ margin: 0, color: 'var(--dim)', fontSize: 17 }}>{d.desc}</p>

          {d.sizes.length > 1 && (
            <div>
              <div className="opt-h">Порция</div>
              <div className="opts" role="radiogroup">
                {d.sizes.map((s, i) => (
                  <div key={i} className={`opt ${si === i ? 'on' : ''}`}>
                    <label>
                      <input type="radio" name="sz" checked={si === i} onChange={() => setSi(i)} />
                      <span>
                        {s.label} <span className="cap">{s.w}</span>
                      </span>
                    </label>
                    <span className="num" style={{ fontWeight: 700 }}>
                      {fmt(s.p)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.extras.length > 0 && (
            <div>
              <div className="opt-h">Добавить</div>
              <div className="opts">
                {d.extras.map((e, i) => {
                  const on = ex.includes(i);
                  return (
                    <div key={i} className={`opt ${on ? 'on' : ''}`}>
                      <label>
                        <input type="checkbox" checked={on} onChange={() => setEx(on ? ex.filter((x) => x !== i) : [...ex, i])} />
                        <span>{e.label}</span>
                      </label>
                      <span className="num" style={{ fontWeight: 700 }}>
                        +{fmt(e.p)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="facts">
            <div>
              <b>Состав</b>
              {d.ingr.length ? d.ingr.join(', ') : 'уточните у ресторана'}
            </div>
            <div>
              <b>Аллергены</b>
              {d.allergens.length ? d.allergens.join(', ') : 'основные аллергены не входят в рецепт'}
              <br />
              <span className="cap">Если есть аллергия, уточните у ресторана.</span>
            </div>
            <div>
              <b>Порция</b>
              <span className="num">{portionLabel(d, si)}</span>
            </div>
            <div>
              <b>Цена за единицу</b>
              <span className="num">{fmt(u)} сум</span>
            </div>
          </div>

          <div className="addbar">
            {d.available ? (
              <>
                <div className="stepper">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Меньше">
                    −
                  </button>
                  <span className="num" aria-live="polite">
                    {qty}
                  </span>
                  <button onClick={() => setQty(qty + 1)} aria-label="Больше">
                    +
                  </button>
                </div>
                <button
                  className="btn"
                  onClick={() => {
                    add(d.id, si, ex, qty);
                    onClose();
                  }}
                >
                  Добавить · <span className="num">{fmt(u * qty)}</span> сум
                </button>
              </>
            ) : (
              <div className="alert err">Сегодня этого блюда нет в наличии.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
