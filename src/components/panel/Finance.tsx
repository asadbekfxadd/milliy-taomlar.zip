'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, money, PageHead, usePanel } from './kit';

type Pnl = {
  revenue: number;
  checks: number;
  dishes: number;
  fee: number;
  service: number;
  discounts: number;
  points: number;
  tips: number;
  food: number;
  writeoff: number;
  shortage: number;
  gross: number;
  expenses: { cat: string; v: number }[];
  expTotal: number;
  net: number;
  bought: number;
  unpaidBuys: number;
  byPay: { k: string; v: number }[];
};
type Exp = { id: number; day: string; cat: string; amount: number; note: string; from: string; by: string };
const FROM: Record<string, string> = { cash: 'Из кассы', card: 'Картой', bank: 'С расчётного счёта' };
const PAY: Record<string, string> = { cash: 'Наличные', card: 'Карта', payme: 'Payme', click: 'Click' };
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const shiftM = (m: string, k: number) => {
  const [y, mm] = m.split('-').map(Number);
  return new Date(Date.UTC(y, mm - 1 + k, 1)).toISOString().slice(0, 7);
};
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

export default function Finance({ month: m0 }: { month: string }) {
  const [month, setMonth] = useState(m0);
  const [d, setD] = useState<{ list: Exp[]; pnl: Pnl; cats: string[] } | null>(null);
  const { toast } = usePanel();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
  const [f, setF] = useState({ day: today, cat: '', amount: '', note: '', from: 'cash' });
  const load = useCallback(async () => {
    try {
      setD(await api(`/api/admin/expenses?m=${month}`));
    } catch (e: any) {
      toast(e.message);
    }
  }, [month, toast]);
  useEffect(() => {
    setD(null);
    load();
  }, [load]);
  const post = async (body: Record<string, unknown>, ok: string) => {
    try {
      const r = await api('/api/admin/expenses', 'POST', body);
      toast(r?.warn || ok);
      await load();
      return true;
    } catch (e: any) {
      toast(e.message);
      return false;
    }
  };
  const [y, mm] = month.split('-').map(Number);
  const p = d?.pnl;
  return (
    <>
      <PageHead title="Деньги" sub="Сколько заработали за месяц: выручка, себестоимость проданного (по складу), списания, расходы и чистая прибыль. Расходы из кассы сразу уходят изъятием из открытой смены.">
        <div className="sx-row">
          <button className="b sm" onClick={() => setMonth(shiftM(month, -1))} aria-label="Предыдущий месяц">
            ←
          </button>
          <b style={{ minWidth: 130, textAlign: 'center' }}>
            {MONTHS[mm - 1]} {y}
          </b>
          <button className="b sm" disabled={month >= today.slice(0, 7)} onClick={() => setMonth(shiftM(month, 1))} aria-label="Следующий месяц">
            →
          </button>
        </div>
      </PageHead>
      {!p ? (
        <div className="box empty">Загружаем…</div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi">
              <span>Выручка</span>
              <b>{money(p.revenue)}</b>
              <small>{p.checks} чеков</small>
            </div>
            <div className="kpi">
              <span>Прибыль с продаж</span>
              <b>{money(p.gross)}</b>
              <small>выручка минус продукты и списания · {pct(p.gross, p.revenue)}</small>
            </div>
            <div className="kpi">
              <span>Расходы</span>
              <b>{money(p.expTotal)}</b>
              <small>аренда, зарплата, коммуналка…</small>
            </div>
            <div className={`kpi ${p.net < 0 ? 'bad' : ''}`}>
              <span>Чистая прибыль</span>
              <b>{money(p.net)}</b>
              <small>что остаётся с выручки · {pct(p.net, p.revenue)}</small>
            </div>
          </div>

          <div className="cols">
            <div className="box">
              <h2>Отчёт о прибыли</h2>
              <table className="tbl pnl">
                <tbody>
                  <tr>
                    <td>Блюда по меню</td>
                    <td className="r num">{money(p.dishes)}</td>
                  </tr>
                  {p.service > 0 && (
                    <tr>
                      <td>+ Обслуживание</td>
                      <td className="r num">{money(p.service)}</td>
                    </tr>
                  )}
                  {p.fee > 0 && (
                    <tr>
                      <td>+ Доставка</td>
                      <td className="r num">{money(p.fee)}</td>
                    </tr>
                  )}
                  {p.discounts > 0 && (
                    <tr>
                      <td>− Скидки, акции, промокоды</td>
                      <td className="r num">−{money(p.discounts)}</td>
                    </tr>
                  )}
                  {p.points > 0 && (
                    <tr>
                      <td>− Оплачено баллами</td>
                      <td className="r num">−{money(p.points)}</td>
                    </tr>
                  )}
                  <tr className="tot">
                    <td>Выручка</td>
                    <td className="r num">{money(p.revenue)}</td>
                  </tr>
                  <tr>
                    <td>
                      − Продукты на проданные блюда <span className="muted small">(по техкартам, {pct(p.food, p.revenue)})</span>
                    </td>
                    <td className="r num">−{money(p.food)}</td>
                  </tr>
                  <tr>
                    <td>− Списания</td>
                    <td className="r num">−{money(p.writeoff)}</td>
                  </tr>
                  {p.shortage !== 0 && (
                    <tr>
                      <td>{p.shortage > 0 ? '− Недостача по инвентаризации' : '+ Излишки по инвентаризации'}</td>
                      <td className="r num">{p.shortage > 0 ? '−' : '+'}{money(Math.abs(p.shortage))}</td>
                    </tr>
                  )}
                  <tr className="tot">
                    <td>Прибыль с продаж</td>
                    <td className="r num">{money(p.gross)}</td>
                  </tr>
                  {p.expenses.map((e) => (
                    <tr key={e.cat}>
                      <td>− {e.cat}</td>
                      <td className="r num">−{money(e.v)}</td>
                    </tr>
                  ))}
                  <tr className={`tot big ${p.net < 0 ? 'neg' : ''}`}>
                    <td>Чистая прибыль</td>
                    <td className="r num">{money(p.net)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="muted small">
                Чаевые официантам ({money(p.tips)}) в выручку не входят. Продукты считаются по тому, что реально ушло со склада при продаже: если у блюда нет техкарты, его продукты сюда не попадут.
              </p>
            </div>
            <div className="box">
              <h2>Деньги по способам оплаты</h2>
              <table className="tbl">
                <tbody>
                  {p.byPay.map((x) => (
                    <tr key={x.k}>
                      <td>{PAY[x.k] || x.k}</td>
                      <td className="r num">{money(x.v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h2 style={{ marginTop: 16 }}>Закупки за месяц</h2>
              <p className="num">
                Принято товара на <b>{money(p.bought)}</b> сум
                {p.unpaidBuys > 0 && (
                  <>
                    , не оплачено поставщикам <b className="bd bad">{money(p.unpaidBuys)}</b>
                  </>
                )}
                .
              </p>
              <p className="muted small">Закупка — это не расход: продукты лежат на складе и попадают в себестоимость, когда их продали или списали.</p>
            </div>
          </div>

          <div className="box">
            <div className="box-head">
              <h2>Расходы</h2>
              <button className="b sm" onClick={() => post({ action: 'copy', month }, 'Постоянные расходы скопированы из прошлого месяца')}>
                Скопировать аренду и зарплату из прошлого месяца
              </button>
            </div>
            <form
              className="exp-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await post({ action: 'add', ...f, amount: Number(f.amount.replace(/\D/g, '')) }, 'Расход записан')) setF({ ...f, amount: '', note: '' });
              }}
            >
              <input className="ip" type="date" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} aria-label="Дата" />
              <select className="ip" value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })} aria-label="Статья">
                <option value="">Статья расхода…</option>
                {d!.cats.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input className="ip num" inputMode="numeric" placeholder="Сумма" value={f.amount ? money(Number(f.amount.replace(/\D/g, ''))) : ''} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, '') })} aria-label="Сумма" />
              <input className="ip" placeholder="Комментарий" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} aria-label="Комментарий" />
              <select className="ip" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} aria-label="Откуда">
                {Object.entries(FROM).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
              <button className="b main" disabled={!f.cat || !f.amount}>
                Записать
              </button>
            </form>
            {d!.list.length ? (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Статья</th>
                      <th>Комментарий</th>
                      <th>Откуда</th>
                      <th className="r">Сумма</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {d!.list.map((e) => (
                      <tr key={e.id}>
                        <td className="num">{e.day.split('-').reverse().slice(0, 2).join('.')}</td>
                        <td>{e.cat}</td>
                        <td className="muted">
                          {e.note}
                          <span className="small"> · {e.by}</span>
                        </td>
                        <td className="muted">{FROM[e.from] || e.from}</td>
                        <td className="r num">{money(e.amount)}</td>
                        <td className="r">
                          <button className="lnk red" onClick={() => post({ action: 'delete', id: e.id }, 'Расход удалён')}>
                            удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">Расходов за месяц нет. Запишите аренду, зарплату, коммунальные — без них прибыль будет завышена.</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
