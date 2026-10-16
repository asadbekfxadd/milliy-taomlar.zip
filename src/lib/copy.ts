import type { Settings } from './types';
import { fmt } from './format';

export function orderSummaryText(st: Settings) {
  const p: string[] = [];
  if (st.pickup) p.push(`Самовывоз: заказ будет готов примерно через ${st.prepTime}.`);
  if (st.delivery && st.zones.length) {
    const n = st.zones.length;
    p.push(
      `Доставка по ${n} ${n === 1 ? 'зоне' : 'зонам'}, от ${fmt(Math.min(...st.zones.map((z) => +z.fee)))} сум, минимальный заказ от ${fmt(Math.min(...st.zones.map((z) => +z.min)))} сум.`,
    );
  }
  if (!p.length) p.push('Сейчас мы принимаем гостей только в зале.');
  return p.join(' ');
}
