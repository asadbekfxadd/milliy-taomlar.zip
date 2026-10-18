import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { pageUser } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { TablesCount } from '@/components/panel/SettingsEditor';
import PrintButton from '@/components/panel/PrintButton';

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
  await pageUser('tables', '/admin/tables');
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
    <>
      <div className="phd noprint">
        <div>
          <h1>Столы и QR</h1>
          <p>У каждого стола своя ссылка. Гость прикладывает телефон к NFC-метке или наводит камеру на QR — открывается меню, и заказ приходит на этот стол: в кассу и бегунком на кухню.</p>
        </div>
        <div className="phd-act">{n > 0 && <PrintButton label="Печать карточек" />}</div>
      </div>
      <TablesCount initial={st} />
      <details className="tc-help noprint" style={{ marginTop: 14 }}>
        <summary>Как записать NFC-метки</summary>
        <ol>
          <li>
            Купите NFC-наклейки <b>NTAG213</b> или <b>NTAG215</b>. Для металлического стола нужны метки «on-metal».
          </li>
          <li>
            Установите на телефон бесплатное приложение <b>NFC Tools</b>.
          </li>
          <li>«Записать» → «Добавить запись» → URL → вставьте ссылку стола из списка ниже → «Записать» и приложите метку.</li>
          <li>Проверьте: приложите метку к телефону — должна открыться страница «Стол N». Потом метку можно заблокировать от перезаписи.</li>
          <li>Наклейте метку под карточку. QR остаётся для телефонов без NFC.</li>
        </ol>
        <p className="tc-links">
          {cards.map((c) => (
            <span key={c.no}>
              <b>{c.no}</b> {c.url}
            </span>
          ))}
        </p>
      </details>
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
              <b>Menyu va buyurtma</b>
              <span>Меню и заказ к столу: приложите телефон или наведите камеру</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
