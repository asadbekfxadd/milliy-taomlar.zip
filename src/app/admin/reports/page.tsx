import { Fragment } from 'react';
import Link from 'next/link';
import { pageUser } from '@/lib/auth';
import { getMenu } from '@/lib/data';
import { abcxyz, staffReport, unsold } from '@/lib/finance';
import { period } from '@/lib/analytics';

export const dynamic = 'force-dynamic';
const m = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', year: '2-digit' }) : 'не продавалось');

const ABC_HINT: Record<string, string> = {
  AX: 'Хиты, продаются ровно — держите в наличии всегда',
  AY: 'Приносят много, спрос скачет — следите за запасом',
  AZ: 'Много денег, но всплесками (банкеты, праздники)',
  BX: 'Стабильный середняк',
  BY: 'Середняк',
  BZ: 'Середняк, нестабильно',
  CX: 'Мало денег, но стабильно — может, поднять цену',
  CY: 'Слабые продажи',
  CZ: 'Кандидат на вывод из меню',
};

export default async function Reports({ searchParams }: { searchParams: { t?: string; p?: string } }) {
  await pageUser('analytics', '/admin/reports');
  const tab = ['staff', 'abc', 'unsold'].includes(searchParams.t || '') ? searchParams.t! : 'staff';
  const key = ['7', '30', '90'].includes(searchParams.p || '') ? searchParams.p! : '30';
  const p = period(key);
  const menu = await getMenu();
  const Tabs = (
    <div className="phd">
      <div>
        <h1>Отчёты</h1>
        <p>Кто сколько продал, какие блюда тянут выручку, а какие стоят в меню зря.</p>
      </div>
      <div className="phd-act" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <div className="seg">
          {[
            ['staff', 'Сотрудники'],
            ['abc', 'ABC × XYZ'],
            ['unsold', 'Не продаются'],
          ].map(([k, l]) => (
            <Link key={k} href={`/admin/reports?t=${k}&p=${key}`} className={tab === k ? 'on' : ''}>
              {l}
            </Link>
          ))}
        </div>
        <div className="seg">
          {[
            ['7', '7 дней'],
            ['30', '30 дней'],
            ['90', '90 дней'],
          ].map(([k, l]) => (
            <Link key={k} href={`/admin/reports?t=${tab}&p=${k}`} className={key === k ? 'on' : ''}>
              {l}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  if (tab === 'staff') {
    const s = await staffReport(p.from, p.to);
    const names = [...new Set([...s.waiters.map((x) => x.k), ...s.cashiers.map((x) => x.k), ...Object.keys(s.voids)])];
    return (
      <>
        {Tabs}
        <div className="box">
          <h2>Официанты</h2>
          {s.waiters.length ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Сотрудник</th>
                    <th className="r">Чеков</th>
                    <th className="r">Гостей</th>
                    <th className="r">Выручка</th>
                    <th className="r">Средний чек</th>
                    <th className="r">На гостя</th>
                    <th className="r">Чаевые</th>
                    <th className="r">Отмены</th>
                  </tr>
                </thead>
                <tbody>
                  {s.waiters.map((w) => (
                    <tr key={w.k}>
                      <td>
                        <b>{w.k}</b>
                      </td>
                      <td className="r num">{w.n}</td>
                      <td className="r num">{w.guests}</td>
                      <td className="r num">{m(w.v)}</td>
                      <td className="r num">{m(w.v / Math.max(1, w.n))}</td>
                      <td className="r num">{w.guests ? m(w.v / w.guests) : '—'}</td>
                      <td className="r num">{m(w.tips)}</td>
                      <td className="r num">{s.voids[w.k] ? <span className="bd bad">{s.voids[w.k].n} · {m(s.voids[w.k].v)}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">За период нет чеков с официантами</div>
          )}
        </div>
        <div className="cols">
          <div className="box">
            <h2>Кассиры — приняли оплату</h2>
            {s.cashiers.length ? (
              <table className="tbl">
                <tbody>
                  {s.cashiers.map((c) => (
                    <tr key={c.k}>
                      <td>{c.k}</td>
                      <td className="r num">{c.n} чек.</td>
                      <td className="r num">{m(c.v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">Нет оплат</div>
            )}
          </div>
          <div className="box">
            <h2>Курьеры</h2>
            {s.couriers.length ? (
              <table className="tbl">
                <tbody>
                  {s.couriers.map((c) => (
                    <tr key={c.k}>
                      <td>{c.k}</td>
                      <td className="r num">{c.n} дост.</td>
                      <td className="r num">{m(c.v)}</td>
                      <td className="r num muted">{c.mins ? `в пути ~${c.mins} мин` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty">Доставок курьерами не было</div>
            )}
          </div>
        </div>
        {names.some((k) => s.voids[k]) && (
          <p className="muted small">Отмены — позиции, снятые после отправки на кухню (кто разрешил). Подробно — в журнале действий.</p>
        )}
      </>
    );
  }

  if (tab === 'abc') {
    const weeks = key === '7' ? 4 : key === '90' ? 13 : 8;
    const rows = await abcxyz(weeks, menu);
    const cell = (a: string, x: string) => rows.filter((r) => r.abc === a && r.xyz === x);
    return (
      <>
        {Tabs}
        <div className="box">
          <h2>Матрица за {weeks} недель</h2>
          <p className="muted">
            ABC — сколько денег приносит блюдо: A — первые 80% выручки, B — следующие 15%, C — остальное. XYZ — насколько ровно продаётся по неделям: X — стабильно, Y — с колебаниями, Z — всплесками.
          </p>
          <div className="abc">
            <span />
            {['X', 'Y', 'Z'].map((x) => (
              <b key={x}>{x}</b>
            ))}
            {['A', 'B', 'C'].map((a) => (
              <Fragment key={a}>
                <b>{a}</b>
                {['X', 'Y', 'Z'].map((x) => (
                  <div key={a + x} className={`abc-c ${a}${x}`}>
                    <small>{ABC_HINT[a + x]}</small>
                    {cell(a, x).map((r) => (
                      <span key={r.id}>{r.name}</span>
                    ))}
                    {!cell(a, x).length && <em>—</em>}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
        <div className="box">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Блюдо</th>
                  <th>Группа</th>
                  <th className="r">Продано</th>
                  <th className="r">Выручка</th>
                  <th className="r">Доля</th>
                  <th className="r">Разброс по неделям</th>
                  <th>По неделям</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>
                      <span className={`bd ${r.abc === 'A' ? 'ok' : r.abc === 'B' ? 'info' : 'new'}`}>
                        {r.abc}
                        {r.xyz}
                      </span>
                    </td>
                    <td className="r num">{r.qty}</td>
                    <td className="r num">{m(r.v)}</td>
                    <td className="r num">{(r.share * 100).toFixed(1)}%</td>
                    <td className="r num">{r.cv > 300 ? '—' : `${r.cv}%`}</td>
                    <td className="spark">
                      {r.weekly.map((q, i) => (
                        <i key={i} style={{ height: `${Math.max(2, (q / Math.max(1, ...r.weekly)) * 22)}px` }} title={`${q} шт.`} />
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <div className="empty">Продаж за период нет</div>}
        </div>
      </>
    );
  }

  const rows = await unsold(p.days, menu);
  return (
    <>
      {Tabs}
      <div className="box">
        <h2>Не продавались за {p.label}</h2>
        <p className="muted">Блюда с ценой, которые никто не заказал. Проверьте: нет ли фото, понятное ли название, не завышена ли цена — или уберите из меню.</p>
        {rows.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Блюдо</th>
                  <th>Категория</th>
                  <th>Последняя продажа</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.name}</b> {!r.available && <span className="bd">стоп-лист</span>}
                    </td>
                    <td className="muted">{r.cat}</td>
                    <td className="num">{day(r.last)}</td>
                    <td className="r">
                      <Link className="b sm" href={`/admin/menu?q=${encodeURIComponent(r.name)}`}>
                        В меню
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <b>Все блюда продавались</b>
          </div>
        )}
      </div>
    </>
  );
}
