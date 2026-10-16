import type { Metadata } from 'next';
import OrderStatus from '@/components/OrderStatus';

export const metadata: Metadata = { title: 'Статус заказа', robots: { index: false } };

export default function OrderPage({ params, searchParams }: { params: { id: string }; searchParams: { t?: string } }) {
  return <OrderStatus id={params.id} token={searchParams.t || ''} />;
}
