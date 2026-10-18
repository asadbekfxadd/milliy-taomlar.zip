import { STORY } from '@/lib/defaults';
import type { Settings } from '@/lib/types';
import DishArt from './DishArt';
import { translate, type Lang } from '@/lib/i18n';

export default function Scene({ i, s, lang, showHint }: { i: number; s: Settings; lang: Lang; showHint?: boolean }) {
  const sc = STORY[i];
  const own = s.story?.[i];
  return (
    <section className={`scene ${i % 2 ? 'rev' : ''} ${s.storyPhotos?.[i] ? '' : 'textonly'}`}>
      {s.storyPhotos?.[i] && <DishArt art={sc.art} photo={s.storyPhotos[i]} label={lang === 'uz' ? sc.tUz : sc.t} sizes="(max-width: 1020px) 100vw, 50vw" />}
      <div className="txt rv">
        <div className="no">
          {translate(lang, 'nav.story')} · {String(i + 1).padStart(2, '0')} / 06
        </div>
        <h2>{lang === 'uz' ? sc.tUz : sc.t}</h2>
        <p>{lang === 'uz' ? sc.pUz : sc.p}</p>
        {own ? (
          <p style={{ marginTop: 18, color: 'var(--cream)' }}>{own}</p>
        ) : showHint ? (
          <div className="ph-note">
            <b>Место для вашей истории.</b> Расскажите, как это устроено именно у вас: «Управление → Ресторан и сайт». Гости эту подсказку не видят.
          </div>
        ) : null}
      </div>
    </section>
  );
}
