import type { Metadata } from 'next';
import MenuView from '@/components/MenuView';

export const metadata: Metadata = {
  title: 'Меню',
  description: 'Плов, национальные блюда, самса, шашлык, супы, салаты, напитки и десерты. Цены в сумах, состав и аллергены.',
  alternates: { canonical: '/menu' },
};

export default function MenuPage() {
  return <MenuView />;
}
