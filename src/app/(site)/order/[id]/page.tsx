import type { Metadata } from 'next';
import OrderStatus from '@/components/OrderStatus';

import { getLang } from '@/lib/lang';

export async function generateMetadata(): Promise<Metadata> {
  return { title: getLang() === 'uz' ? 'Buyurtma holati' : 'Статус заказа', robots: { index: false } };
}

export default function OrderPage({ params, searchParams }: { params: { id: string }; searchParams: { t?: string } }) {
  return <OrderStatus id={params.id} token={searchParams.t || ''} />;
}
