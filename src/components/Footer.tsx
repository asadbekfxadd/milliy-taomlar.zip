import Link from 'next/link';
import type { Settings } from '@/lib/types';
import { handle } from '@/lib/format';
import Girih from './Girih';

export default function Footer({ s }: { s: Settings }) {
  const addr = [s.address, s.city].filter(Boolean).join(', ');
  return (
    <footer>
      <div className="girih-band">
        <Girih w={1600} h={120} step={120} />
      </div>
      <div className="g">
        <div className="in">
          <div className="slogan">{s.tagline}</div>
          <div className="fcols">
            {(addr || s.hours) && (
              <div>
                <h5>Где нас найти</h5>
                {addr && <p>{addr}</p>}
                {s.hours && <p style={{ marginTop: 6 }}>{s.hours}</p>}
              </div>
            )}
            <div>
              <h5>Заказы</h5>
              <p>
                {s.phone && (
                  <>
                    <span className="num" style={{ color: 'var(--cream)' }}>
                      {s.phone}
                    </span>
                    <br />
                  </>
                )}
                {[s.pickup && 'Самовывоз', s.delivery && 'Доставка'].filter(Boolean).join(' · ') || 'Ждём в зале'}
              </p>
            </div>
            {(s.instagram || s.telegram) && (
            <div>
              <h5>Соцсети</h5>
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
              <h5>Разделы</h5>
              <p>
                <Link href="/menu">Меню</Link>
                <br />
                <Link href="/story">Больше, чем еда</Link>
                <br />
                <Link href="/contacts">Контакты</Link>
              </p>
            </div>
          </div>
          <div className="legal">
            <span>
              © {new Date().getFullYear()} {s.name}
            </span>
            <a href="/staff" className="credit" rel="nofollow">Вход для персонала</a>
            <span className="credit">
              Цены в сумах · Фото блюд:{' '}
              <a href="https://unsplash.com/@arrogant_7007" target="_blank" rel="noopener">otabek xatipov</a>,{' '}
              <a href="https://unsplash.com/@alonady" target="_blank" rel="noopener">Alona D</a> / Unsplash
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
