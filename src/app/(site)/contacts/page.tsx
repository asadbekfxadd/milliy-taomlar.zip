import type { Metadata } from 'next';
import { getSettings } from '@/lib/data';
import { isAdmin } from '@/lib/auth';
import { getLang } from '@/lib/lang';
import { fmt, handle } from '@/lib/format';
import { prepRange, siteText, translate, zoneName, type Key } from '@/lib/i18n';
import CopyButton from '@/components/CopyButton';

export async function generateMetadata(): Promise<Metadata> {
  const uz = getLang() === 'uz';
  return {
    title: uz ? 'Aloqa' : 'Контакты',
    description: uz ? 'Manzil, telefon, ish vaqti va yetkazish hududlari.' : 'Адрес, телефон, часы работы и зоны доставки.',
    alternates: { canonical: '/contacts' },
  };
}

export default async function ContactsPage() {
  const s = await getSettings();
  const lang = getLang();
  const t = (k: Key, v?: Record<string, string | number>) => translate(lang, k, v);
  const x = siteText(s, lang);
  const ed = isAdmin();
  const miss = (txt: string) => (ed ? <span className="muted">{txt}: заполните в «Управление → Настройки»</span> : null);
  const addr = [x.address, x.city].filter(Boolean).join(', ');
  const mapHref = s.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent(addr || 'Янгиюль')}`;
  const parts: string[] = [];
  if (s.pickup) parts.push(t('band.pickup', { t: prepRange(s) }));
  if (s.delivery && s.zones.length) {
    const n = s.zones.length;
    parts.push(t('band.delivery', { n, zones: n === 1 ? t('band.zone1') : t('band.zones'), f: fmt(Math.min(...s.zones.map((z) => +z.fee))), m: fmt(Math.min(...s.zones.map((z) => +z.min))) }));
  }
  if (!parts.length) parts.push(t('band.hallOnly'));
  return (
    <>
      <section className="masthead g">
        <div className="in">
          <div className="kicker">{t('ct.kicker')}</div>
          <h1>
            {t('ct.h1')}
            <br />
            <em>{t('ct.h2')}</em>
          </h1>
        </div>
      </section>
      <div className="g">
        <div className="in ct">
          <div>
            {s.phone ? (
              <>
                <div className="big-phone num">{s.phone}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                  <CopyButton text={s.phone} label={t('ct.copy')} doneLabel={t('ct.copied')} />
                  <a className="copy" href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} style={{ textDecoration: 'none' }}>
                    {t('ct.call')}
                  </a>
                </div>
              </>
            ) : ed ? (
              miss('Номер не указан')
            ) : null}
            <dl className="kv" style={{ marginTop: 36 }}>
              <dt>{t('ct.address')}</dt>
              <dd>{x.address ? addr : <>{x.city} {miss('точный адрес')}</>}</dd>
              {(x.hours || ed) && (
                <>
                  <dt>{t('ct.hours')}</dt>
                  <dd>{x.hours || miss('часы работы')}</dd>
                </>
              )}
              {(s.instagram || ed) && (
                <>
                  <dt>Instagram</dt>
                  <dd>
                    {s.instagram ? (
                      <a href={`https://instagram.com/${handle(s.instagram)}`} target="_blank" rel="noopener">
                        {s.instagram}
                      </a>
                    ) : (
                      miss('аккаунт')
                    )}
                  </dd>
                </>
              )}
              {(s.telegram || ed) && (
                <>
                  <dt>Telegram</dt>
                  <dd>
                    {s.telegram ? (
                      <a href={`https://t.me/${handle(s.telegram)}`} target="_blank" rel="noopener">
                        {s.telegram}
                      </a>
                    ) : (
                      miss('канал или аккаунт')
                    )}
                  </dd>
                </>
              )}
              <dt>{t('ct.orders')}</dt>
              <dd>{parts.join(' ')}</dd>
            </dl>
            {s.delivery && s.zones.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table className="zones num">
                  <thead>
                    <tr>
                      <th>{t('ct.zone')}</th>
                      <th>{t('ct.fee')}</th>
                      <th>{t('ct.min')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.zones.map((z, i) => (
                      <tr key={i}>
                        <td>{zoneName(z, lang)}</td>
                        <td>
                          {fmt(z.fee)} {t('sum')}
                        </td>
                        <td>
                          {fmt(z.min)} {t('sum')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <a className="mapcard" href={mapHref} target="_blank" rel="noopener">
              <div>
                <div className="kicker">{t('ct.map')}</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 600, marginTop: 8 }}>{t('ct.route')}</div>
                <div className="cap" style={{ marginTop: 6 }}>
                  {addr}
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
