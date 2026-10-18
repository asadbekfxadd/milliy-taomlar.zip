'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, money, PageHead, qtyFmt, usePanel, when } from './kit';

type Ing = { id: string; name: string; unit: string; stock: number; min: number; cost: number; active: boolean };
type Move = { id: number; name: string; unit: string; kind: string; qty: number; price: number; note: string; by: string; at: string };
const UNITS = ['кг', 'л', 'шт', 'пачка', 'бутылка'];
const MOVE_RU: Record<string, string> = { in: 'Приход', writeoff: 'Списание', adjust: 'Инвентаризация', sale: 'Продажа', return: 'Возврат продажи' };
const n = (v: string) => Number(v.replace(',', '.').replace(/[^\d.]/g, '')) || 0;

const TABS: [string, string][] = [
  ['left', 'Остатки'],
  ['in', 'Приход'],
  ['off', 'Списание'],
  ['count', 'Инвентаризация'],
  ['log', 'История'],
];

export default function Stock({ initial }: { initial: Ing[] }) {
  const sp = useSearchParams();
  const [tab, setTab] = useState('left');
  const [ings, setIngs] = useState(initial);
  const { toast } = usePanel();
  const reload = useCallback(async () => setIngs((await api('/api/admin/stock?days=1')).ings), []);
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
      <PageHead title="Склад" sub="Продукты и их остатки. Продажи списываются сами по техкартам, когда чек закрыт. Приход, списание и пересчёт — здесь." />
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
      {tab === 'left' && <Left ings={ings} onlyLow={sp.get('f') === 'low'} post={post} />}
      {tab === 'in' && <Receive ings={active} post={post} />}
      {tab === 'off' && <WriteOff ings={active} post={post} />}
      {tab === 'count' && <Count ings={active} post={post} />}
      {tab === 'log' && <Log />}
    </>
  );
}

type Post = (b: Record<string, unknown>, ok: string) => Promise<boolean>;

function Left({ ings, onlyLow, post }: { ings: Ing[]; onlyLow: boolean; post: Post }) {
  const [qs, setQs] = useState('');
  const [low, setLow] = useState(onlyLow);
  const [hidden, setHidden] = useState(false);
  const [adding, setAdding] = useState(ings.length === 0);
  const [edit, setEdit] = useState<string | null>(null);
  const shown = ings.filter((i) => (hidden ? !i.active : i.active) && (!low || (i.min > 0 && i.stock <= i.min)) && (!qs || i.name.toLowerCase().includes(qs.toLowerCase())));
  return (
    <>
      {adding && <NewIng post={post} onDone={() => setAdding(false)} />}
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
                {shown.map((i) =>
                  edit === i.id ? (
                    <EditRow key={i.id} i={i} post={post} onDone={() => setEdit(null)} />
                  ) : (
                    <tr key={i.id} className={i.stock <= 0 ? 'out' : i.min > 0 && i.stock <= i.min ? 'low' : ''}>
                      <td>
                        <b>{i.name}</b>
                        {i.stock <= 0 ? <span className="bd bad" style={{ marginLeft: 6 }}>нет</span> : i.min > 0 && i.stock <= i.min ? <span className="bd new" style={{ marginLeft: 6 }}>мало</span> : null}
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
                  ),
                )}
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

function EditRow({ i, post, onDone }: { i: Ing; post: Post; onDone: () => void }) {
  const [name, setName] = useState(i.name);
  const [unit, setUnit] = useState(i.unit);
  const [min, setMin] = useState(String(i.min || ''));
  return (
    <tr>
      <td>
        <input className="ip sm" value={name} onChange={(e) => setName(e.target.value)} aria-label="Название" />
      </td>
      <td className="r">
        <select className="ip sm" style={{ width: 'auto' }} value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Единица">
          {UNITS.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </td>
      <td className="r">
        <input className="ip sm num" style={{ width: 90 }} inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} aria-label="Минимум" placeholder="минимум" />
      </td>
      <td colSpan={3} className="r">
        <div className="sx-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
          <button className="b sm main" onClick={async () => (await post({ action: 'update', id: i.id, name, unit, min: n(min) }, 'Сохранено')) && onDone()}>
            Сохранить
          </button>
          <button className="b sm" onClick={onDone}>
            Отмена
          </button>
          <button className="lnk red" onClick={async () => (await post({ action: 'update', id: i.id, active: !i.active }, i.active ? 'Продукт скрыт' : 'Продукт снова в списке')) && onDone()}>
            {i.active ? 'Скрыть' : 'Вернуть'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function NewIng({ post, onDone }: { post: Post; onDone: () => void }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('кг');
  const [stock, setStock] = useState('');
  const [cost, setCost] = useState('');
  const [min, setMin] = useState('');
  return (
    <form
      className="box"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await post({ action: 'create', name, unit, stock: n(stock), cost: n(cost), min: n(min) }, `«${name}» добавлен`)) {
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

function Receive({ ings, post }: { ings: Ing[]; post: Post }) {
  const blank = () => ({ ing: '', qty: '', price: '' });
  const [rows, setRows] = useState([blank(), blank(), blank()]);
  const [note, setNote] = useState('');
  const map = useMemo(() => new Map(ings.map((i) => [i.id, i])), [ings]);
  const valid = rows.filter((r) => r.ing && n(r.qty) > 0);
  const total = valid.reduce((s, r) => s + n(r.qty) * n(r.price), 0);
  if (!ings.length) return <div className="box empty">Сначала добавьте продукты во вкладке «Остатки».</div>;
  return (
    <div className="box">
      <h2>Приход по накладной</h2>
      <p>Цена — за единицу (кг, литр, штуку). Средняя цена продукта пересчитается сама.</p>
      <label className="f" style={{ maxWidth: 420, marginBottom: 12 }}>
        <span>Поставщик или номер накладной</span>
        <input className="ip" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Рынок, мясник Бахтиёр, накладная 125" />
      </label>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Продукт</th>
              <th>Количество</th>
              <th>Цена за ед.</th>
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
                    <IngSelect ings={ings} value={r.ing} onChange={(v) => set({ ing: v, price: r.price || (map.get(v)?.cost ? String(Math.round(map.get(v)!.cost)) : '') })} />
                  </td>
                  <td>
                    <div className="sx-row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                      <input className="ip sm num" style={{ width: 100 }} inputMode="decimal" value={r.qty} onChange={(e) => set({ qty: e.target.value })} aria-label="Количество" />
                      <span className="muted">{i?.unit}</span>
                    </div>
                  </td>
                  <td>
                    <input className="ip sm num" style={{ width: 120 }} inputMode="numeric" value={r.price} onChange={(e) => set({ price: e.target.value })} aria-label="Цена" />
                  </td>
                  <td className="r num">{n(r.qty) && n(r.price) ? money(n(r.qty) * n(r.price)) : '—'}</td>
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
              if (await post({ action: 'receive', note, lines: valid.map((r) => ({ ing: r.ing, qty: n(r.qty), price: n(r.price) })) }, `Приход проведён: ${valid.length} поз.`)) {
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
