import type { Metadata } from 'next';
import CartView from '@/components/CartView';

import { getLang } from '@/lib/lang';

export async function generateMetadata(): Promise<Metadata> {
  return { title: getLang() === 'uz' ? 'Savat' : 'Корзина', robots: { index: false } };
}

export default function CartPage() {
  return <CartView />;
}
