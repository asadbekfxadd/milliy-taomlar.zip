'use client';
import { useState } from 'react';
import type { Menu, Settings } from '@/lib/types';
import { DAYS_RU, LOYALTY_DEFAULT, windowText, type Deal, type DealKind, type HappyHour, type Window } from '@/lib/offers';
import { money, PageHead } from './kit';
import { useSettingsDoc } from './SettingsEditor';

/* Promotions without a code, happy hours and loyalty points: one page, three tabs. */

const num = (v: string) => Number(v.replace(/[^\d.]/g, '')) || 0;
const uid = () => Math.random().toString(36).slice(2, 10);

const KIND: Record<DealKind, { t: string; hint: string }> = {
  nplus: { t: 'Купи N — получи', hint: '2+1, второй за полцены — на категорию или блюда' },
  set: { t: 'Набор по цене', hint: 'Несколько блюд вместе за фиксированную сумму' },
  tiers: { t: 'Скидка от суммы', hint: 'Ступени: от 150 000 — 5%, от 300 000 — 10%' },
  first: { t: 'Первый заказ', hint: 'Скидка на первый заказ с сайта, гостя узнаём по телефону' },
};

function newDeal(kind: DealKind): Deal {
  const base = { id: uid(), kind, active: false, site: true, pos: kind !== 'first', withPromo: false, withHappy: false, days: [], from: '', to: '', dateFrom: '', dateTo: '' };
  if (kind === 'nplus') return { ...base, name: 'Шашлык 4+1', buy: 4, get: 1, pct: 100, cats: [], dishes: [] };
  if (kind === 'set') return { ...base, name: 'Обед: лагман + салат + чай', setDishes: [], setPrice: 0 };
  if (kind === 'tiers') return { ...base, name: 'Скидка от суммы', tiers: [{ from: 150000, pct: 5 }, { from: 300000, pct: 10 }] };
  return { ...base, name: 'Скидка на первый заказ', pct: 10 };
}

function WindowFields<T extends Window>({ w, set }: { w: T; set: (fn: (x: T) => void) => void }) {
  return (
    <div className="of-win">
      <div className="toggles">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <button key={d} type="button" className={`tg ${w.days.includes(d) ? 'on' : ''}`} onClick={() => set((x) => (x.days = x.days.includes(d) ? x.days.filter((y) => y !== d) : [...x.days, d]))}>
            {DAYS_RU[d]}
          </button>
        ))}
        <span className="muted small">{w.days.length ? '' : 'каждый день'}</span>
      </div>
      <div className="sx-row">
        <label className="f">
          <span>С</span>
          <input className="ip sm" type="time" value={w.from} onChange={(e) => set((x) => (x.from = e.target.value))} />
        </label>
        <label className="f">
          <span>До</span>
          <input className="ip sm" type="time" value={w.to} onChange={(e) => set((x) => (x.to = e.target.value))} />
        </label>
        <label className="f">
          <span>Действует с даты</span>
          <input className="ip sm" type="date" value={w.dateFrom || ''} onChange={(e) => set((x) => (x.dateFrom = e.target.value))} />
        </label>
        <label className="f">
          <span>по дату</span>
          <input className="ip sm" type="date" value={w.dateTo || ''} onChange={(e) => set((x) => (x.dateTo = e.target.value))} />
        </label>
      </div>
    </div>
  );
}

function Pick({ menu, cats, dishes, onCats, onDishes }: { menu: Menu; cats?: string[]; dishes: string[]; onCats?: (v: string[]) => void; onDishes: (v: string[]) => void }) {
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const found = s ? menu.dishes.filter((d) => (d.ru + ' ' + d.name).toLowerCase().includes(s)).slice(0, 8) : [];
  const dn = (id: string) => menu.dishes.find((d) => d.id === id)?.ru || id;
  return (
    <div className="of-pick">
      {onCats && (
        <div className="toggles">
          {menu.cats.map((c) => (
            <button key={c.id} type="button" className={`tg ${cats!.includes(c.id) ? 'on' : ''}`} onClick={() => onCats(cats!.includes(c.id) ? cats!.filter((x) => x !== c.id) : [...cats!, c.id])}>
              {c.ru || c.name}
            </button>
          ))}
        </div>
      )}
      <div className="toggles">
        {dishes.map((id, i) => (
          <button key={id + i} type="button" className="tg on" onClick={() => onDishes(dishes.filter((_, k) => k !== i))} title="Убрать">
            {dn(id)} ×
          </button>
        ))}
      </div>
      <div className="of-find">
        <input className="ip sm" placeholder="Добавить блюдо: начните писать название" value={q} onChange={(e) => setQ(e.target.value)} />
        {found.length > 0 && (
          <div className="of-found">
            {found.map((d) => (
              <button key={d.id} type="button" onClick={() => (onDishes([...dishes, d.id]), setQ(''))}>
                {d.ru || d.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Offers({ initial, menu, usage }: { initial: Settings; menu: Menu; usage: Record<string, { n: number; amount: number }> }) {
  const { s, set, bar } = useSettingsDoc(initial);
  const [tab, setTab] = useState<'deals' | 'happy' | 'points'>('deals');
  const deals = s.deals ?? [];
  const hh = s.happyHours ?? [];
  const lo = { ...LOYALTY_DEFAULT, ...(s.loyalty || {}) };
  const upDeal = (i: number, fn: (d: Deal) => void) => {
    const next = deals.map((d) => JSON.parse(JSON.stringify(d)) as Deal);
    fn(next[i]);
    set('deals', next);
  };
  const upHH = (i: number, fn: (d: HappyHour) => void) => {
    const next = hh.map((d) => JSON.parse(JSON.stringify(d)) as HappyHour);
    fn(next[i]);
    set('happyHours', next);
  };

  return (
    <>
      <PageHead title="Акции и баллы" sub="Акции применяются сами — без промокода, на сайте и на кассе. Цены и скидки всегда считает сервер.">
        <div className="seg">
          <button className={tab === 'deals' ? 'on' : ''} onClick={() => setTab('deals')}>
            Акции · {deals.filter((d) => d.active).length}
          </button>
          <button className={tab === 'happy' ? 'on' : ''} onClick={() => setTab('happy')}>
            Счастливые часы · {hh.filter((d) => d.active).length}
          </button>
          <button className={tab === 'points' ? 'on' : ''} onClick={() => setTab('points')}>
            Баллы {lo.enabled ? '· вкл' : ''}
          </button>
        </div>
      </PageHead>

      {tab === 'deals' && (
        <>
          <div className="box">
            <h2>Новая акция</h2>
            <div className="of-kinds">
              {(Object.keys(KIND) as DealKind[]).map((k) => (
                <button key={k} className="of-kind" onClick={() => set('deals', [newDeal(k), ...deals])}>
                  <b>{KIND[k].t}</b>
                  <span>{KIND[k].hint}</span>
                </button>
              ))}
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>
              Порядок: сначала акции на блюда (каждая порция участвует в одной), потом одна самая выгодная скидка на сумму, потом промокод. За столом акции не действуют.
            </p>
          </div>
          {deals.map((d, i) => {
            const u = usage[d.id];
            return (
              <div className="box of-card" key={d.id}>
                <div className="box-head">
                  <div>
                    <span className="bd info">{KIND[d.kind].t}</span> <span className="muted small">{u ? `сработала ${u.n} раз · скидок ${money(u.amount)} сум за 90 дней` : 'ещё не срабатывала'}</span>
                  </div>
                  <div className="sx-row">
                    <button type="button" className={`tg ${d.active ? 'on' : ''}`} onClick={() => upDeal(i, (x) => (x.active = !x.active))}>
                      {d.active ? 'Действует' : 'Выключена'}
                    </button>
                    {!u && (
                      <button className="lnk red" onClick={() => set('deals', deals.filter((_, k) => k !== i))}>
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid-f">
                  <label className="f">
                    <span>Название (видят гости)</span>
                    <input className="ip" value={d.name} onChange={(e) => upDeal(i, (x) => (x.name = e.target.value))} />
                  </label>
                  <label className="f">
                    <span>По-узбекски</span>
                    <input className="ip" value={d.nameUz || ''} onChange={(e) => upDeal(i, (x) => (x.nameUz = e.target.value))} />
                  </label>
                  {d.kind === 'nplus' && (
                    <>
                      <label className="f">
                        <span>Купи, шт.</span>
                        <input className="ip num" inputMode="numeric" value={d.buy || ''} onChange={(e) => upDeal(i, (x) => (x.buy = Math.max(1, num(e.target.value))))} />
                      </label>
                      <label className="f">
                        <span>Получи ещё, шт. — со скидкой, %</span>
                        <div className="sx-row">
                          <input className="ip num" inputMode="numeric" value={d.get || ''} onChange={(e) => upDeal(i, (x) => (x.get = Math.max(1, num(e.target.value))))} />
                          <input className="ip num" inputMode="numeric" value={d.pct || ''} onChange={(e) => upDeal(i, (x) => (x.pct = Math.min(100, num(e.target.value))))} />
                        </div>
                        <small>100% — бесплатно, 50% — за полцены. Скидка идёт на самые дешёвые в группе.</small>
                      </label>
                      <div className="f full">
                        <span>На что: категории и/или отдельные блюда</span>
                        <Pick menu={menu} cats={d.cats || []} dishes={d.dishes || []} onCats={(v) => upDeal(i, (x) => (x.cats = v))} onDishes={(v) => upDeal(i, (x) => (x.dishes = v))} />
                      </div>
                    </>
                  )}
                  {d.kind === 'set' && (
                    <>
                      <div className="f full">
                        <span>Блюда в наборе (по одному каждого)</span>
                        <Pick menu={menu} dishes={d.setDishes || []} onDishes={(v) => upDeal(i, (x) => (x.setDishes = v))} />
                      </div>
                      <label className="f">
                        <span>Цена набора, сум</span>
                        <input className="ip num" inputMode="numeric" value={d.setPrice ? money(d.setPrice) : ''} onChange={(e) => upDeal(i, (x) => (x.setPrice = num(e.target.value)))} />
                        <small>
                          По меню:{' '}
                          {money((d.setDishes || []).reduce((sum, id) => {
                            const m = menu.dishes.find((x) => x.id === id);
                            return sum + (m ? (m.sizes.length ? m.sizes[0].p : m.price) : 0);
                          }, 0))}{' '}
                          сум
                        </small>
                      </label>
                    </>
                  )}
                  {d.kind === 'tiers' && (
                    <div className="f full">
                      <span>Ступени</span>
                      {(d.tiers || []).map((t, k) => (
                        <div className="sx-row" key={k}>
                          <span className="muted">от</span>
                          <input className="ip sm num" style={{ width: 130 }} inputMode="numeric" value={t.from ? money(t.from) : ''} onChange={(e) => upDeal(i, (x) => (x.tiers![k].from = num(e.target.value)))} />
                          <span className="muted">сум —</span>
                          <input className="ip sm num" style={{ width: 70 }} inputMode="numeric" value={t.pct || ''} onChange={(e) => upDeal(i, (x) => (x.tiers![k].pct = Math.min(90, num(e.target.value))))} />
                          <span className="muted">%</span>
                          <button className="lnk red" onClick={() => upDeal(i, (x) => (x.tiers = x.tiers!.filter((_, z) => z !== k)))}>
                            убрать
                          </button>
                        </div>
                      ))}
                      <button className="lnk" style={{ alignSelf: 'flex-start' }} onClick={() => upDeal(i, (x) => (x.tiers = [...(x.tiers || []), { from: 0, pct: 0 }]))}>
                        + ступень
                      </button>
                    </div>
                  )}
                  {d.kind === 'first' && (
                    <label className="f">
                      <span>Скидка, %</span>
                      <input className="ip num" inputMode="numeric" value={d.pct || ''} onChange={(e) => upDeal(i, (x) => (x.pct = Math.min(90, num(e.target.value))))} />
                    </label>
                  )}
                  <div className="f full">
                    <span>Когда действует</span>
                    <WindowFields w={d} set={(fn) => upDeal(i, fn)} />
                  </div>
                  <div className="f full">
                    <span>Где и с чем</span>
                    <div className="toggles">
                      <button type="button" className={`tg ${d.site ? 'on' : ''}`} onClick={() => upDeal(i, (x) => (x.site = !x.site))}>
                        На сайте
                      </button>
                      {d.kind !== 'first' && (
                        <button type="button" className={`tg ${d.pos ? 'on' : ''}`} onClick={() => upDeal(i, (x) => (x.pos = !x.pos))}>
                          На кассе (с собой и доставка)
                        </button>
                      )}
                      <button type="button" className={`tg ${d.withPromo ? 'on' : ''}`} onClick={() => upDeal(i, (x) => (x.withPromo = !x.withPromo))}>
                        Можно вместе с промокодом
                      </button>
                      {(d.kind === 'nplus' || d.kind === 'set') && (
                        <button type="button" className={`tg ${d.withHappy ? 'on' : ''}`} onClick={() => upDeal(i, (x) => (x.withHappy = !x.withHappy))}>
                          Вместе со счастливыми часами
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {!deals.length && (
            <div className="box">
              <div className="empty">
                <b>Акций пока нет</b>
                Выберите вид акции выше. Новая акция создаётся выключенной — проверьте и включите.
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'happy' && (
        <>
          <div className="box">
            <div className="box-head">
              <div>
                <h2>Счастливые часы</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Скидка в % по дням и часам (время Ташкента) на всё меню или категории. Действует на сайте, кассе, у официанта и за столом. На сайте видна старая цена.
                </p>
              </div>
              <button
                className="b main"
                onClick={() => set('happyHours', [{ id: uid(), name: 'Обеденные часы', pct: 15, cats: [], active: false, days: [1, 2, 3, 4, 5], from: '12:00', to: '15:00', dateFrom: '', dateTo: '' }, ...hh])}
              >
                + Счастливые часы
              </button>
            </div>
          </div>
          {hh.map((h, i) => (
            <div className="box of-card" key={h.id}>
              <div className="box-head">
                <span className="muted small">{windowText(h)}</span>
                <div className="sx-row">
                  <button type="button" className={`tg ${h.active ? 'on' : ''}`} onClick={() => upHH(i, (x) => (x.active = !x.active))}>
                    {h.active ? 'Действует' : 'Выключены'}
                  </button>
                  <button className="lnk red" onClick={() => set('happyHours', hh.filter((_, k) => k !== i))}>
                    Удалить
                  </button>
                </div>
              </div>
              <div className="grid-f">
                <label className="f">
                  <span>Название</span>
                  <input className="ip" value={h.name} onChange={(e) => upHH(i, (x) => (x.name = e.target.value))} />
                </label>
                <label className="f">
                  <span>Скидка, %</span>
                  <input className="ip num" inputMode="numeric" value={h.pct || ''} onChange={(e) => upHH(i, (x) => (x.pct = Math.min(90, num(e.target.value))))} />
                </label>
                <div className="f full">
                  <span>Категории (ничего не выбрано — всё меню)</span>
                  <div className="toggles">
                    {menu.cats.map((c) => (
                      <button key={c.id} type="button" className={`tg ${h.cats.includes(c.id) ? 'on' : ''}`} onClick={() => upHH(i, (x) => (x.cats = x.cats.includes(c.id) ? x.cats.filter((y) => y !== c.id) : [...x.cats, c.id]))}>
                        {c.ru || c.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="f full">
                  <span>Когда</span>
                  <WindowFields w={h} set={(fn) => upHH(i, fn)} />
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === 'points' && (
        <div className="box">
          <div className="box-head">
            <div>
              <h2>Баллы лояльности</h2>
              <p className="muted" style={{ margin: 0 }}>
                1 балл = 1 сум. Копятся по номеру телефона: с заказов на сайте, в Telegram и на кассе (кассир вводит номер при оплате). Начисляются, когда заказ выдан.
              </p>
            </div>
            <button type="button" className={`tg ${lo.enabled ? 'on' : ''}`} onClick={() => set('loyalty', { ...lo, enabled: !lo.enabled })}>
              {lo.enabled ? 'Включены' : 'Выключены'}
            </button>
          </div>
          <div className="grid-f">
            <label className="f">
              <span>Возвращаем баллами, % от оплаченных блюд</span>
              <input className="ip num" inputMode="numeric" value={lo.earnPct} onChange={(e) => set('loyalty', { ...lo, earnPct: Math.min(50, num(e.target.value)) })} />
              <small>Доставка и обслуживание не считаются.</small>
            </label>
            <label className="f">
              <span>Баллами можно оплатить до, % заказа</span>
              <input className="ip num" inputMode="numeric" value={lo.maxRedeemPct} onChange={(e) => set('loyalty', { ...lo, maxRedeemPct: Math.min(100, num(e.target.value)) })} />
            </label>
            <label className="f">
              <span>Бонус за первый заказ, баллов</span>
              <input className="ip num" inputMode="numeric" value={lo.welcome || ''} onChange={(e) => set('loyalty', { ...lo, welcome: num(e.target.value) })} />
            </label>
          </div>
          <p className="muted small">
            Пример: заказ на 200 000 сум при {lo.earnPct}% вернёт {money(Math.floor((200000 * lo.earnPct) / 100))} баллов. Платить баллами на сайте можно из Telegram (номер подтверждает Telegram), на кассе — по номеру телефона. Баланс гостя — в разделе «Клиенты».
          </p>
        </div>
      )}
      {bar}
    </>
  );
}
