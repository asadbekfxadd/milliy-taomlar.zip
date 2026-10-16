import type { OrderItem } from '@/lib/types';

export type StaffOrder = {
  id: string;
  no: number;
  status: 'new' | 'accepted' | 'cooking' | 'ready' | 'done' | 'cancelled';
  type: 'hall' | 'pickup' | 'delivery';
  source: 'site' | 'pos';
  tableNo: number | null;
  guests: number;
  waiter: string;
  zone: string;
  fee: number;
  address: string;
  name: string;
  phone: string;
  note: string;
  when: string;
  pay: string;
  items: OrderItem[];
  subtotal: number;
  service: number;
  total: number;
  paidWith: string;
  createdAt: string;
  payStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  etaAt: string | null;
  acceptedAt: string | null;
};

export const clock = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });

export const STATION_RU: Record<string, string> = { kitchen: 'Кухня', mangal: 'Мангал', bar: 'Бар', cashier: 'Касса' };
export const PAY_RU: Record<string, string> = { cash: 'Наличные', card: 'Карта', payme: 'Payme', click: 'Click' };
export const mins = (t: number | string) => Math.max(0, Math.floor((Date.now() - new Date(t).getTime()) / 60000));
export const placeOf = (o: StaffOrder) =>
  o.type === 'hall' ? (o.tableNo ? `Стол ${o.tableNo}` : 'Зал') : `${o.source === 'site' ? 'Онлайн · ' : ''}${o.type === 'delivery' ? 'Доставка' : 'С собой'}`;
