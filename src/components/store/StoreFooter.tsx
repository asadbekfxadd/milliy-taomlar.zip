import Link from 'next/link';
import type { Settings } from '@/lib/types';
import { handle } from '@/lib/format';
import { PHOTO_CREDITS } from '@/lib/defaults';
import { siteText, type Lang } from '@/lib/i18n';

export default function StoreFooter({ s, lang }: { s: Settings; lang: Lang }) {
  const L = (uz: string, ru: string) => (lang === 'uz' ? uz : ru);
  const x = siteText(s, lang);
  const addr = [x.address, x.city].filter(Boolean).join(', ');
  return (
    <footer className="s-foot">
      <div className="s-wrap">
        <div>
          <Link href="/" className="s-logo" style={{ marginBottom: 12 }}>
            <i>M</i>
            <b>{s.name}</b>
          </Link>
          <p>{x.tagline}</p>
        </div>
        <div>
          <h4>{L('Buyurtma', 'Заказ')}</h4>
          {s.phone && (
            <a className="tel num" href={`tel:${s.phone.replace(/[^\d+]/g, '')}`}>
              {s.phone}
            </a>
          )}
          {s.phone2 && (
            <a className="num" href={`tel:${s.phone2.replace(/[^\d+]/g, '')}`}>
              {s.phone2}
            </a>
          )}
          <p>{[s.delivery && L('Yetkazib berish', 'Доставка'), s.pickup && L('Olib ketish', 'Самовывоз')].filter(Boolean).join(' · ')}</p>
        </div>
        <div>
          <h4>{L('Manzil', 'Адрес')}</h4>
          {addr && <p>{addr}</p>}
          {x.hours && <p>{x.hours}</p>}
          <Link href="/contacts">{L('Xaritada koʻrish', 'Показать на карте')}</Link>
        </div>
        <div>
          <h4>{L('Boʻlimlar', 'Разделы')}</h4>
          <Link href="/">{L('Menyu', 'Меню')}</Link>
          <Link href="/story">{L('Biz haqimizda', 'О нас')}</Link>
          <Link href="/contacts">{L('Aloqa', 'Контакты')}</Link>
          {s.instagram && (
            <a href={`https://instagram.com/${handle(s.instagram)}`} target="_blank" rel="noopener">
              Instagram
            </a>
          )}
          {s.telegram && (
            <a href={`https://t.me/${handle(s.telegram)}`} target="_blank" rel="noopener">
              Telegram
            </a>
          )}
        </div>
        <div className="legal">
          <span>
            © {new Date().getFullYear()} {s.name}
          </span>
          <span>
            {L('Foto', 'Фото')}:{' '}
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
            </a>
          </span>
          <a href="/login" rel="nofollow">
            {L('Xodimlar uchun', 'Для сотрудников')}
          </a>
        </div>
      </div>
    </footer>
  );
}
