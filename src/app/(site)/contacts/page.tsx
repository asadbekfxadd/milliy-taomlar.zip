import type { Metadata } from 'next';
import { getSettings } from '@/lib/data';
import { isAdmin } from '@/lib/auth';
import { orderSummaryText } from '@/lib/copy';
import { fmt, handle } from '@/lib/format';
import CopyButton from '@/components/CopyButton';

export const metadata: Metadata = { title: 'Контакты', description: 'Адрес, телефон, часы работы и зоны доставки.', alternates: { canonical: '/contacts' } };

export default async function ContactsPage() {
  const s = await getSettings();
  const ed = isAdmin();
  const miss = (t: string) => (ed ? <span className="muted">{t}: заполните в «Управление → Настройки»</span> : null);
  const addr = [s.address, s.city].filter(Boolean).join(', ');
  const mapHref = s.mapUrl || `https://yandex.uz/maps/?text=${encodeURIComponent(addr || 'Янгиюль')}`;
  return (
    <>
      <section className="masthead g">
        <div className="in">
          <div className="kicker">Контакты</div>
          <h1>
            Ждём
            <br />
            <em>в гости</em>
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
                  <CopyButton text={s.phone} />
                  <a className="copy" href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} style={{ textDecoration: 'none' }}>
                    Позвонить
                  </a>
                </div>
              </>
            ) : ed ? (
              <>
                <div className="big-phone" style={{ color: 'var(--dim)' }}>
                  Телефон
                </div>
                {miss('Номер не указан')}
              </>
            ) : null}
            <dl className="kv" style={{ marginTop: 36 }}>
              <dt>Адрес</dt>
              <dd>{s.address ? addr : <>{s.city} {miss('точный адрес')}</>}</dd>
              {(s.hours || ed) && (
                <>
                  <dt>Часы</dt>
                  <dd>{s.hours || miss('часы работы')}</dd>
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
              <dt>Заказы</dt>
              <dd>{orderSummaryText(s)}</dd>
            </dl>
            {s.delivery && s.zones.length > 0 && (
              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table className="zones num">
                  <thead>
                    <tr>
                      <th>Зона доставки</th>
                      <th>Доставка</th>
                      <th>Мин. заказ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.zones.map((z, i) => (
                      <tr key={i}>
                        <td>{z.name}</td>
                        <td>{fmt(z.fee)} сум</td>
                        <td>{fmt(z.min)} сум</td>
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
                <div className="kicker">Карта</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 600, marginTop: 8 }}>Построить маршрут</div>
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
