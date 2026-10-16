import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/data';
import { isAdmin } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { translate } from '@/lib/i18n';
import { STORY } from '@/lib/defaults';
import Scene from '@/components/Scene';

export async function generateMetadata(): Promise<Metadata> {
  const uz = getLang() === 'uz';
  return {
    title: uz ? 'Taomdan ham koʻproq' : 'Больше, чем еда',
    description: uz ? 'Dasturxon, mangal, usta qoʻllari, choy, ziravorlar va non: oʻzbek oshxonasi haqida olti sahna.' : 'Дастархан, мангал, руки мастера, чай, специи и хлеб: шесть сцен об узбекской кухне.',
    alternates: { canonical: '/story' },
  };
}

export default async function StoryPage() {
  const s = await getSettings();
  const lang = getLang();
  const hint = isAdmin();
  return (
    <>
      <section className="masthead g">
        <div className="in">
          <div className="kicker">{translate(lang, 'st.kicker')}</div>
          <h1>
            {translate(lang, 'st.h1')}
            <br />
            <em>{translate(lang, 'st.h2')}</em>
          </h1>
          <div className="row">
            <p className="muted" style={{ maxWidth: '52ch', margin: 0, fontSize: 18 }}>
              {translate(lang, 'st.lead')}
            </p>
          </div>
        </div>
      </section>
      {STORY.map((_, i) => (
        <Scene key={i} i={i} s={s} lang={lang} showHint={hint} />
      ))}
      <section className="sec g">
        <div className="in" style={{ display: 'flex', justifyContent: 'center' }}>
          <Link className="btn" href="/menu">
            {translate(lang, 'st.open')}
          </Link>
        </div>
      </section>
    </>
  );
}
