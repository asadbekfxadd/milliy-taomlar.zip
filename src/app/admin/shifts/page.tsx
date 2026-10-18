import Link from 'next/link';
import { pageUser } from '@/lib/auth';
import { buildReport, currentShift, getShift, listShifts, reportRows, type Shift } from '@/lib/shifts';
import { period, split, summary } from '@/lib/analytics';
import { PAY_RU } from '@/lib/rbac';

export const dynamic = 'force-dynamic';
const m = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');
const t = (iso: string) => new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default async function ShiftsPage({ searchParams }: { searchParams: { id?: string } }) {
  await pageUser('finance', '/admin/shifts');
  const [list, cur, month] = await Promise.all([listShifts(60), currentShift(), summary(period('30'))]);
  const pay = await split(period('30'), 'pay');
  const pick: Shift | null = searchParams.id ? await getShift(Number(searchParams.id)) : cur || list[0] || null;
  const rep = pick ? pick.report || (await buildReport(pick)) : null;
  const closedList = list.filter((s) => s.closedAt && s.report);
  const shortage = closedList.reduce((s, x) => s + Math.min(0, (x.countedCash ?? 0) - x.report!.expectedCash), 0);

  return (
    <>
      <div className="phd">
        <div>
          <h1>Смены и касса</h1>
          <p>Каждая смена — от открытия до закрытия кассы: выручка по способам оплаты, чаевые, внесения и изъятия, расхождение наличных.</p>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span>Выручка за 30 дней</span>
          <b>{m(month.revenue)}</b>
          <small>{month.checks} чеков · средний {m(month.avg)}</small>
        </div>
        {pay.slice(0, 3).map((p) => (
          <div className="kpi" key={p.k}>
            <span>{PAY_RU[p.k] || p.k}</span>
            <b>{m(p.v)}</b>
            <small>{month.revenue ? Math.round((p.v / month.revenue) * 100) : 0}% выручки</small>
          </div>
        ))}
        <div className={`kpi ${shortage < 0 ? 'bad' : ''}`}>
          <span>Недостачи за последние смены</span>
          <b>{m(Math.abs(shortage))}</b>
          <small>сум, по закрытым сменам ниже</small>
        </div>
      </div>

      <div className="cols">
        <div className="box">
          <h2>Смены</h2>
          {list.length ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Открыта</th>
                    <th className="r">Выручка</th>
                    <th className="r">Наличные: разница</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => {
                    const d = s.report && s.countedCash !== null ? s.countedCash - s.report.expectedCash : null;
                    return (
                      <tr key={s.id} style={pick?.id === s.id ? { background: 'var(--soft)' } : undefined}>
                        <td>
                          <Link className="lnk" href={`/admin/shifts?id=${s.id}`}>
                            {s.id}
                          </Link>
                        </td>
                        <td>
                          {t(s.openedAt)} <span className="muted small">· {s.openedBy}</span>
                          {!s.closedAt && <span className="bd ok" style={{ marginLeft: 6 }}>идёт</span>}
                        </td>
                        <td className="r num">{s.report ? m(s.report.revenue) : '—'}</td>
                        <td className="r num">{d === null ? '—' : d === 0 ? <span className="bd ok">сходится</span> : <span className={`bd ${d < 0 ? 'bad' : 'new'}`}>{d > 0 ? '+' : '−'}{m(Math.abs(d))}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              <b>Смен ещё не было</b>
              Кассир открывает смену на экране «Касса».
            </div>
          )}
        </div>

        <div className="box">
          {pick && rep ? (
            <>
              <div className="box-head">
                <h2>
                  Смена № {pick.id} {pick.closedAt ? '' : '· идёт сейчас'}
                </h2>
                <span className="muted small">
                  {t(pick.openedAt)} — {pick.closedAt ? t(pick.closedAt) : 'идёт'}
                </span>
              </div>
              <p className="muted small" style={{ marginTop: 0 }}>
                Открыл {pick.openedBy}
                {pick.closedBy ? `, закрыл ${pick.closedBy}` : ''}
              </p>
              <div className="rep">
                {reportRows(pick, rep).map(([a, b, bold], i) =>
                  a === '-' ? (
                    <div key={i} style={{ borderBottom: '1px solid var(--line2)', padding: 0, margin: '4px 0' }} />
                  ) : (
                    <div key={i} className={bold ? 't' : ''}>
                      <span className={a.startsWith('  ') ? 'muted' : ''}>{a.trim()}</span>
                      <span className="num">{b}</span>
                    </div>
                  ),
                )}
              </div>
              {rep.moves.length > 0 && (
                <>
                  <h2 style={{ marginTop: 16 }}>Внесения и изъятия</h2>
                  <table className="tbl">
                    <tbody>
                      {rep.moves.map((mv, i) => (
                        <tr key={i}>
                          <td className="muted num">{t(mv.at)}</td>
                          <td>
                            {mv.kind === 'in' ? 'Внесение' : 'Изъятие'} · {mv.by}
                            {mv.note && <div className="muted small">{mv.note}</div>}
                          </td>
                          <td className="r num">
                            {mv.kind === 'in' ? '+' : '−'}
                            {m(mv.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          ) : (
            <div className="empty">
              <b>Смена не открыта</b>
              Выберите смену в списке слева.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
