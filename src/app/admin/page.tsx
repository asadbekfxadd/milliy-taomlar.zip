import Link from 'next/link';
import { pageUser } from '@/lib/auth';
import { q } from '@/lib/db';
import { getMenu } from '@/lib/data';
import { basePrice } from '@/lib/pricing';
import { byDay, dishes, period, summary } from '@/lib/analytics';
import { currentShift } from '@/lib/shifts';
import { listIngredients } from '@/lib/stock';
import { can } from '@/lib/rbac';
import { Bars } from '@/components/panel/charts';
import Guide, { type Step } from '@/components/panel/Guide';
import { getSettings } from '@/lib/data';

export const dynamic = 'force-dynamic';
const m = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');

export default async function Dashboard() {
  const u = await pageUser('dashboard', '/admin');
  const today = period('today');
  const week = period('7');
  const [menu, s, days, top, shift, ings, open, audit] = await Promise.all([
    getMenu(),
    summary(today),
    byDay(week),
    getMenu().then((mm) => dishes(today, mm)),
    currentShift(),
    listIngredients(),
    q(`SELECT type, source, status, pay_status, table_no, created_at, total FROM orders WHERE status NOT IN ('done','cancelled') AND created_at > now() - interval '1 day'`),
    can(u.role, 'audit') ? q(`SELECT * FROM audit_log ORDER BY id DESC LIMIT 6`) : Promise.resolve({ rows: [] as any[] }),
  ]);
  const [st, setup] = await Promise.all([
    getSettings(),
    q(`SELECT (SELECT count(*) FROM employees WHERE active)::int AS emp, (SELECT count(*) FROM recipes)::int AS rec, (SELECT count(*) FROM shifts)::int AS sh,
              (SELECT count(*) FROM suppliers)::int AS sup`),
  ]);
  const listed = menu.dishes.filter((d) => menu.cats.some((c) => c.id === d.cat) && !d.hidden);
  const noPrice = listed.filter((d) => basePrice(d) <= 0);
  const stop = listed.filter((d) => !d.available);
  const low = ings.filter((i) => i.min > 0 && i.stock <= i.min);
  const tables = open.rows.filter((o) => o.type === 'hall' && o.source === 'pos' && Number(o.total) > 0).length;
  const newOnline = open.rows.filter((o) => o.source === 'site' && o.status === 'new' && !['pending', 'failed'].includes(o.pay_status)).length;
  const stale = open.rows.filter((o) => Date.now() - new Date(o.created_at).getTime() > 3 * 3600_000 && Number(o.total) > 0).length;
  const d0 = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent', weekday: 'long', day: 'numeric', month: 'long' });
  const dateLabel = d0.charAt(0).toUpperCase() + d0.slice(1);

  const todo: { t: string; d: string; href: string; tone: 'bad' | 'new' }[] = [];
  if (!shift) todo.push({ t: 'Смена кассы не открыта', d: 'Оплату на кассе можно принять только в открытой смене.', href: '/pos', tone: 'new' });
  if (newOnline) todo.push({ t: `Новые заказы с сайта: ${newOnline}`, d: 'Ждут, когда кассир примет их и отправит на кухню.', href: '/pos', tone: 'bad' });
  if (noPrice.length) todo.push({ t: `Блюда без цены: ${noPrice.length}`, d: 'Гости видят «цена уточняется» и не могут их заказать.', href: '/admin/menu?f=noprice', tone: 'new' });
  if (low.length) todo.push({ t: `Заканчиваются продукты: ${low.length}`, d: low.slice(0, 4).map((i) => i.name).join(', ') + (low.length > 4 ? '…' : ''), href: '/admin/stock?f=low', tone: 'bad' });
  if (stale) todo.push({ t: `Чеки открыты больше 3 часов: ${stale}`, d: 'Проверьте, не забыли ли их закрыть.', href: '/pos', tone: 'new' });
  if (stop.length) todo.push({ t: `В стоп-листе: ${stop.length}`, d: stop.slice(0, 4).map((d) => d.ru || d.name).join(', ') + (stop.length > 4 ? '…' : ''), href: '/admin/menu?f=stop', tone: 'new' });

  const x = setup.rows[0];
  const steps: Step[] = [
    { t: 'Добавьте сотрудников', d: 'Кассир, официанты, повар, курьер — у каждого свой PIN и права.', href: '/admin/employees', done: x.emp > 0 },
    { t: 'Проставьте цены в меню', d: noPrice.length ? `Без цены: ${noPrice.length} блюд. Их нельзя заказать.` : 'Цены есть у всех блюд.', href: '/admin/menu?f=noprice', done: noPrice.length === 0 },
    { t: 'Укажите столы', d: 'Число столов и QR-наклейки для заказа со стола.', href: '/admin/tables', done: (st.tables || 0) > 0 },
    { t: 'Зоны доставки и часы работы', d: 'Цена доставки, минимальный заказ, «бесплатно от».', href: '/admin/settings', done: (st.zones || []).length > 0 && Boolean(st.openFrom) },
    { t: 'Заведите продукты на склад', d: 'Мясо, овощи, мука, напитки — с остатком и ценой.', href: '/admin/stock', done: ings.length > 0 },
    { t: 'Составьте техкарты', d: 'Тогда склад списывается сам, а отчёты считают себестоимость.', href: '/admin/recipes', done: x.rec > 0 },
    { t: 'Добавьте поставщиков', d: 'Для автозаказа и учёта долгов.', href: '/admin/stock', done: x.sup > 0 },
    { t: 'Подключите Telegram', d: 'Заказы в чат, уведомления гостям, бот с меню и баллами.', href: '/admin/integrations', done: Boolean(process.env.TELEGRAM_BOT_TOKEN) },
    { t: 'Откройте первую смену', d: 'Касса → «Открыть смену». Дальше продажи пойдут в отчёты.', href: '/pos', done: x.sh > 0 },
  ];

  return (
    <>
      <div className="phd">
        <div>
          <h1>{dateLabel}</h1>
          <p>{shift ? `Смена № ${shift.id} открыта, кассир ${shift.openedBy}.` : 'Смена кассы ещё не открыта.'}</p>
        </div>
        <div className="phd-act">
          <Link className="b main" href="/pos">
            Открыть кассу
          </Link>
        </div>
      </div>

      {can(u.role, 'settings') && <Guide steps={steps} video={st.helpVideo || ''} />}

      <div className="kpis">
        <div className="kpi">
          <span>Выручка сегодня</span>
          <b>{m(s.revenue)}</b>
          <small>сум</small>
        </div>
        <div className="kpi">
          <span>Чеков</span>
          <b>{s.checks}</b>
          <small>средний {m(s.avg)} сум</small>
        </div>
        <div className="kpi">
          <span>Гостей в зале</span>
          <b>{s.guests}</b>
          <small>занято столов сейчас: {tables}</small>
        </div>
        <Link href="/pos" className={`kpi ${newOnline ? 'alert' : ''}`}>
          <span>Новые с сайта</span>
          <b>{newOnline}</b>
          <small>{newOnline ? 'ждут кассира' : 'всё принято'}</small>
        </Link>
      </div>

      <div className="cols">
        <div className="box">
          <div className="box-head">
            <h2>Выручка за 7 дней</h2>
            <Link className="lnk" href="/admin/analytics">
              Подробнее
            </Link>
          </div>
          <Bars data={days.map((d) => ({ label: d.d, v: d.v }))} />
        </div>
        <div className="box">
          <h2>Что требует внимания</h2>
          {todo.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {todo.map((x) => (
                <Link key={x.t} href={x.href} className="kpi" style={{ padding: '10px 14px' }}>
                  <span className={`bd ${x.tone}`}>{x.t}</span>
                  <small style={{ display: 'block', marginTop: 4 }}>{x.d}</small>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">
              <b>Всё в порядке</b>
              Нет открытых проблем.
            </div>
          )}
        </div>
      </div>

      <div className="cols" style={{ marginTop: 14 }}>
        <div className="box">
          <h2>Что продаётся сегодня</h2>
          {top.length ? (
            <div style={{ marginTop: 12 }}>
              {top.slice(0, 8).map((d) => (
                <div className="hbar" key={d.id} style={{ ['--w' as string]: `${Math.max(4, (d.sum / top[0].sum) * 100)}%` }}>
                  <span>
                    {d.name} <span className="muted">× {d.qty}</span>
                  </span>
                  <b className="num">{m(d.sum)}</b>
                  <i />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <b>Продаж сегодня ещё нет</b>
              Первый закрытый чек появится здесь.
            </div>
          )}
        </div>
        {can(u.role, 'audit') && (
          <div className="box">
            <div className="box-head">
              <h2>Последние действия</h2>
              <Link className="lnk" href="/admin/audit">
                Весь журнал
              </Link>
            </div>
            <table className="tbl">
              <tbody>
                {audit.rows.map((a: any) => (
                  <tr key={a.id}>
                    <td className="muted num" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(a.at).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <b>{a.who}</b> · {a.action}
                      {a.details && <div className="muted small">{a.details}</div>}
                    </td>
                  </tr>
                ))}
                {!audit.rows.length && (
                  <tr>
                    <td className="muted">Пока пусто</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
