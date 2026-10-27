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
  waiterId: string;
  tips: number;
  cashier: string;
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
  discount?: number;
  promo?: string;
  total: number;
  paidWith: string;
  createdAt: string;
  payStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  etaAt: string | null;
  acceptedAt: string | null;
  courierId: string;
  deals?: { id: string; name: string; amount: number }[];
  dealDiscount?: number;
  pointsUsed?: number;
  courier: string;
  pickedAt: string | null;
  deliveredAt: string | null;
};

export const clock = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });

export { STATIONS as STATION_RU, PAY_RU } from '@/lib/rbac';
export const mins = (t: number | string) => Math.max(0, Math.floor((Date.now() - new Date(t).getTime()) / 60000));
/** "12 мин", "2 ч 05 мин", "3 дн" — how long a check has been open */
export const ago = (t: number | string) => {
  const m = mins(t);
  if (m < 90) return `${m} мин`;
  if (m < 48 * 60) return `${Math.floor(m / 60)} ч ${String(m % 60).padStart(2, '0')} мин`;
  return `${Math.floor(m / 1440)} дн`;
};
export const placeOf = (o: StaffOrder) =>
  o.type === 'hall' ? (o.tableNo ? `Стол ${o.tableNo}` : 'Зал') : `${o.source === 'site' ? 'Онлайн · ' : ''}${o.type === 'delivery' ? 'Доставка' : 'С собой'}`;
