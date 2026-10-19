import type { Metadata } from 'next';
import Store from '@/components/store/Store';
import { getLang } from '@/lib/lang';

export async function generateMetadata(): Promise<Metadata> {
  const uz = getLang() === 'uz';
  return {
    title: uz ? 'Menyu' : 'Меню',
    description: uz
      ? 'Shashlik va gril, brizol, milliy taomlar, somsa, manti, shoʻrvalar, salatlar, ichimliklar va desertlar. Narxlar soʻmda, tarkibi va allergenlari.'
      : 'Шашлык и гриль, бризоль, национальные блюда, самса, манты, супы, салаты, напитки и десерты. Цены в сумах, состав и аллергены.',
    alternates: { canonical: '/menu', languages: { uz: '/menu?lang=uz', ru: '/menu?lang=ru' } },
  };
}

export default function MenuPage() {
  return <Store />;
}
