import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { getSettings } from '@/lib/data';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

function siteUrl() {
  const env = process.env.PUBLIC_URL?.replace(/\/$/, '');
  if (env) return env;
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export default async function TablesPage() {
  const st = await getSettings();
  const base = siteUrl();
  const n = Math.max(0, Math.min(200, st.tables || 0));
  const cards = await Promise.all(
    Array.from({ length: n }, async (_, i) => {
      const url = `${base}/t/${i + 1}`;
      const svg = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1a1410', light: '#0000' } });
      return { no: i + 1, url, svg };
    }),
  );

  return (
    <div className="tc-wrap">
      <div className="tc-head noprint">
        <div>
          <h1>Карточки столов</h1>
          <p>
            У каждого стола своя ссылка. Гость прикладывает телефон к NFC-метке или наводит камеру на QR — открывается меню, и заказ приходит
            на этот стол: в кассу и бегунком на кухню.
          </p>
        </div>
        <PrintButton />
      </div>

      <details className="tc-help noprint">
        <summary>Как записать NFC-метки</summary>
        <ol>
          <li>
            Купите NFC-наклейки <b>NTAG213</b> или <b>NTAG215</b> (продаются на Uzum / в магазинах электроники). Для стола с металлом нужны метки
            «on-metal / anti-metal».
          </li>
          <li>
            На Android или iPhone установите бесплатное приложение <b>NFC Tools</b>.
          </li>
          <li>
            «Записать» → «Добавить запись» → <b>URL / URI</b> → вставьте ссылку стола из списка ниже → «Записать» и приложите метку к телефону.
          </li>
          <li>
            Проверьте: приложите метку к телефону с включённым NFC — должна открыться страница «Стол N». Потом можно заблокировать метку
            («Другое» → «Заблокировать»), чтобы её не перезаписали.
          </li>
          <li>Наклейте метку под карточку или на подставку. QR остаётся для iPhone старых моделей и телефонов без NFC.</li>
        </ol>
        <p className="tc-links">
          {cards.map((c) => (
            <span key={c.no}>
              <b>{c.no}</b> {c.url}
            </span>
          ))}
        </p>
      </details>

      {!n && <p className="noprint">В настройках админки количество столов = 0. Укажите, сколько столов в зале.</p>}

      <div className="tc-grid">
        {cards.map((c) => (
          <div key={c.no} className="tc-card">
            <div className="tc-brand">{st.name}</div>
            <div className="tc-no">
              <span>стол</span>
              <b>{c.no}</b>
            </div>
            <div className="tc-qr" dangerouslySetInnerHTML={{ __html: c.svg }} />
            <div className="tc-nfc" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 8.5a5 5 0 0 1 0 7M9.5 6a9 9 0 0 1 0 12M13 3.5a13 13 0 0 1 0 17" />
              </svg>
              NFC
            </div>
            <div className="tc-cta">
              <b>Меню и заказ</b>
              <span>Приложите телефон или наведите камеру</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
