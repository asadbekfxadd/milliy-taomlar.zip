'use client';
import { useMemo, useState } from 'react';
import type { Dish, Menu } from '@/lib/types';
import { api, money, PageHead, qtyFmt, usePanel } from './kit';

type Ing = { id: string; name: string; unit: string; cost: number };
type Line = { ing: string; qty: number };
type Recipe = { dishId: string; si: number; lines: Line[] };

const n = (v: string) => Number(v.replace(',', '.').replace(/[^\d.]/g, '')) || 0;

export default function Recipes({ menu, ings, initial }: { menu: Menu; ings: Ing[]; initial: Recipe[] }) {
  const [recipes, setRecipes] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [f, setF] = useState<'all' | 'none' | 'high'>('all');
  const [qs, setQs] = useState('');
  const im = useMemo(() => new Map(ings.map((i) => [i.id, i])), [ings]);
  const costOf = (r?: Recipe | null) => (r ? r.lines.reduce((s, l) => s + l.qty * (im.get(l.ing)?.cost || 0), 0) : null);
  const recipeFor = (d: Dish, si: number) => recipes.find((r) => r.dishId === d.id && r.si === si) || (si >= 0 ? recipes.find((r) => r.dishId === d.id && r.si === -1) : undefined);
  const priceAt = (d: Dish, si: number) => (d.sizes.length ? d.sizes[Math.max(0, si)]?.p || 0 : d.price);
  const rows = menu.dishes
    .filter((d) => menu.cats.some((c) => c.id === d.cat))
    .map((d) => {
      const si = d.sizes.length ? 0 : -1;
      const cost = costOf(recipeFor(d, si));
      const price = priceAt(d, si);
      return { d, cost, price, pct: cost !== null && price > 0 ? Math.round((cost / price) * 100) : null };
    })
    .filter((x) => (f === 'none' ? x.cost === null : f === 'high' ? (x.pct ?? 0) > 40 : true))
    .filter((x) => !qs || (x.d.ru + ' ' + x.d.name).toLowerCase().includes(qs.toLowerCase()));
  const done = menu.dishes.filter((d) => recipes.some((r) => r.dishId === d.id)).length;

  return (
    <>
      <PageHead title="Техкарты" sub="Сколько продуктов уходит на одну порцию. По техкартам склад списывается при продаже, а аналитика считает себестоимость и маржу." />
      {!ings.length && (
        <div className="box" style={{ background: 'var(--saffron-soft)', borderColor: '#F2D3A0' }}>
          Сначала добавьте продукты в разделе <a className="lnk" href="/admin/stock">Склад</a> — техкарта собирается из них.
        </div>
      )}
      <div className="sx-row" style={{ marginBottom: 12 }}>
        <div className="seg">
          <button className={f === 'all' ? 'on' : ''} onClick={() => setF('all')}>
            Все
          </button>
          <button className={f === 'none' ? 'on' : ''} onClick={() => setF('none')}>
            Без техкарты · {menu.dishes.length - done}
          </button>
          <button className={f === 'high' ? 'on' : ''} onClick={() => setF('high')}>
            Себестоимость выше 40%
          </button>
        </div>
        <input className="ip sm" style={{ flex: '1 1 200px', width: 'auto' }} placeholder="Найти блюдо" value={qs} onChange={(e) => setQs(e.target.value)} />
      </div>
      <div className="box" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tbl-wrap" style={{ margin: 0, padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ paddingLeft: 16 }}>Блюдо</th>
                <th className="r">Цена</th>
                <th className="r">Себестоимость</th>
                <th className="r">Доля</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ d, cost, price, pct }) => (
                <FragmentRow key={d.id}>
                  <tr className="click" onClick={() => setOpen(open === d.id ? null : d.id)}>
                    <td style={{ paddingLeft: 16 }}>
                      <b>{d.ru || d.name}</b>
                      {d.sizes.length > 1 && <span className="muted small"> · {d.sizes.length} порции</span>}
                    </td>
                    <td className="r num">{price ? money(price) : <span className="bd new">нет цены</span>}</td>
                    <td className="r num">{cost === null ? <span className="bd">нет техкарты</span> : money(cost)}</td>
                    <td className="r num">{pct === null ? '—' : <span className={`bd ${pct > 40 ? 'bad' : pct > 30 ? 'new' : 'ok'}`}>{pct}%</span>}</td>
                    <td className="r">
                      <button className="b sm">{open === d.id ? 'Свернуть' : cost === null ? 'Составить' : 'Изменить'}</button>
                    </td>
                  </tr>
                  {open === d.id && (
                    <tr>
                      <td colSpan={5} style={{ padding: 0 }}>
                        <Editor
                          d={d}
                          ings={ings}
                          recipes={recipes}
                          priceAt={(si) => priceAt(d, si)}
                          onSaved={(r) => setRecipes([...recipes.filter((x) => !(x.dishId === r.dishId && x.si === r.si)), ...(r.lines.length ? [r] : [])])}
                        />
                      </td>
                    </tr>
                  )}
                </FragmentRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const FragmentRow = ({ children }: { children: React.ReactNode }) => <>{children}</>;

function Editor({ d, ings, recipes, priceAt, onSaved }: { d: Dish; ings: Ing[]; recipes: Recipe[]; priceAt: (si: number) => number; onSaved: (r: Recipe) => void }) {
  const portions: [number, string][] = [[-1, d.sizes.length > 1 ? 'Общая для всех порций' : 'Одна порция'], ...(d.sizes.length > 1 ? d.sizes.map((s, i) => [i, s.label] as [number, string]) : [])];
  const [si, setSi] = useState(-1);
  const own = recipes.find((r) => r.dishId === d.id && r.si === si);
  const [lines, setLines] = useState<{ ing: string; qty: string }[]>(() => toRows(own));
  const [busy, setBusy] = useState(false);
  const { toast } = usePanel();
  const im = new Map(ings.map((i) => [i.id, i]));
  const cost = lines.reduce((s, l) => s + n(l.qty) * (im.get(l.ing)?.cost || 0), 0);
  const price = priceAt(si);
  function toRows(r?: Recipe) {
    const base = (r?.lines || []).map((l) => ({ ing: l.ing, qty: String(l.qty) }));
    return [...base, { ing: '', qty: '' }];
  }
  const pick = (k: number) => {
    setSi(k);
    setLines(toRows(recipes.find((r) => r.dishId === d.id && r.si === k)));
  };
  return (
    <div className="dish-ed">
      {portions.length > 1 && (
        <div className="seg" style={{ marginBottom: 10 }}>
          {portions.map(([k, l]) => (
            <button key={k} className={si === k ? 'on' : ''} onClick={() => pick(k)}>
              {l}
              {recipes.some((r) => r.dishId === d.id && r.si === k) ? ' ✓' : ''}
            </button>
          ))}
        </div>
      )}
      {si >= 0 && !own && <p className="muted small">Своей техкарты у этой порции нет — при продаже берётся общая. Заполните, если порция отличается по продуктам.</p>}
      <table className="tbl" style={{ background: 'var(--card)', borderRadius: 10 }}>
        <thead>
          <tr>
            <th>Продукт</th>
            <th>На одну порцию</th>
            <th className="r">Стоимость</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((l, k) => {
            const i = im.get(l.ing);
            const set = (p: Partial<typeof l>) => {
              const next = lines.map((x, j) => (j === k ? { ...x, ...p } : x));
              if (k === lines.length - 1 && p.ing) next.push({ ing: '', qty: '' });
              setLines(next);
            };
            return (
              <tr key={k}>
                <td style={{ minWidth: 200 }}>
                  <select className="ip sm" value={l.ing} onChange={(e) => set({ ing: e.target.value })} aria-label="Продукт">
                    <option value="">— добавить продукт —</option>
                    {ings.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}, {x.unit}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="sx-row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                    <input className="ip sm num" style={{ width: 100 }} inputMode="decimal" value={l.qty} onChange={(e) => set({ qty: e.target.value })} aria-label="Количество" disabled={!l.ing} placeholder={i?.unit === 'кг' || i?.unit === 'л' ? '0,25' : '1'} />
                    <span className="muted">{i?.unit}</span>
                  </div>
                  {i && (i.unit === 'кг' || i.unit === 'л') && n(l.qty) > 0 && <small className="muted">= {qtyFmt(n(l.qty) * 1000)} {i.unit === 'кг' ? 'г' : 'мл'}</small>}
                </td>
                <td className="r num">{i && n(l.qty) ? money(n(l.qty) * i.cost) : ''}</td>
                <td className="r">
                  {l.ing && (
                    <button className="lnk red" onClick={() => setLines(lines.filter((_, j) => j !== k))}>
                      убрать
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="sx-row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <span className="num">
          Себестоимость <b>{money(cost)}</b> сум
          {price > 0 && (
            <>
              {' '}
              · цена {money(price)} · доля <b>{Math.round((cost / price) * 100)}%</b> · маржа {money(price - cost)}
            </>
          )}
        </span>
        <button
          className="b main"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const clean = lines.filter((l) => l.ing && n(l.qty) > 0).map((l) => ({ ing: l.ing, qty: n(l.qty) }));
            try {
              await api('/api/admin/recipes', 'PUT', { dishId: d.id, si, lines: clean });
              onSaved({ dishId: d.id, si, lines: clean });
              toast(clean.length ? 'Техкарта сохранена' : 'Техкарта удалена');
            } catch (e: any) {
              toast(e.message);
            }
            setBusy(false);
          }}
        >
          {busy ? 'Сохраняем…' : 'Сохранить техкарту'}
        </button>
      </div>
    </div>
  );
}
