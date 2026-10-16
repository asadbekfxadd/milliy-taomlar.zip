import { STORY } from '@/lib/defaults';
import type { Settings } from '@/lib/types';
import DishArt from './DishArt';

export default function Scene({ i, s, showHint }: { i: number; s: Settings; showHint?: boolean }) {
  const sc = STORY[i];
  const own = s.story?.[i];
  return (
    <section className={`scene ${i % 2 ? 'rev' : ''} ${s.storyPhotos?.[i] ? '' : 'textonly'}`}>
      {s.storyPhotos?.[i] && <DishArt art={sc.art} photo={s.storyPhotos[i]} label={sc.t} />}
      <div className="txt rv">
        <div className="no">Больше, чем еда · {String(i + 1).padStart(2, '0')} / 06</div>
        <h2>{sc.t}</h2>
        <p>{sc.p}</p>
        {own ? (
          <p style={{ marginTop: 18, color: 'var(--cream)' }}>{own}</p>
        ) : showHint ? (
          <div className="ph-note">
            <b>Место для вашей истории.</b> Расскажите, как это устроено именно у вас: «Управление → Настройки». Гости эту подсказку не видят.
          </div>
        ) : null}
      </div>
    </section>
  );
}
