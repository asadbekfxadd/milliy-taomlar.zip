import Link from 'next/link';
import { pageUser } from '@/lib/auth';
import { getMenu } from '@/lib/data';
import { byDay, byHour, dishes, period, split, summary } from '@/lib/analytics';
import { PAY_RU, TYPE_RU } from '@/lib/rbac';
import { Bars } from '@/components/panel/charts';

export const dynamic = 'force-dynamic';
const m = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');

function Split({ rows, label, total }: { rows: { k: string; v: number; n: number }[]; label: (k: string) => string; total: number }) {
  if (!rows.length) return <div className="empty">Нет данных</div>;
  return (
    <div style={{ marginTop: 10 }}>
      {rows.map((r) => (
        <div className="hbar" key={r.k} style={{ ['--w' as string]: `${total ? Math.max(3, (r.v / total) * 100) : 0}%` }}>
          <span>
            {label(r.k)} <span className="muted">· {r.n} чек.</span>
          </span>
          <b className="num">
            {m(r.v)} <span className="muted small">{total ? Math.round((r.v / total) * 100) : 0}%</span>
          </b>
          <i />
        </div>
      ))}
    </div>
  );
}

export default async function Analytics({ searchParams }: { searchParams: { p?: string } }) {
  await pageUser('analytics', '/admin/analytics');
  const key = ['today', '7', '30', '90'].includes(searchParams.p || '') ? searchParams.p! : '7';
  const p = period(key);
  const menu = await getMenu();
  const [s, days, hours, types, pays, waiters, sold] = await Promise.all([summary(p), byDay(p), byHour(p), split(p, 'type'), split(p, 'pay'), split(p, 'waiter'), dishes(p, menu)]);
  const withCost = sold.filter((d) => d.cost !== null);
  const costSum = withCost.reduce((a, d) => a + (d.cost || 0), 0);
  const costRev = withCost.reduce((a, d) => a + d.sum, 0);
  const cats = menu.cats
    .map((c) => ({ k: c.id, name: c.ru || c.name, v: sold.filter((d) => d.cat === c.id).reduce((a, d) => a + d.sum, 0), n: sold.filter((d) => d.cat === c.id).reduce((a, d) => a + d.qty, 0) }))
    .filter((c) => c.v > 0)
    .sort((a, b) => b.v - a.v);
  const dishesTotal = sold.reduce((a, d) => a + d.sum, 0);
  const notSold = menu.dishes.filter((d) => d.available && !d.hidden && menu.cats.some((c) => c.id === d.cat) && !sold.some((x) => x.id === d.id) && (d.price > 0 || d.sizes.some((z) => z.p > 0)));

  return (
    <>
      <div className="phd">
        <div>
          <h1>Аналитика</h1>
          <p>По закрытым чекам. Себестоимость считается по техкартам и текущим ценам продуктов на складе.</p>
        </div>
        <div className="seg">
          {[
            ['today', 'Сегодня'],
            ['7', '7 дней'],
            ['30', '30 дней'],
            ['90', '90 дней'],
          ].map(([k, l]) => (
            <Link key={k} href={`/admin/analytics?p=${k}`} className={key === k ? 'on' : ''}>
              {l}
            </Link>
          ))}
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span>Выручка</span>
          <b>{m(s.revenue)}</b>
          <small>сум</small>
        </div>
        <div className="kpi">
          <span>Чеков</span>
          <b>{s.checks}</b>
          <small>средний {m(s.avg)}</small>
        </div>
        <div className="kpi">
          <span>Гостей в зале</span>
          <b>{s.guests}</b>
          <small>{s.guests ? `на гостя ${m(s.revenue / Math.max(1, s.guests))}` : ' '}</small>
        </div>
        <div className="kpi">
          <span>Себестоимость блюд</span>
          <b>{costRev ? `${Math.round((costSum / costRev) * 100)}%` : '—'}</b>
          <small>{costRev ? `по ${withCost.length} блюдам с техкартой` : 'заполните техкарты'}</small>
        </div>
        <div className="kpi">
          <span>Скидки · чаевые</span>
          <b>{m(s.discount)}</b>
          <small>чаевые {m(s.tips)}</small>
        </div>
        <div className={`kpi ${s.cancelled ? 'alert' : ''}`}>
          <span>Отменённые чеки</span>
          <b>{s.cancelled}</b>
          <small>причины — в журнале действий</small>
        </div>
      </div>

      <div className="cols">
        <div className="box">
          <h2>{key === 'today' ? 'Выручка по часам' : 'Выручка по дням'}</h2>
          {key === 'today' ? (
            <Bars data={hours.map((h) => ({ label: `${h.h}:00`, v: h.v, n: h.n }))} labels="raw" />
          ) : (
            <Bars data={days.map((d) => ({ label: d.d, v: d.v, n: d.n }))} />
          )}
        </div>
        <div className="box">
          <h2>Когда приходят гости</h2>
          <p>Чеки по часу оплаты — для графика смен и закупок.</p>
          <Bars data={hours.map((h) => ({ label: `${h.h}:00`, v: h.n }))} unit="чек." labels="raw" height={140} />
        </div>
      </div>

      <div className="cols three" style={{ marginTop: 14 }}>
        <div className="box">
          <h2>Где заказывают</h2>
          <Split rows={types} total={s.revenue} label={(k) => TYPE_RU[k] || k} />
        </div>
        <div className="box">
          <h2>Как платят</h2>
          <Split rows={pays} total={s.revenue} label={(k) => PAY_RU[k] || k} />
        </div>
        <div className="box">
          <h2>Категории</h2>
          <Split rows={cats.map((c) => ({ k: c.name, v: c.v, n: c.n }))} total={dishesTotal} label={(k) => k} />
        </div>
      </div>

      <div className="box" style={{ marginTop: 14 }}>
        <h2>Официанты</h2>
        {waiters.filter((w) => w.k).length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Официант</th>
                  <th className="r">Чеков</th>
                  <th className="r">Гостей</th>
                  <th className="r">Выручка</th>
                  <th className="r">Средний чек</th>
                  <th className="r">Чаевые</th>
                </tr>
              </thead>
              <tbody>
                {waiters
                  .filter((w) => w.k)
                  .map((w) => (
                    <tr key={w.k}>
                      <td>{w.k}</td>
                      <td className="r num">{w.n}</td>
                      <td className="r num">{w.guests}</td>
                      <td className="r num">{m(w.v)}</td>
                      <td className="r num">{m(w.v / Math.max(1, w.n))}</td>
                      <td className="r num">{m(w.tips)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">Чеков зала с официантами за период нет</div>
        )}
      </div>

      <div className="box">
        <h2>Блюда</h2>
        <p>Маржа = выручка блюда минус себестоимость по техкарте. Пусто — у блюда ещё нет техкарты.</p>
        {sold.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Блюдо</th>
                  <th className="r">Продано</th>
                  <th className="r">Выручка</th>
                  <th className="r">Доля</th>
                  <th className="r">Себестоимость</th>
                  <th className="r">Маржа</th>
                </tr>
              </thead>
              <tbody>
                {sold.map((d) => (
                  <tr key={d.id}>
                    <td>{d.name}</td>
                    <td className="r num">{d.qty}</td>
                    <td className="r num">{m(d.sum)}</td>
                    <td className="r num muted">{dishesTotal ? ((d.sum / dishesTotal) * 100).toFixed(1) : 0}%</td>
                    <td className="r num">{d.cost === null ? '—' : m(d.cost)}</td>
                    <td className="r num">{d.cost === null ? '—' : `${m(d.sum - d.cost)} · ${Math.round(((d.sum - d.cost) / Math.max(1, d.sum)) * 100)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>Продаж за период нет</b>
          </div>
        )}
        {notSold.length > 0 && sold.length > 0 && (
          <p className="muted small" style={{ marginBottom: 0 }}>
            Ни разу не продано за период ({notSold.length}): {notSold.slice(0, 20).map((d) => d.ru || d.name).join(', ')}
            {notSold.length > 20 ? '…' : ''}
          </p>
        )}
      </div>
    </>
  );
}
