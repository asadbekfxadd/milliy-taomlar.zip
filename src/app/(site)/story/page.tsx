import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/data';
import { isAdmin } from '@/lib/auth';
import { STORY } from '@/lib/defaults';
import Scene from '@/components/Scene';

export const metadata: Metadata = {
  title: 'Больше, чем еда',
  description: 'Дастархан, казан, руки мастера, чай, специи и хлеб: шесть сцен об узбекской кухне.',
  alternates: { canonical: '/story' },
};

export default async function StoryPage() {
  const s = await getSettings();
  const hint = isAdmin();
  return (
    <>
      <section className="masthead g">
        <div className="in">
          <div className="kicker">История</div>
          <h1>
            Больше,
            <br />
            <em>чем еда</em>
          </h1>
          <div className="row">
            <p className="muted" style={{ maxWidth: '52ch', margin: 0, fontSize: 18 }}>
              Шесть сцен об узбекской кухне: о столе, огне, руках, чае, специях и о том, как традиция продолжает жить сегодня.
            </p>
          </div>
        </div>
      </section>
      {STORY.map((_, i) => (
        <Scene key={i} i={i} s={s} showHint={hint} />
      ))}
      <section className="sec g">
        <div className="in" style={{ display: 'flex', justifyContent: 'center' }}>
          <Link className="btn" href="/menu">
            Открыть меню
          </Link>
        </div>
      </section>
    </>
  );
}
