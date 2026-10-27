'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, money, PageHead, qtyFmt, usePanel, when } from './kit';
import { Preps, Purchases, Turnover } from './StockMore';

export type Pack = { name: string; k: number };
export type Ing = { id: string; name: string; unit: string; stock: number; min: number; cost: number; active: boolean; yield: number; par: number; supplierId: string; packs: Pack[]; isPrep: boolean };
export type Supplier = { id: string; name: string; phone: string; note: string; active: boolean };
type Move = { id: number; name: string; unit: string; kind: string; qty: number; price: number; note: string; by: string; at: string };
const UNITS = ['кг', 'л', 'шт', 'пачка', 'бутылка'];
const MOVE_RU: Record<string, string> = { in: 'Приход', writeoff: 'Списание', adjust: 'Инвентаризация', sale: 'Продажа', return: 'Возврат продажи', prod_out: 'На заготовку', prod_in: 'Заготовка' };
export const n = (v: string) => Number(v.replace(',', '.').replace(/[^\d.]/g, '')) || 0;

const TABS: [string, string][] = [
  ['left', 'Остатки'],
  ['in', 'Приход'],
  ['buy', 'Закупки и поставщики'],
  ['prep', 'Заготовки'],
  ['off', 'Списание'],
  ['count', 'Инвентаризация'],
  ['turn', 'Оборотка'],
  ['log', 'История'],
];

export default function Stock({ initial, suppliers: sups0 }: { initial: Ing[]; suppliers: Supplier[] }) {
  const sp = useSearchParams();
  const [tab, setTab] = useState('left');
  const [ings, setIngs] = useState(initial);
  const [suppliers, setSuppliers] = useState(sups0);
  const { toast } = usePanel();
  const reload = useCallback(async () => {
    setIngs((await api('/api/admin/stock?days=1')).ings);
    setSuppliers((await api('/api/admin/purchases')).suppliers);
  }, []);
  const post = async (body: Record<string, unknown>, ok: string) => {
    try {
      await api('/api/admin/stock', 'POST', body);
      toast(ok);
      await reload();
      return true;
    } catch (e: any) {
      toast(e.message);
      return false;
    }
  };
  const active = ings.filter((i) => i.active);
  const low = active.filter((i) => i.min > 0 && i.stock <= i.min);
  const worth = active.reduce((s, i) => s + Math.max(0, i.stock) * i.cost, 0);

  return (
    <>
      <PageHead title="Склад" sub="Продукты, закупки у поставщиков, заготовки и оборотка. Продажи списываются сами по техкартам (с учётом выхода после обработки), когда чек закрыт." />
      <div className="kpis">
        <div className="kpi">
          <span>Продуктов</span>
          <b>{active.length}</b>
        </div>
        <div className="kpi">
          <span>На складе на сумму</span>
          <b>{money(worth)}</b>
          <small>по средней цене закупки</small>
        </div>
        <button className={`kpi ${low.length ? 'bad' : ''}`} style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => setTab('left')}>
          <span>Заканчиваются</span>
          <b>{low.length}</b>
          <small>{low.length ? low.slice(0, 3).map((i) => i.name).join(', ') : 'всё в норме'}</small>
        </button>
      </div>
      <div className="seg" style={{ marginBottom: 14 }}>
        {TABS.map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'left' && <Left ings={ings} suppliers={suppliers} onlyLow={sp.get('f') === 'low'} post={post} />}
      {tab === 'in' && <Receive ings={active} post={post} />}
      {tab === 'buy' && <Purchases onChanged={reload} />}
      {tab === 'prep' && <Preps ings={active} onChanged={reload} />}
      {tab === 'turn' && <Turnover />}
      {tab === 'off' && <WriteOff ings={active} post={post} />}
      {tab === 'count' && <Count ings={active} post={post} />}
      {tab === 'log' && <Log />}
    </>
  );
}

type Post = (b: Record<string, unknown>, ok: string) => Promise<boolean>;

function Left({ ings, suppliers, onlyLow, post }: { ings: Ing[]; suppliers: Supplier[]; onlyLow: boolean; post: Post }) {
  const [qs, setQs] = useState('');
  const [low, setLow] = useState(onlyLow);
  const [hidden, setHidden] = useState(false);
  const [adding, setAdding] = useState(ings.length === 0);
  const [edit, setEdit] = useState<string | null>(null);
  const shown = ings.filter((i) => (hidden ? !i.active : i.active) && (!low || (i.min > 0 && i.stock <= i.min)) && (!qs || i.name.toLowerCase().includes(qs.toLowerCase())));
  return (
    <>
      {adding && <NewIng post={post} onDone={() => setAdding(false)} />}
      {edit && ings.find((i) => i.id === edit) && <IngCard i={ings.find((i) => i.id === edit)!} suppliers={suppliers} post={post} onDone={() => setEdit(null)} />}
      <div className="box">
        <div className="sx-row" style={{ marginBottom: 12 }}>
          <input className="ip sm" style={{ flex: '1 1 200px', width: 'auto' }} placeholder="Найти продукт" value={qs} onChange={(e) => setQs(e.target.value)} />
          <button type="button" className={`tg ${low ? 'on' : ''}`} onClick={() => setLow(!low)}>
            Только заканчиваются
          </button>
          <button type="button" className={`tg ${hidden ? 'on' : ''}`} onClick={() => setHidden(!hidden)}>
            Скрытые
          </button>
          {!adding && (
            <button className="b main sm" onClick={() => setAdding(true)}>
              Новый продукт
            </button>
          )}
        </div>
        {shown.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Продукт</th>
                  <th className="r">Остаток</th>
                  <th className="r">Минимум</th>
                  <th className="r">Цена за ед.</th>
                  <th className="r">Сумма</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((i) => (
                    <tr key={i.id} className={i.stock <= 0 ? 'out' : i.min > 0 && i.stock <= i.min ? 'low' : ''}>
                      <td>
                        <b>{i.name}</b>
                        {i.stock <= 0 ? <span className="bd bad" style={{ marginLeft: 6 }}>нет</span> : i.min > 0 && i.stock <= i.min ? <span className="bd new" style={{ marginLeft: 6 }}>мало</span> : null}
                        {i.isPrep && <span className="bd info" style={{ marginLeft: 6 }}>заготовка</span>}
                        {i.yield < 100 && <div className="muted small">выход {i.yield}%</div>}
                      </td>
                      <td className="r num">
                        <b>{qtyFmt(i.stock)}</b> {i.unit}
                      </td>
                      <td className="r num muted">{i.min ? `${qtyFmt(i.min)} ${i.unit}` : '—'}</td>
                      <td className="r num">{i.cost ? money(i.cost) : '—'}</td>
                      <td className="r num">{money(Math.max(0, i.stock) * i.cost)}</td>
                      <td className="r">
                        <button className="b sm" onClick={() => setEdit(i.id)}>
                          Изменить
                        </button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>{ings.length ? 'Ничего не нашлось' : 'Склад пуст'}</b>
            {ings.length ? 'Смените фильтр.' : 'Добавьте продукты: мясо, овощи, мука, напитки. Потом составьте техкарты блюд.'}
          </div>
        )}
      </div>
    </>
  );
}

function IngCard({ i, suppliers, post, onDone }: { i: Ing; suppliers: Supplier[]; post: Post; onDone: () => void }) {
  const [f, setF] = useState({ name: i.name, unit: i.unit, min: String(i.min || ''), par: String(i.par || ''), yield: String(i.yield || 100), supplierId: i.supplierId, isPrep: i.isPrep });
  const [packs, setPacks] = useState<{ name: string; k: string }[]>(i.packs.map((p) => ({ name: p.name, k: String(p.k) })));
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const y = n(f.yield) || 100;
  return (
    <div className="sx-modal" role="dialog" aria-modal="true" aria-label={i.name}>
      <div className="sx-scrim" onClick={onDone} />
      <div className="sx-sheet">
        <h3>{i.name}</h3>
        <div className="grid-f">
          <label className="f">
            <span>Название</span>
            <input className="ip" value={f.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <label className="f">
            <span>Единица учёта</span>
            <select className="ip" value={f.unit} onChange={(e) => set({ unit: e.target.value })}>
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <label className="f">
            <span>Минимум (предупредить), {f.unit}</span>
            <input className="ip num" inputMode="decimal" value={f.min} onChange={(e) => set({ min: e.target.value })} />
          </label>
          <label className="f">
            <span>Заказывать до, {f.unit}</span>
            <input className="ip num" inputMode="decimal" value={f.par} onChange={(e) => set({ par: e.target.value })} placeholder="пусто — вдвое больше минимума" />
            <small>Автозаказ дополнит остаток до этого количества.</small>
          </label>
          <label className="f">
            <span>Выход после обработки, %</span>
            <input className="ip num" inputMode="decimal" value={f.yield} onChange={(e) => set({ yield: e.target.value })} />
            <small>{y < 100 ? `Из 1 ${f.unit} остаётся ${qtyFmt(y / 100)} ${f.unit}. В техкарте пишите чистый вес, со склада уйдёт в ${qtyFmt(100 / y)} раза больше.` : 'Потерь нет. Для мяса с костью, овощей с очисткой укажите, например, 70.'}</small>
          </label>
          <label className="f">
            <span>Поставщик по умолчанию</span>
            <select className="ip" value={f.supplierId} onChange={(e) => set({ supplierId: e.target.value })}>
              <option value="">— не выбран —</option>
              {suppliers
                .filter((x) => x.active || x.id === f.supplierId)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="f full">
            <span>Упаковки при закупке</span>
            {packs.map((p, k) => (
              <div className="sx-row" key={k}>
                <input className="ip sm" style={{ width: 130 }} placeholder="мешок, ящик" value={p.name} onChange={(e) => setPacks(packs.map((x, j) => (j === k ? { ...x, name: e.target.value } : x)))} />
                <span className="muted">=</span>
                <input className="ip sm num" style={{ width: 90 }} inputMode="decimal" value={p.k} onChange={(e) => setPacks(packs.map((x, j) => (j === k ? { ...x, k: e.target.value } : x)))} />
                <span className="muted">{f.unit}</span>
                <button className="lnk red" onClick={() => setPacks(packs.filter((_, j) => j !== k))}>
                  убрать
                </button>
              </div>
            ))}
            <button className="lnk" style={{ alignSelf: 'flex-start' }} onClick={() => setPacks([...packs, { name: '', k: '' }])}>
              + упаковка
            </button>
            <small>Например «мешок = 50 кг», «ящик = 12 шт». В приходе можно указать количество в упаковках — пересчитается само.</small>
          </div>
          <label className="f full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={f.isPrep} onChange={(e) => set({ isPrep: e.target.checked })} />
            <span>Заготовка (готовим сами из других продуктов: тесто, соус, бульон)</span>
          </label>
        </div>
        <div className="sx-row">
          <button
            className="b main"
            disabled={f.name.trim().length < 2}
            onClick={async () =>
              (await post(
                {
                  action: 'update',
                  id: i.id,
                  name: f.name,
                  unit: f.unit,
                  min: n(f.min),
                  par: n(f.par),
                  yield: Math.min(100, Math.max(1, y)),
                  supplierId: f.supplierId,
                  isPrep: f.isPrep,
                  packs: packs.filter((p) => p.name.trim() && n(p.k) > 0).map((p) => ({ name: p.name.trim(), k: n(p.k) })),
                },
                'Сохранено',
              )) && onDone()
            }
          >
            Сохранить
          </button>
          <button className="b" onClick={onDone}>
            Отмена
          </button>
          <button className="lnk red" onClick={async () => (await post({ action: 'update', id: i.id, active: !i.active }, i.active ? 'Продукт скрыт' : 'Продукт снова в списке')) && onDone()}>
            {i.active ? 'Скрыть продукт' : 'Вернуть в список'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewIng({ post, onDone }: { post: Post; onDone: () => void }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('кг');
  const [stock, setStock] = useState('');
  const [cost, setCost] = useState('');
  const [min, setMin] = useState('');
  const [prep, setPrep] = useState(false);
  return (
    <form
      className="box"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await post({ action: 'create', name, unit, stock: n(stock), cost: n(cost), min: n(min), isPrep: prep }, `«${name}» добавлен`)) {
          setName('');
          setStock('');
          setCost('');
          setMin('');
        }
      }}
    >
      <h2>Новый продукт</h2>
      <div className="grid-f" style={{ marginTop: 10 }}>
        <label className="f">
          <span>Название</span>
          <input className="ip" value={name} onChange={(e) => setName(e.target.value)} placeholder="Баранина, мякоть" required autoFocus />
        </label>
        <label className="f">
          <span>Единица</span>
          <select className="ip" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label className="f">
          <span>Сейчас на складе, {unit}</span>
          <input className="ip num" inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
        </label>
        <label className="f">
          <span>Цена закупки за 1 {unit}, сум</span>
          <input className="ip num" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} />
        </label>
        <label className="f">
          <span>Предупреждать, когда меньше</span>
          <input className="ip num" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder={`например 5 ${unit}`} />
        </label>
        <label className="f" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={prep} onChange={(e) => setPrep(e.target.checked)} />
          <span>Это заготовка (тесто, соус, бульон)</span>
        </label>
      </div>
      <div className="sx-row" style={{ marginTop: 12 }}>
        <button className="b main" disabled={name.trim().length < 2}>
          Добавить
        </button>
        <button type="button" className="b" onClick={onDone}>
          Закрыть
        </button>
      </div>
    </form>
  );
}

function IngSelect({ ings, value, onChange }: { ings: Ing[]; value: string; onChange: (v: string) => void }) {
  return (
    <select className="ip sm" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Продукт">
      <option value="">— выберите —</option>
      {ings.map((i) => (
        <option key={i.id} value={i.id}>
          {i.name}, {i.unit}
        </option>
      ))}
    </select>
  );
}

/** "Баранина 12,5 85000" or Excel columns (name, qty, price) → rows; names are matched to products. */
export function parsePaste(text: string, ings: Ing[]) {
  const norm = (x: string) => x.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9ʻ' ]/gi, ' ').replace(/\s+/g, ' ').trim();
  const out: { ing: string; qty: string; price: string; raw: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line.includes('\t') ? line.split('\t').map((c) => c.trim()) : (() => {
      const m = line.match(/^(.*?)[\s;]+([\d.,]+)\s*(?:[a-zа-я.]*\s*)?[\s;]*([\d\s.,]*)$/i);
      return m ? [m[1], m[2], m[3]] : [line];
    })();
    const name = norm(cells[0] || '');
    if (!name) continue;
    const nums = cells.slice(1).map((c) => c.replace(/\s/g, '')).filter((c) => /\d/.test(c));
    const exact = ings.find((i) => norm(i.name) === name);
    const part = exact || ings.find((i) => norm(i.name).startsWith(name) || name.startsWith(norm(i.name))) || ings.find((i) => norm(i.name).includes(name) || name.includes(norm(i.name).split(' ')[0]));
    out.push({ ing: part?.id || '', qty: nums[0] || '', price: nums[1] ? String(n(nums[1])) : '', raw: cells[0] });
  }
  return out;
}

function Receive({ ings, post }: { ings: Ing[]; post: Post }) {
  const blank = () => ({ ing: '', qty: '', price: '', pack: -1, raw: '' });
  const [rows, setRows] = useState([blank(), blank(), blank()]);
  const [note, setNote] = useState('');
  const [paste, setPaste] = useState<string | null>(null);
  const map = useMemo(() => new Map(ings.map((i) => [i.id, i])), [ings]);
  // quantities in packs are converted to the product's unit
  const kOf = (r: { ing: string; pack: number }) => (r.pack >= 0 ? map.get(r.ing)?.packs[r.pack]?.k || 1 : 1);
  const valid = rows.filter((r) => r.ing && n(r.qty) > 0);
  const total = valid.reduce((s, r) => s + n(r.qty) * kOf(r) * n(r.price), 0);
  if (!ings.length) return <div className="box empty">Сначала добавьте продукты во вкладке «Остатки».</div>;
  return (
    <div className="box">
      <h2>Приход по накладной</h2>
      <p>Цена — за единицу (кг, литр, штуку). Средняя цена продукта пересчитается сама.</p>
      <label className="f" style={{ maxWidth: 420, marginBottom: 12 }}>
        <span>Поставщик или номер накладной</span>
        <input className="ip" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Рынок, мясник Бахтиёр, накладная 125" />
      </label>
      {paste === null ? (
        <button className="b sm" style={{ marginBottom: 12 }} onClick={() => setPaste('')}>
          Вставить из Excel или накладной
        </button>
      ) : (
        <div className="f" style={{ marginBottom: 12 }}>
          <span>Скопируйте строки из Excel (название, количество, цена) или напишите построчно: «Баранина 12,5 85000»</span>
          <textarea className="ip" rows={5} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'Баранина\t12,5\t85000\nЛук\t20\t4000'} />
          <div className="sx-row">
            <button
              className="b sm main"
              disabled={!paste.trim()}
              onClick={() => {
                const got = parsePaste(paste, ings).map((x) => ({ ...x, pack: -1, price: x.price || (x.ing && map.get(x.ing)?.cost ? String(Math.round(map.get(x.ing)!.cost)) : '') }));
                setRows([...rows.filter((r) => r.ing), ...got, blank()]);
                setPaste(null);
              }}
            >
              Разобрать
            </button>
            <button className="b sm" onClick={() => setPaste(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Продукт</th>
              <th>Количество</th>
              <th>Цена за ед. учёта</th>
              <th className="r">Сумма</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, k) => {
              const i = map.get(r.ing);
              const set = (p: Partial<typeof r>) => setRows(rows.map((x, j) => (j === k ? { ...x, ...p } : x)));
              return (
                <tr key={k}>
                  <td style={{ minWidth: 200 }}>
                    <IngSelect ings={ings} value={r.ing} onChange={(v) => set({ ing: v, pack: -1, price: r.price || (map.get(v)?.cost ? String(Math.round(map.get(v)!.cost)) : '') })} />
                    {r.raw && !r.ing && <small className="er">не нашли «{r.raw}» — выберите продукт</small>}
                  </td>
                  <td>
                    <div className="sx-row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                      <input className="ip sm num" style={{ width: 90 }} inputMode="decimal" value={r.qty} onChange={(e) => set({ qty: e.target.value })} aria-label="Количество" />
                      {i && i.packs.length > 0 ? (
                        <select className="ip sm" style={{ width: 'auto' }} value={r.pack} onChange={(e) => set({ pack: Number(e.target.value) })} aria-label="Единица">
                          <option value={-1}>{i.unit}</option>
                          {i.packs.map((p, j) => (
                            <option key={j} value={j}>
                              {p.name} ({qtyFmt(p.k)} {i.unit})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="muted">{i?.unit}</span>
                      )}
                    </div>
                    {r.pack >= 0 && n(r.qty) > 0 && i && (
                      <small className="muted">
                        = {qtyFmt(n(r.qty) * kOf(r))} {i.unit}
                      </small>
                    )}
                  </td>
                  <td>
                    <input className="ip sm num" style={{ width: 120 }} inputMode="numeric" value={r.price} onChange={(e) => set({ price: e.target.value })} aria-label="Цена" />
                  </td>
                  <td className="r num">{n(r.qty) && n(r.price) ? money(n(r.qty) * kOf(r) * n(r.price)) : '—'}</td>
                  <td className="r">
                    <button className="lnk red" onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== k) : [blank()])}>
                      убрать
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sx-row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <button className="b sm" onClick={() => setRows([...rows, blank()])}>
          Ещё строка
        </button>
        <div className="sx-row">
          <b className="num">Итого {money(total)} сум</b>
          <button
            className="b main"
            disabled={!valid.length}
            onClick={async () => {
              if (await post({ action: 'receive', note, lines: valid.map((r) => ({ ing: r.ing, qty: +(n(r.qty) * kOf(r)).toFixed(3), price: n(r.price) })) }, `Приход проведён: ${valid.length} поз.`)) {
                setRows([blank(), blank(), blank()]);
                setNote('');
              }
            }}
          >
            Провести приход
          </button>
        </div>
      </div>
    </div>
  );
}

const OFF = ['Испортилось', 'Просрочено', 'Брак при готовке', 'Питание персонала', 'Дегустация'];

function WriteOff({ ings, post }: { ings: Ing[]; post: Post }) {
  const [ing, setIng] = useState('');
  const [qty, setQty] = useState('');
  const [why, setWhy] = useState('');
  const i = ings.find((x) => x.id === ing);
  if (!ings.length) return <div className="box empty">Сначала добавьте продукты во вкладке «Остатки».</div>;
  return (
    <div className="box" style={{ maxWidth: 640 }}>
      <h2>Списание</h2>
      <p>Всё, что ушло не в продажу. Попадёт в журнал действий с вашим именем.</p>
      <div className="grid-f">
        <label className="f">
          <span>Продукт</span>
          <IngSelect ings={ings} value={ing} onChange={setIng} />
          {i && (
            <small>
              На складе {qtyFmt(i.stock)} {i.unit}
            </small>
          )}
        </label>
        <label className="f">
          <span>Сколько, {i?.unit || 'ед.'}</span>
          <input className="ip num" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
          {i && n(qty) > 0 && <small>≈ {money(n(qty) * i.cost)} сум</small>}
        </label>
        <div className="f full">
          <span>Причина</span>
          <div className="toggles">
            {OFF.map((r) => (
              <button key={r} type="button" className={`tg ${why === r ? 'on' : ''}`} onClick={() => setWhy(r)}>
                {r}
              </button>
            ))}
          </div>
          <input className="ip" placeholder="Или своя причина" value={OFF.includes(why) ? '' : why} onChange={(e) => setWhy(e.target.value)} />
        </div>
      </div>
      <button
        className="b main"
        style={{ marginTop: 12 }}
        disabled={!ing || n(qty) <= 0 || why.trim().length < 2}
        onClick={async () => {
          if (await post({ action: 'writeoff', ing, qty: n(qty), note: why }, 'Списано')) {
            setQty('');
            setWhy('');
          }
        }}
      >
        Списать
      </button>
    </div>
  );
}

function Count({ ings, post }: { ings: Ing[]; post: Post }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const filled = ings.filter((i) => vals[i.id] !== undefined && vals[i.id] !== '');
  const diffSum = filled.reduce((s, i) => s + (n(vals[i.id]) - i.stock) * i.cost, 0);
  if (!ings.length) return <div className="box empty">Сначала добавьте продукты во вкладке «Остатки».</div>;
  return (
    <div className="box">
      <h2>Инвентаризация</h2>
      <p>Впишите, сколько реально лежит. Пустые строки не меняются. Разница уйдёт в историю как «Инвентаризация».</p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Продукт</th>
              <th className="r">По учёту</th>
              <th>Фактически</th>
              <th className="r">Разница</th>
            </tr>
          </thead>
          <tbody>
            {ings.map((i) => {
              const v = vals[i.id];
              const d = v !== undefined && v !== '' ? n(v) - i.stock : null;
              return (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td className="r num">
                    {qtyFmt(i.stock)} {i.unit}
                  </td>
                  <td>
                    <input className="ip sm num" style={{ width: 110 }} inputMode="decimal" value={v ?? ''} onChange={(e) => setVals({ ...vals, [i.id]: e.target.value })} aria-label={`Фактически: ${i.name}`} />
                  </td>
                  <td className="r num">{d === null ? '' : Math.abs(d) < 1e-9 ? <span className="bd ok">сходится</span> : <span className={`bd ${d < 0 ? 'bad' : 'new'}`}>{d > 0 ? '+' : ''}{qtyFmt(d)} {i.unit} · {money(d * i.cost)}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sx-row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
        <span className="num">
          Заполнено {filled.length} · разница {diffSum < 0 ? '−' : '+'}
          {money(Math.abs(diffSum))} сум
        </span>
        <button
          className="b main"
          disabled={!filled.length}
          onClick={async () => {
            if (await post({ action: 'count', lines: filled.map((i) => ({ ing: i.id, actual: n(vals[i.id]) })) }, 'Инвентаризация проведена')) setVals({});
          }}
        >
          Провести
        </button>
      </div>
    </div>
  );
}

function Log() {
  const [kind, setKind] = useState('');
  const [days, setDays] = useState('7');
  const [moves, setMoves] = useState<Move[] | null>(null);
  const { toast } = usePanel();
  useEffect(() => {
    setMoves(null);
    api(`/api/admin/stock?days=${days}${kind ? '&kind=' + kind : ''}`)
      .then((j) => setMoves(j.moves))
      .catch((e) => toast(e.message));
  }, [kind, days, toast]);
  return (
    <div className="box">
      <div className="sx-row" style={{ marginBottom: 12 }}>
        <div className="seg">
          {[['', 'Все'], ...Object.entries(MOVE_RU)].map(([k, l]) => (
            <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
              {l}
            </button>
          ))}
        </div>
        <select className="ip sm" style={{ width: 'auto' }} value={days} onChange={(e) => setDays(e.target.value)} aria-label="Период">
          <option value="1">Сутки</option>
          <option value="7">7 дней</option>
          <option value="30">30 дней</option>
        </select>
      </div>
      {!moves ? (
        <div className="empty">Загружаем…</div>
      ) : moves.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Когда</th>
                <th>Что</th>
                <th>Продукт</th>
                <th className="r">Количество</th>
                <th className="r">Сумма</th>
                <th>Кто, комментарий</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="num muted">{when(m.at)}</td>
                  <td>
                    <span className={`bd ${m.kind === 'in' ? 'ok' : m.kind === 'writeoff' ? 'bad' : m.kind === 'sale' ? 'info' : ''}`}>{MOVE_RU[m.kind] || m.kind}</span>
                  </td>
                  <td>{m.name}</td>
                  <td className="r num">
                    {m.qty > 0 ? '+' : ''}
                    {qtyFmt(m.qty)} {m.unit}
                  </td>
                  <td className="r num">{m.price ? money(Math.abs(m.qty) * m.price) : '—'}</td>
                  <td className="muted small">
                    {m.by}
                    {m.note ? ` · ${m.note}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <b>Движений нет</b>
        </div>
      )}
    </div>
  );
}
