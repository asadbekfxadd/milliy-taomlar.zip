import type { Metadata } from 'next';
import Link from 'next/link';
import { getLang } from '@/lib/lang';
import { getMenu, getSettings } from '@/lib/data';
import { fmt } from '@/lib/format';
import { windowText, type Deal } from '@/lib/offers';
import { cfgOf } from '@/lib/loyalty';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const uz = getLang() === 'uz';
  return { title: uz ? 'Aksiyalar' : 'Акции', alternates: { canonical: '/offers' } };
}

export default async function OffersPage() {
  const [st, menu] = await Promise.all([getSettings(), getMenu()]);
  const uz = getLang() === 'uz';
  const L = (a: string, b: string) => (uz ? a : b);
  const dish = (id: string) => {
    const d = menu.dishes.find((x) => x.id === id);
    return d ? (uz ? d.name : d.ru || d.name) : '';
  };
  const cat = (id: string) => {
    const c = menu.cats.find((x) => x.id === id);
    return c ? (uz ? c.name : c.ru || c.name) : '';
  };
  const deals = (st.deals || []).filter((d) => d.active && d.site);
  const hh = (st.happyHours || []).filter((h) => h.active);
  const lo = cfgOf(st);
  const what = (d: Deal) => {
    if (d.kind === 'nplus') {
      const on = [...(d.cats || []).map(cat), ...(d.dishes || []).map(dish)].filter(Boolean).join(', ');
      const gift = (d.pct ?? 100) >= 100 ? L(`${d.get} tasi bepul`, `${d.get} в подарок`) : L(`${d.get} tasiga −${d.pct}%`, `${d.get} со скидкой ${d.pct}%`);
      return L(`${d.buy} ta oling — yana ${gift}. ${on}`, `Возьмите ${d.buy} — ещё ${gift}. ${on}`);
    }
    if (d.kind === 'set') return `${(d.setDishes || []).map(dish).join(' + ')} — ${fmt(d.setPrice || 0)} ${L('soʻm', 'сум')}`;
    if (d.kind === 'tiers')
      return (d.tiers || [])
        .filter((t) => t.from && t.pct)
        .sort((a, b) => a.from - b.from)
        .map((t) => L(`${fmt(t.from)} soʻmdan — ${t.pct}%`, `от ${fmt(t.from)} сум — ${t.pct}%`))
        .join(' · ');
    return L(`Birinchi buyurtmaga −${d.pct}%`, `−${d.pct}% на первый заказ`);
  };
  const empty = !deals.length && !hh.length && !lo.enabled;
  return (
    <>
      <section className="masthead g" style={{ paddingBottom: 10 }}>
        <div className="in">
          <div className="kicker">{L('Promokodsiz', 'Без промокода')}</div>
          <h1>{L('Aksiyalar', 'Акции')}</h1>
        </div>
      </section>
      <div className="g">
        <div className="in of-list">
          {hh.map((h) => (
            <article key={h.id} className="of-item hh">
              <b className="of-pct">−{h.pct}%</b>
              <div>
                <h3>{h.name}</h3>
                <p>{h.cats.length ? h.cats.map(cat).join(', ') : L('Butun menyu', 'Всё меню')}</p>
                <small>{windowText(h, uz)}</small>
              </div>
            </article>
          ))}
          {deals.map((d) => (
            <article key={d.id} className="of-item">
              <b className="of-pct">{d.kind === 'set' ? '=' : d.kind === 'nplus' ? `${d.buy}+${d.get}` : '%'}</b>
              <div>
                <h3>{uz && d.nameUz ? d.nameUz : d.name}</h3>
                <p>{what(d)}</p>
                <small>
                  {windowText(d, uz)}
                  {d.pos ? '' : L(' · faqat saytda', ' · только на сайте')}
                </small>
              </div>
            </article>
          ))}
          {lo.enabled && (
            <article className="of-item pts">
              <b className="of-pct">{lo.earnPct}%</b>
              <div>
                <h3>{L('Ballar', 'Баллы')}</h3>
                <p>
                  {L(
                    `Har buyurtmadan ${lo.earnPct}% ball bilan qaytadi. Keyingi buyurtmaning ${lo.maxRedeemPct}% gacha ular bilan toʻlang.`,
                    `С каждого заказа ${lo.earnPct}% возвращается баллами. Оплачивайте ими до ${lo.maxRedeemPct}% следующего заказа.`,
                  )}
                </p>
                <small>{L('Ballar telefon raqamiga yigʻiladi. Telegram botimizda /bonus', 'Баллы копятся по номеру телефона. В нашем Telegram-боте — /bonus')}</small>
              </div>
            </article>
          )}
          {empty && <p className="cap">{L('Hozircha aksiyalar yoʻq.', 'Сейчас акций нет.')}</p>}
          <Link className="btn" href="/" style={{ alignSelf: 'flex-start', marginTop: 10 }}>
            {L('Menyuga', 'В меню')}
          </Link>
        </div>
      </div>
    </>
  );
}
