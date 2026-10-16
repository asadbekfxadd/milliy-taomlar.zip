import { getMenu, getSettings } from '@/lib/data';
import { providers } from '@/lib/payments';
import Providers from '@/components/Providers';
import { Header, Reveal, TabBar } from '@/components/Chrome';
import Footer from '@/components/Footer';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [menu, settings] = await Promise.all([getMenu(), getSettings()]);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: settings.name,
    servesCuisine: 'Uzbek',
    address: settings.address ? { '@type': 'PostalAddress', streetAddress: settings.address, addressLocality: settings.city, addressCountry: 'UZ' } : undefined,
    telephone: settings.phone || undefined,
    openingHours: settings.hours || undefined,
    priceRange: 'UZS',
  };
  return (
    <>
      <a href="#main" className="sr" style={{ position: 'absolute' }}>
        К содержимому
      </a>
      <Providers menu={menu} settings={settings} online={providers()}>
        <Header />
        <main id="main" tabIndex={-1} className="enter">
          {children}
        </main>
        <Footer s={settings} />
        <TabBar />
        <Reveal />
      </Providers>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </>
  );
}
