import Link from 'next/link';
import { getMenu, getSettings } from '@/lib/data';
import { isAdmin } from '@/lib/auth';
import { orderSummaryText } from '@/lib/copy';
import Hero from '@/components/Hero';
import LiveGastronomy from '@/components/LiveGastronomy';
import { DishObj } from '@/components/Dish';
import Scene from '@/components/Scene';

const SPREAD = [
  ['sp-a', 'r4'],
  ['sp-b', ''],
  ['sp-c', 'wide'],
  ['sp-d', 'r4'],
  ['sp-e', 'wide'],
];

export default async function Home() {
  const [menu, s] = await Promise.all([getMenu(), getSettings()]);
  const visible = menu.dishes.filter((d) => menu.cats.some((c) => c.id === d.cat));
  const hero = visible.find((d) => d.art === 'plov') ?? visible[0];
  const feat = visible.filter((d) => d.featured).slice(0, 5);

  return (
    <>
      <Hero s={s} dish={hero} />
      <LiveGastronomy />

      <section className="sec g">
        <div className="in">
          <div className="head rv">
            <h2>
              Блюда, ради <em>которых</em> возвращаются
            </h2>
            <p>Выбор шефа и самые заказываемые блюда. Нажмите на фото, чтобы увидеть состав, размеры порций и добавки.</p>
          </div>
          <div className="spread">
            {feat.length ? (
              feat.map((d, i) => <DishObj key={d.id} d={d} className={`${SPREAD[i][0]} rv`} ph={SPREAD[i][1]} />)
            ) : (
              <p className="muted">Отметьте блюда «На главной» в управлении меню.</p>
            )}
          </div>
          <div style={{ marginTop: 56, display: 'flex', justifyContent: 'center' }}>
            <Link className="btn ghost" href="/menu">
              Всё меню
            </Link>
          </div>
        </div>
      </section>

      <Scene i={0} s={s} showHint={isAdmin()} />
      <section className="g" style={{ paddingBlock: '0 20px' }}>
        <div className="in" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link className="btn ghost" href="/story">
            Больше, чем еда
          </Link>
        </div>
      </section>

      <section className="sec g">
        <div className="in">
          <div className="head rv">
            <h2>
              С собой <em>или</em> домой
            </h2>
            <p>{orderSummaryText(s)}</p>
          </div>
          <div className="ctas" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn" href="/menu">
              Собрать заказ
            </Link>
            <Link className="btn ghost" href="/contacts">
              Зоны доставки
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
