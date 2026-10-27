'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, money, qtyFmt, usePanel, when } from './kit';
import { n, type Ing, type Supplier } from './Stock';

/* Stock tabs: purchases and suppliers, preps (заготовки), turnover sheet (оборотка). */

type PLine = { ing: string; qty: number; price: number };
type Purchase = { id: number; supplierId: string; status: 'draft' | 'ordered' | 'received' | 'cancelled'; note: string; lines: PLine[]; total: number; paid: boolean; createdBy: string; receivedBy: string; createdAt: string; receivedAt: string | null };
type Data = { suppliers: Supplier[]; purchases: Purchase[]; suggest: { ing: string; name: string; unit: string; supplierId: string; stock: number; qty: number; price: number }[]; debts: Record<string, { sum: number; n: number }>; ings: Ing[] };
const ST: Record<Purchase['status'], [string, string]> = { draft: ['Черновик', 'new'], ordered: ['Заказано', 'info'], received: ['Принято', 'ok'], cancelled: ['Отменено', ''] };

function usePost(reload: () => Promise<unknown>) {
  const { toast } = usePanel();
  return async (body: Record<string, unknown>, ok: string) => {
    try {
      const r = await api('/api/admin/purchases', 'POST', body);
      toast(ok);
      await reload();
      return r || true;
    } catch (e: any) {
      toast(e.message);
      return null;
    }
  };
}

export function Purchases({ onChanged }: { onChanged: () => void }) {
  const [d, setD] = useState<Data | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [sup, setSup] = useState<Supplier | 'new' | null>(null);
  const [view, setView] = useState<'open' | 'all'>('open');
  const { toast } = usePanel();
  const load = useCallback(async () => {
    try {
      setD(await api('/api/admin/purchases'));
    } catch (e: any) {
      toast(e.message);
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);
  const post = usePost(async () => {
    await load();
    onChanged();
  });
  if (!d) return <div className="box empty">Загружаем…</div>;
  const sname = (id: string) => d.suppliers.find((s) => s.id === id)?.name || 'Без поставщика';
  const iname = (id: string) => d.ings.find((i) => i.id === id);
  const list = d.purchases.filter((p) => (view === 'open' ? p.status === 'draft' || p.status === 'ordered' : true));
  const owe = Object.entries(d.debts);

  return (
    <>
      <div className="box">
        <div className="box-head">
          <div>
            <h2>Что пора заказать</h2>
            <p className="muted" style={{ margin: 0 }}>
              Продукты ниже минимума. Автозаказ создаст черновик для каждого поставщика: проверьте количество и отправьте.
            </p>
          </div>
          <button className="b main" disabled={!d.suggest.length} onClick={() => post({ action: 'auto' }, 'Черновики заказов созданы')}>
            Автозаказ · {d.suggest.length}
          </button>
        </div>
        {d.suggest.length ? (
          <div className="toggles">
            {d.suggest.map((x) => (
              <span key={x.ing} className="tg">
                {x.name}: {qtyFmt(x.stock)} → +{qtyFmt(x.qty)} {x.unit}
                <span className="muted small"> · {sname(x.supplierId)}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="muted">Всё в норме. Минимум и «заказывать до» задаются в карточке продукта.</p>
        )}
      </div>

      <div className="box">
        <div className="box-head">
          <div className="seg">
            <button className={view === 'open' ? 'on' : ''} onClick={() => setView('open')}>
              В работе · {d.purchases.filter((p) => p.status === 'draft' || p.status === 'ordered').length}
            </button>
            <button className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>
              Все за 90 дней
            </button>
          </div>
          <NewPurchase d={d} post={post} onMade={(id) => setOpen(id)} />
        </div>
        {list.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Поставщик</th>
                  <th>Создан</th>
                  <th className="r">Сумма</th>
                  <th>Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="click" onClick={() => setOpen(p.id)}>
                    <td className="num">{p.id}</td>
                    <td>
                      <b>{sname(p.supplierId)}</b>
                      <div className="muted small">
                        {p.lines.length} поз.{p.note ? ' · ' + p.note : ''}
                      </div>
                    </td>
                    <td className="muted num">{when(p.createdAt)}</td>
                    <td className="r num">{money(p.total)}</td>
                    <td>
                      <span className={`bd ${ST[p.status][1]}`}>{ST[p.status][0]}</span>
                      {p.status === 'received' && <span className={`bd ${p.paid ? 'ok' : 'bad'}`} style={{ marginLeft: 6 }}>{p.paid ? 'оплачено' : 'долг'}</span>}
                    </td>
                    <td className="r">
                      <button className="b sm">Открыть</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>{view === 'open' ? 'Заказов в работе нет' : 'Закупок пока нет'}</b>
            Нажмите «Автозаказ» или «Новый заказ».
          </div>
        )}
      </div>

      <div className="box">
        <div className="box-head">
          <h2>Поставщики</h2>
          <button className="b sm" onClick={() => setSup('new')}>
            + Поставщик
          </button>
        </div>
        {d.suppliers.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Поставщик</th>
                  <th>Телефон</th>
                  <th className="r">Мы должны</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.suppliers.map((s) => (
                  <tr key={s.id} style={s.active ? undefined : { opacity: 0.5 }}>
                    <td>
                      <b>{s.name}</b>
                      {s.note && <div className="muted small">{s.note}</div>}
                    </td>
                    <td className="num">{s.phone ? <a href={`tel:${s.phone}`}>{s.phone}</a> : '—'}</td>
                    <td className="r num">{d.debts[s.id] ? <span className="bd bad">{money(d.debts[s.id].sum)} · {d.debts[s.id].n} зак.</span> : '—'}</td>
                    <td className="r">
                      <button className="b sm" onClick={() => setSup(s)}>
                        Изменить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Добавьте поставщиков: мясник, овощная база, напитки. Потом укажите поставщика в карточке продукта — автозаказ сгруппирует по ним.</p>
        )}
        {owe.length > 0 && (
          <p className="muted small">
            Всего долг поставщикам: <b className="num">{money(owe.reduce((a, [, v]) => a + v.sum, 0))} сум</b>. Отметьте «Оплачено» в закупке, когда рассчитаетесь.
          </p>
        )}
      </div>

      {open !== null && d.purchases.find((p) => p.id === open) && (
        <PurchaseCard p={d.purchases.find((p) => p.id === open)!} d={d} sname={sname} iname={iname} post={post} onClose={() => setOpen(null)} />
      )}
      {sup && <SupplierCard s={sup === 'new' ? null : sup} post={post} onClose={() => setSup(null)} />}
    </>
  );
}

function NewPurchase({ d, post, onMade }: { d: Data; post: ReturnType<typeof usePost>; onMade: (id: number) => void }) {
  const [sid, setSid] = useState('');
  return (
    <div className="sx-row">
      <select className="ip sm" style={{ width: 'auto' }} value={sid} onChange={(e) => setSid(e.target.value)} aria-label="Поставщик">
        <option value="">Поставщик…</option>
        {d.suppliers
          .filter((s) => s.active)
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
      </select>
      <button
        className="b sm main"
        onClick={async () => {
          // start with this supplier's products, quantity to fill in
          const mine = d.ings.filter((i) => !i.isPrep && i.supplierId === sid);
          const lines = (mine.length ? mine : d.ings.filter((i) => !i.isPrep).slice(0, 1)).map((i) => ({ ing: i.id, qty: 0, price: Math.round(i.cost) }));
          if (!lines.length) return;
          const r: any = await post({ action: 'create', supplierId: sid, note: '', lines: lines.map((l) => ({ ...l, qty: l.qty || 0 })) }, 'Черновик создан');
          if (r?.id) onMade(r.id);
        }}
      >
        Новый заказ
      </button>
    </div>
  );
}

function PurchaseCard({ p, d, sname, iname, post, onClose }: { p: Purchase; d: Data; sname: (id: string) => string; iname: (id: string) => Ing | undefined; post: ReturnType<typeof usePost>; onClose: () => void }) {
  const editable = p.status === 'draft' || p.status === 'ordered';
  const [lines, setLines] = useState(p.lines.map((l) => ({ ing: l.ing, qty: String(l.qty || ''), price: String(l.price || '') })));
  const [note, setNote] = useState(p.note);
  const [sid, setSid] = useState(p.supplierId);
  const { toast } = usePanel();
  const clean = () => lines.filter((l) => l.ing).map((l) => ({ ing: l.ing, qty: n(l.qty), price: n(l.price) }));
  const total = clean().reduce((s, l) => s + l.qty * l.price, 0);
  const sup = d.suppliers.find((s) => s.id === sid);
  const text = `Заказ № ${p.id}${sup ? ` для ${sup.name}` : ''}:\n` + clean().filter((l) => l.qty > 0).map((l) => `• ${iname(l.ing)?.name}: ${qtyFmt(l.qty)} ${iname(l.ing)?.unit}`).join('\n');
  const save = () => post({ action: 'update', id: p.id, lines: clean(), note, supplierId: sid }, 'Сохранено');
  return (
    <div className="sx-modal" role="dialog" aria-modal="true" aria-label={`Закупка № ${p.id}`}>
      <div className="sx-scrim" onClick={onClose} />
      <div className="sx-sheet wide">
        <h3>
          Закупка № {p.id} · <span className={`bd ${ST[p.status][1]}`}>{ST[p.status][0]}</span>
        </h3>
        <div className="grid-f">
          <label className="f">
            <span>Поставщик</span>
            <select className="ip" value={sid} disabled={!editable} onChange={(e) => setSid(e.target.value)}>
              <option value="">— без поставщика —</option>
              {d.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="f">
            <span>Комментарий / накладная</span>
            <input className="ip" value={note} disabled={!editable} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Продукт</th>
                <th>Сколько</th>
                <th>Цена за ед.</th>
                <th className="r">Сумма</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, k) => {
                const i = iname(l.ing);
                const set = (x: Partial<typeof l>) => setLines(lines.map((y, j) => (j === k ? { ...y, ...x } : y)));
                return (
                  <tr key={k}>
                    <td style={{ minWidth: 180 }}>
                      <select className="ip sm" value={l.ing} disabled={!editable} onChange={(e) => set({ ing: e.target.value, price: l.price || String(Math.round(iname(e.target.value)?.cost || 0)) })}>
                        <option value="">— продукт —</option>
                        {d.ings
                          .filter((x) => !x.isPrep)
                          .map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.name}, {x.unit}
                            </option>
                          ))}
                      </select>
                      {i && <small className="muted">на складе {qtyFmt(i.stock)} {i.unit}</small>}
                    </td>
                    <td>
                      <input className="ip sm num" style={{ width: 90 }} inputMode="decimal" disabled={!editable} value={l.qty} onChange={(e) => set({ qty: e.target.value })} /> <span className="muted">{i?.unit}</span>
                    </td>
                    <td>
                      <input className="ip sm num" style={{ width: 110 }} inputMode="numeric" disabled={!editable} value={l.price} onChange={(e) => set({ price: e.target.value })} />
                    </td>
                    <td className="r num">{money(n(l.qty) * n(l.price))}</td>
                    <td className="r">
                      {editable && (
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
        </div>
        {editable && (
          <button className="lnk" style={{ alignSelf: 'flex-start' }} onClick={() => setLines([...lines, { ing: '', qty: '', price: '' }])}>
            + строка
          </button>
        )}
        <div className="sx-row" style={{ justifyContent: 'space-between' }}>
          <b className="num">Итого {money(total)} сум</b>
          {p.receivedAt && (
            <span className="muted small">
              принял {p.receivedBy} · {when(p.receivedAt)}
            </span>
          )}
        </div>
        <div className="sx-row">
          {editable && (
            <>
              <button className="b" onClick={save}>
                Сохранить
              </button>
              {p.status === 'draft' && (
                <button
                  className="b"
                  onClick={async () => {
                    await save();
                    try {
                      await navigator.clipboard.writeText(text);
                      toast('Текст заказа скопирован — отправьте поставщику');
                    } catch {}
                    await post({ action: 'order', id: p.id }, 'Отмечено: заказ отправлен');
                  }}
                >
                  Скопировать и отметить «заказано»
                </button>
              )}
              <a className="b" href={`https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${encodeURIComponent(text)}`} target="_blank" rel="noopener">
                Отправить в Telegram
              </a>
              <button
                className="b main"
                disabled={!clean().some((l) => l.qty > 0)}
                onClick={async () => (await post({ action: 'receive', id: p.id, lines: clean().filter((l) => l.qty > 0) }, 'Принято на склад')) && onClose()}
              >
                Принять на склад
              </button>
              <button className="lnk red" onClick={async () => (await post({ action: 'cancel', id: p.id }, 'Закупка отменена')) && onClose()}>
                Отменить
              </button>
            </>
          )}
          {p.status === 'received' && (
            <button className={`b ${p.paid ? '' : 'main'}`} onClick={async () => (await post({ action: 'paid', id: p.id, paid: !p.paid }, p.paid ? 'Оплата снята' : 'Отмечено: оплачено')) && onClose()}>
              {p.paid ? 'Снять отметку «оплачено»' : 'Отметить «оплачено»'}
            </button>
          )}
          <button className="b" onClick={onClose}>
            Закрыть
          </button>
        </div>
        {editable && <p className="muted small">«Принять на склад» — когда товар привезли: впишите, сколько реально пришло и по какой цене. Остатки и средние цены пересчитаются.</p>}
      </div>
    </div>
  );
}

function SupplierCard({ s, post, onClose }: { s: Supplier | null; post: ReturnType<typeof usePost>; onClose: () => void }) {
  const [f, setF] = useState({ name: s?.name || '', phone: s?.phone || '', note: s?.note || '', active: s?.active ?? true });
  return (
    <div className="sx-modal" role="dialog" aria-modal="true" aria-label="Поставщик">
      <div className="sx-scrim" onClick={onClose} />
      <div className="sx-sheet narrow">
        <h3>{s ? s.name : 'Новый поставщик'}</h3>
        <label className="f">
          <span>Название</span>
          <input className="ip" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Мясник Бахтиёр" autoFocus />
        </label>
        <label className="f">
          <span>Телефон</span>
          <input className="ip" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        </label>
        <label className="f">
          <span>Заметка</span>
          <input className="ip" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Привозит по вторникам и пятницам" />
        </label>
        {s && (
          <label className="f" style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> <span>Работаем</span>
          </label>
        )}
        <div className="sx-row">
          <button className="b main" disabled={f.name.trim().length < 2} onClick={async () => (await post({ action: 'supplier', id: s?.id, ...f }, 'Сохранено')) && onClose()}>
            Сохранить
          </button>
          <button className="b" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- preps ---------- */

type Prep = { ing: string; out: number; lines: { ing: string; qty: number }[] };

export function Preps({ ings, onChanged }: { ings: Ing[]; onChanged: () => void }) {
  const [preps, setPreps] = useState<Prep[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { toast } = usePanel();
  const load = useCallback(async () => {
    try {
      setPreps((await api('/api/admin/stock?part=preps')).preps);
    } catch (e: any) {
      toast(e.message);
    }
  }, [toast]);
  useEffect(() => {
    load();
  }, [load]);
  const list = ings.filter((i) => i.isPrep);
  const im = useMemo(() => new Map(ings.map((i) => [i.id, i])), [ings]);
  if (!preps) return <div className="box empty">Загружаем…</div>;
  return (
    <>
      <div className="box">
        <h2>Заготовки</h2>
        <p className="muted">
          То, что готовите заранее: тесто, бульон, соус, фарш. У заготовки есть рецепт «из чего и сколько получается». Акт приготовления спишет сырьё и поставит заготовку на склад с настоящей себестоимостью. В техкартах блюд заготовку выбирают как обычный продукт.
        </p>
        {!list.length && <div className="empty">Заготовок нет. Создайте продукт во вкладке «Остатки» и отметьте «Это заготовка».</div>}
      </div>
      {list.map((p) => {
        const r = preps.find((x) => x.ing === p.id);
        const cost = r ? r.lines.reduce((s, l) => s + (l.qty / ((im.get(l.ing)?.yield || 100) / 100)) * (im.get(l.ing)?.cost || 0), 0) / (r.out || 1) : null;
        return (
          <div className="box" key={p.id}>
            <div className="box-head">
              <div>
                <h2 style={{ margin: 0 }}>{p.name}</h2>
                <span className="muted small">
                  на складе {qtyFmt(p.stock)} {p.unit}
                  {cost !== null ? ` · по рецепту ${money(cost)} сум за ${p.unit}` : ' · нет рецепта'}
                </span>
              </div>
              <button className="b sm" onClick={() => setOpen(open === p.id ? null : p.id)}>
                {open === p.id ? 'Свернуть' : r ? 'Рецепт и приготовление' : 'Составить рецепт'}
              </button>
            </div>
            {open === p.id && <PrepEditor p={p} r={r} ings={ings.filter((i) => i.id !== p.id)} im={im} onSaved={() => (load(), onChanged())} />}
          </div>
        );
      })}
    </>
  );
}

function PrepEditor({ p, r, ings, im, onSaved }: { p: Ing; r?: Prep; ings: Ing[]; im: Map<string, Ing>; onSaved: () => void }) {
  const [out, setOut] = useState(String(r?.out || ''));
  const [lines, setLines] = useState([...(r?.lines || []).map((l) => ({ ing: l.ing, qty: String(l.qty) })), { ing: '', qty: '' }]);
  const [planned, setPlanned] = useState(String(r?.out || ''));
  const [actual, setActual] = useState('');
  const { toast } = usePanel();
  const k = r && r.out > 0 ? n(planned) / r.out : 0;
  const go = async (body: Record<string, unknown>, ok: string) => {
    try {
      const j = await api('/api/admin/stock', 'POST', body);
      toast(ok + (j?.short?.length ? ` · не хватало: ${j.short.join('; ')}` : ''));
      onSaved();
      return true;
    } catch (e: any) {
      toast(e.message);
      return false;
    }
  };
  return (
    <div className="dish-ed">
      <h3 style={{ marginTop: 0 }}>Рецепт</h3>
      <table className="tbl">
        <tbody>
          {lines.map((l, j) => {
            const i = im.get(l.ing);
            const set = (x: Partial<typeof l>) => {
              const next = lines.map((y, z) => (z === j ? { ...y, ...x } : y));
              if (j === lines.length - 1 && x.ing) next.push({ ing: '', qty: '' });
              setLines(next);
            };
            return (
              <tr key={j}>
                <td style={{ minWidth: 200 }}>
                  <select className="ip sm" value={l.ing} onChange={(e) => set({ ing: e.target.value })}>
                    <option value="">— добавить сырьё —</option>
                    {ings.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}, {x.unit}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input className="ip sm num" style={{ width: 100 }} inputMode="decimal" value={l.qty} disabled={!l.ing} onChange={(e) => set({ qty: e.target.value })} /> <span className="muted">{i?.unit}</span>
                  {i && i.yield < 100 && n(l.qty) > 0 && (
                    <small className="muted">
                      {' '}
                      со склада {qtyFmt(n(l.qty) / (i.yield / 100))} {i.unit}
                    </small>
                  )}
                </td>
                <td className="r">
                  {l.ing && (
                    <button className="lnk red" onClick={() => setLines(lines.filter((_, z) => z !== j))}>
                      убрать
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="sx-row" style={{ marginTop: 8 }}>
        <span>Получается:</span>
        <input className="ip sm num" style={{ width: 100 }} inputMode="decimal" value={out} onChange={(e) => setOut(e.target.value)} /> <span className="muted">{p.unit}</span>
        <button
          className="b sm main"
          disabled={!(n(out) > 0)}
          onClick={() => go({ action: 'prep', ing: p.id, out: n(out), lines: lines.filter((l) => l.ing && n(l.qty) > 0).map((l) => ({ ing: l.ing, qty: n(l.qty) })) }, 'Рецепт заготовки сохранён')}
        >
          Сохранить рецепт
        </button>
      </div>
      {r && (
        <>
          <h3>Акт приготовления</h3>
          <div className="sx-row">
            <span>Готовим по рецепту:</span>
            <input className="ip sm num" style={{ width: 100 }} inputMode="decimal" value={planned} onChange={(e) => setPlanned(e.target.value)} /> <span className="muted">{p.unit}</span>
            <span>получилось фактически:</span>
            <input className="ip sm num" style={{ width: 100 }} inputMode="decimal" value={actual} placeholder={planned} onChange={(e) => setActual(e.target.value)} /> <span className="muted">{p.unit}</span>
          </div>
          {k > 0 && (
            <div className="muted small">
              Спишется:{' '}
              {r.lines
                .map((l) => {
                  const i = im.get(l.ing);
                  if (!i) return '';
                  const need = (l.qty / (i.yield / 100)) * k;
                  return `${i.name} ${qtyFmt(need)} ${i.unit}${i.stock < need ? ' (не хватает!)' : ''}`;
                })
                .filter(Boolean)
                .join(' · ')}
            </div>
          )}
          <button
            className="b main"
            style={{ marginTop: 8 }}
            disabled={!(n(planned) > 0)}
            onClick={async () => {
              if (await go({ action: 'produce', ing: p.id, planned: n(planned), actual: n(actual) || n(planned) }, `Готово: ${p.name} на складе`)) setActual('');
            }}
          >
            Провести акт
          </button>
        </>
      )}
    </div>
  );
}

/* ---------- turnover ---------- */

type Row = { id: string; name: string; unit: string; open: number; inQty: number; inSum: number; sale: number; off: number; adjust: number; prod: number; close: number; cost: number };

export function Turnover() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
  const [from, setFrom] = useState(today.slice(0, 8) + '01');
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<Row[] | null>(null);
  const { toast } = usePanel();
  useEffect(() => {
    setRows(null);
    api(`/api/admin/stock?part=turnover&from=${from}&to=${to}`)
      .then((j) => setRows(j.rows))
      .catch((e) => toast(e.message));
  }, [from, to, toast]);
  const sum = (f: (r: Row) => number) => (rows || []).reduce((s, r) => s + f(r), 0);
  const csv = () => {
    const head = ['Продукт', 'Ед.', 'Остаток на начало', 'Приход', 'Приход, сум', 'Продажи', 'Списания', 'Инвентаризация', 'Заготовки', 'Остаток на конец', 'Сумма на конец'];
    const body = (rows || []).map((r) => [r.name, r.unit, r.open, r.inQty, Math.round(r.inSum), r.sale, r.off, r.adjust, r.prod, r.close, Math.round(r.close * r.cost)].map((x) => String(typeof x === 'number' ? +x.toFixed(3) : x).replace('.', ',')));
    const text = [head, ...body].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
    a.download = `оборотка_${from}_${to}.csv`;
    a.click();
  };
  return (
    <div className="box">
      <div className="box-head">
        <div className="sx-row">
          <label className="f">
            <span>С</span>
            <input className="ip sm" type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </label>
          <label className="f">
            <span>По</span>
            <input className="ip sm" type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
          </label>
        </div>
        <button className="b sm" disabled={!rows?.length} onClick={csv}>
          Скачать для Excel
        </button>
      </div>
      {!rows ? (
        <div className="empty">Загружаем…</div>
      ) : rows.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Продукт</th>
                <th className="r">На начало</th>
                <th className="r">Приход</th>
                <th className="r">Продажи</th>
                <th className="r">Списания</th>
                <th className="r">Инвент.</th>
                <th className="r">Заготовки</th>
                <th className="r">На конец</th>
                <th className="r">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.name}</b> <span className="muted small">{r.unit}</span>
                  </td>
                  <td className="r num">{qtyFmt(r.open)}</td>
                  <td className="r num">{r.inQty ? `+${qtyFmt(r.inQty)}` : '—'}</td>
                  <td className="r num">{r.sale ? `−${qtyFmt(r.sale)}` : '—'}</td>
                  <td className="r num">{r.off ? `−${qtyFmt(r.off)}` : '—'}</td>
                  <td className="r num">{r.adjust ? `${r.adjust > 0 ? '+' : ''}${qtyFmt(r.adjust)}` : '—'}</td>
                  <td className="r num">{r.prod ? `${r.prod > 0 ? '+' : ''}${qtyFmt(r.prod)}` : '—'}</td>
                  <td className="r num">
                    <b>{qtyFmt(r.close)}</b>
                  </td>
                  <td className="r num">{money(Math.max(0, r.close) * r.cost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <b>Итого закупили на {money(sum((r) => r.inSum))} сум</b>
                </td>
                <td colSpan={7} className="r muted">
                  остаток на конец по средней цене
                </td>
                <td className="r num">
                  <b>{money(sum((r) => Math.max(0, r.close) * r.cost))}</b>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="empty">За период движений нет</div>
      )}
    </div>
  );
}
