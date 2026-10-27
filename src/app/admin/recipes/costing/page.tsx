import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageUser } from '@/lib/auth';
import { getMenu, getSettings } from '@/lib/data';
import { costing } from '@/lib/finance';
import { q } from '@/lib/db';
import PrintButton from '@/components/panel/PrintButton';

export const dynamic = 'force-dynamic';
const m = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
const k3 = (n: number) => (Math.round(n * 1000) / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 3 });

/** Калькуляционная карта: gross and net per product, cost, price, margin; plus a share of last month's expenses per portion. */
export default async function Costing({ searchParams }: { searchParams: { dish?: string } }) {
  await pageUser('recipes', '/admin/recipes');
  const [menu, st] = await Promise.all([getMenu(), getSettings()]);
  const c = await costing(menu, searchParams.dish || '');
  if (!c) notFound();
  // overhead: last 30 days of expenses over portions sold in that time
  const [e, s] = await Promise.all([
    q(`SELECT COALESCE(sum(amount),0)::bigint AS v FROM expenses WHERE day > (now() AT TIME ZONE 'Asia/Tashkent')::date - 30`),
    q(`SELECT COALESCE(sum((l->>'qty')::int),0)::int AS n FROM orders o, jsonb_array_elements(o.items) l WHERE o.status = 'done' AND l->'void' IS NULL AND o.updated_at > now() - interval '30 days'`),
  ]);
  const overhead = s.rows[0].n ? Number(e.rows[0].v) / s.rows[0].n : 0;
  const date = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent' });
  return (
    <div className="costing">
      <div className="noprint sx-row" style={{ marginBottom: 12 }}>
        <Link className="b sm" href="/admin/recipes">
          ← Техкарты
        </Link>
        <PrintButton />
      </div>
      <div className="box">
        <div className="box-head">
          <div>
            <div className="muted small">
              {st.name} · калькуляционная карта · {date}
            </div>
            <h1 style={{ margin: '4px 0' }}>{c.dish.name}</h1>
            <div className="muted">{c.dish.cat}</div>
          </div>
        </div>
        {c.portions.map((p) => {
          const full = p.cost + overhead;
          return (
            <div key={p.si} style={{ marginTop: 16 }}>
              {p.label && (
                <h2>
                  {p.label} {p.w ? <span className="muted">· {p.w}</span> : null}
                </h2>
              )}
              {p.hasRecipe ? (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Продукт</th>
                      <th className="r">Брутто</th>
                      <th className="r">Выход</th>
                      <th className="r">Нетто</th>
                      <th className="r">Цена за ед.</th>
                      <th className="r">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.lines.map((l, i) => (
                      <tr key={i}>
                        <td>{l.name}</td>
                        <td className="r num">
                          {k3(l.gross)} {l.unit}
                        </td>
                        <td className="r num muted">{l.yield}%</td>
                        <td className="r num">
                          {k3(l.net)} {l.unit}
                        </td>
                        <td className="r num">{m(l.price)}</td>
                        <td className="r num">{m(l.sum)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5}>
                        <b>Себестоимость продуктов</b>
                      </td>
                      <td className="r num">
                        <b>{m(p.cost)}</b>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5}>+ Накладные расходы на порцию (расходы за 30 дней ÷ проданные порции)</td>
                      <td className="r num">{m(overhead)}</td>
                    </tr>
                    <tr>
                      <td colSpan={5}>
                        <b>Полная себестоимость</b>
                      </td>
                      <td className="r num">
                        <b>{m(full)}</b>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5}>Цена в меню</td>
                      <td className="r num">{p.price ? m(p.price) : '—'}</td>
                    </tr>
                    {p.price > 0 && (
                      <>
                        <tr>
                          <td colSpan={5}>Наценка на продукты · доля продуктов в цене</td>
                          <td className="r num">
                            {p.cost ? `${Math.round(((p.price - p.cost) / p.cost) * 100)}%` : '—'} · {Math.round((p.cost / p.price) * 100)}%
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={5}>
                            <b>Прибыль с порции после всех расходов</b>
                          </td>
                          <td className={`r num ${p.price - full < 0 ? 'neg' : ''}`}>
                            <b>{m(p.price - full)}</b>
                          </td>
                        </tr>
                      </>
                    )}
                  </tfoot>
                </table>
              ) : (
                <div className="empty">Техкарты нет — составьте её в разделе «Техкарты».</div>
              )}
            </div>
          );
        })}
        <p className="muted small" style={{ marginTop: 12 }}>
          Цены продуктов — средние по складу на сегодня. Брутто = нетто ÷ выход.
        </p>
      </div>
    </div>
  );
}
