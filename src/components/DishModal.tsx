'use client';
import { useEffect, useRef, useState } from 'react';
import { useSite } from './Providers';
import DishArt from './DishArt';
import { Badges } from './Dish';
import { catName, dishAllergens, dishDesc, dishIngr, dishSub, extraLabel, sizeLabel, unitText } from '@/lib/i18n';
import { portionLabel, unitPrice } from '@/lib/pricing';
import { fmt } from '@/lib/format';

export default function DishModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { menu, add, t, lang } = useSite();
  const addBtn = useRef<HTMLButtonElement>(null);
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
      <div className="sheet" ref={sheet} data-fly>
        <button className="x" onClick={onClose} aria-label={t('dish.close')}>
          ×
        </button>
        <div className={`sheet-fig ${d.photo ? '' : 'art'}`}>
          <Badges d={d} />
          <DishArt art={d.art} photo={d.photo} label={d.name} eager className={d.photo ? '' : 'round'} sizes="(max-width: 1020px) 100vw, 560px" />
          {!d.photo && <span className="art-note">{t('dish.photoSoon')}</span>}
        </div>
        <div className="body">
          <div>
            <div className="cap" style={{ letterSpacing: '.12em', textTransform: 'uppercase' }}>
              {catName(cat, lang)}
              {dishSub(d, lang) ? ` · ${dishSub(d, lang)}` : ''}
            </div>
            <h2 id="dlgT" style={{ marginTop: 12 }}>
              {d.name}
            </h2>
          </div>
          <p style={{ margin: 0, color: 'var(--dim)', fontSize: 17 }}>{dishDesc(d, lang)}</p>

          {d.sizes.length > 1 && (
            <div>
              <div className="opt-h">{t('dish.portion')}</div>
              <div className="opts" role="radiogroup">
                {d.sizes.map((s, i) => (
                  <div key={i} className={`opt ${si === i ? 'on' : ''}`}>
                    <label>
                      <input type="radio" name="sz" checked={si === i} onChange={() => setSi(i)} />
                      <span>
                        {sizeLabel(s, lang)} <span className="cap">{unitText(s.w, lang)}</span>
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
              <div className="opt-h">{t('dish.extras')}</div>
              <div className="opts">
                {d.extras.map((e, i) => {
                  const on = ex.includes(i);
                  return (
                    <div key={i} className={`opt ${on ? 'on' : ''}`}>
                      <label>
                        <input type="checkbox" checked={on} onChange={() => setEx(on ? ex.filter((x) => x !== i) : [...ex, i])} />
                        <span>{extraLabel(e, lang)}</span>
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
              <b>{t('dish.ingr')}</b>
              {dishIngr(d, lang).length ? dishIngr(d, lang).join(', ') : t('dish.ingrNone')}
            </div>
            <div>
              <b>{t('dish.allergens')}</b>
              {d.allergens.length ? dishAllergens(d, lang).join(', ') : d.ingr.length ? t('dish.allergensNone') : t('dish.ingrNone')}
              <br />
              <span className="cap">{t('dish.allergyNote')}</span>
            </div>
            <div>
              <b>{t('dish.portion')}</b>
              <span className="num">{unitText(portionLabel(d, si), lang)}</span>
            </div>
            <div>
              <b>{t('dish.unit')}</b>
              <span className="num">{u > 0 ? `${fmt(u)} ${t('sum')}` : t('dish.noPrice')}</span>
            </div>
          </div>

          <div className="addbar">
            {d.available && u > 0 ? (
              <>
                <div className="stepper">
                  <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label={t('dish.less')}>
                    −
                  </button>
                  <span className="num" aria-live="polite">
                    {qty}
                  </span>
                  <button onClick={() => setQty(qty + 1)} aria-label={t('dish.moreQty')}>
                    +
                  </button>
                </div>
                <button
                  ref={addBtn}
                  className="btn"
                  onClick={() => {
                    add(d.id, si, ex, qty, sheet.current?.querySelector('.sheet-fig'));
                    onClose();
                  }}
                >
                  {t('dish.addSum', { s: fmt(u * qty) })}
                </button>
              </>
            ) : (
              <div className={`alert ${d.available ? 'warn' : 'err'}`}>{d.available ? t('dish.noPriceNote') : t('dish.notToday')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
