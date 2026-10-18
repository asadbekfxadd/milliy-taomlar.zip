import Link from 'next/link';
import type { Settings } from '@/lib/types';
import { handle } from '@/lib/format';
import { PHOTO_CREDITS } from '@/lib/defaults';
import { siteText, translate, type Lang } from '@/lib/i18n';
import Girih from './Girih';

export default function Footer({ s, lang }: { s: Settings; lang: Lang }) {
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k);
  const x = siteText(s, lang);
  const addr = [x.address, x.city].filter(Boolean).join(', ');
  return (
    <footer>
      <div className="girih-band">
        <Girih w={1600} h={120} step={120} />
      </div>
      <div className="g">
        <div className="in">
          <div className="slogan">{x.tagline}</div>
          <div className="fcols">
            {(addr || x.hours) && (
              <div>
                <h2 className="fh">{t('f.where')}</h2>
                {addr && <p>{addr}</p>}
                {x.hours && <p style={{ marginTop: 6 }}>{x.hours}</p>}
              </div>
            )}
            <div>
              <h2 className="fh">{t('f.orders')}</h2>
              <p>
                {s.phone && (
                  <>
                    <a className="num" href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} style={{ color: 'var(--cream)', textDecoration: 'none' }}>
                      {s.phone}
                    </a>
                    <br />
                  </>
                )}
                {s.phone2 && (
                  <>
                    <a className="num" href={`tel:${s.phone2.replace(/[^\d+]/g, '')}`} style={{ color: 'var(--cream)', textDecoration: 'none' }}>
                      {s.phone2}
                    </a>
                    <br />
                  </>
                )}
                {[s.pickup && translate(lang, 'cart.pickup'), s.delivery && translate(lang, 'cart.delivery')].filter(Boolean).join(' · ') || t('f.hall')}
              </p>
            </div>
            {(s.instagram || s.telegram) && (
              <div>
                <h2 className="fh">{t('f.social')}</h2>
                <p>
                  {s.instagram && (
                    <>
                      <a href={`https://instagram.com/${handle(s.instagram)}`} target="_blank" rel="noopener">
                        Instagram {s.instagram}
                      </a>
                      <br />
                    </>
                  )}
                  {s.telegram && (
                    <a href={`https://t.me/${handle(s.telegram)}`} target="_blank" rel="noopener">
                      Telegram {s.telegram}
                    </a>
                  )}
                </p>
              </div>
            )}
            <div>
              <h2 className="fh">{t('f.sections')}</h2>
              <p>
                <Link href="/menu">{t('nav.menu')}</Link>
                <br />
                <Link href="/story">{t('nav.story')}</Link>
                <br />
                <Link href="/contacts">{t('nav.contacts')}</Link>
              </p>
            </div>
          </div>
          <div className="legal">
            <span>
              © {new Date().getFullYear()} {s.name}
            </span>
            <a href="/login" className="credit" rel="nofollow">
              {t('f.staff')}
            </a>
            <span className="credit">
              {t('f.prices')} · {t('f.photos')}:{' '}
              {PHOTO_CREDITS.map(([n, u], i) => (
                <span key={n}>
                  {i ? ', ' : ''}
                  <a href={u} target="_blank" rel="noopener">
                    {n}
                  </a>
                </span>
              ))}{' '}
              / Unsplash ·{' '}
              <a href="https://www.pexels.com" target="_blank" rel="noopener">
                Pexels
              </a>{' '}
              · {t('f.art')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
