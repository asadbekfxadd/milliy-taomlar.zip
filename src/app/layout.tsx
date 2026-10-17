import type { Metadata, Viewport } from 'next';
import { Cormorant, Onest, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { getSettings } from '@/lib/data';
import { getLang } from '@/lib/lang';

const display = Cormorant({ subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'], weight: ['500', '600', '700'], style: ['normal', 'italic'], variable: '--f-display', display: 'swap' });
const ui = Onest({ subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'], weight: ['400', '500', '600', '700'], variable: '--f-ui', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], weight: ['400', '500'], variable: '--f-mono', display: 'swap' });

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const base = process.env.PUBLIC_URL || 'http://localhost:3000';
  const uz = getLang() === 'uz';
  const title = uz ? `${s.name} — haqiqiy mazza, haqiqiy milliy taʼm` : `${s.name} — настоящий вкус узбекской кухни`;
  const description = uz
    ? `Koʻmirdagi shashlik, brizol, lagʻmon va oʻzbek milliy taomlari Yangiyoʻlda. Onlayn buyurtma, olib ketish va yetkazib berish.`
    : `Шашлык на углях, бризоль, лагман и узбекская кухня в Янгиюле. Заказ онлайн, самовывоз и доставка.`;
  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s · ${s.name}` },
    description,
    openGraph: { title, description, type: 'website', locale: uz ? 'uz_UZ' : 'ru_RU', siteName: s.name, images: [{ url: '/og.jpg', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/og.jpg'] },
    alternates: { canonical: '/', languages: { uz: '/?lang=uz', ru: '/?lang=ru' } },
  };
}

export const viewport: Viewport = { themeColor: '#140E0B', viewportFit: 'cover', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLang()} className={`${display.variable} ${ui.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
