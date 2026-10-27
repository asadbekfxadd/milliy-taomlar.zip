import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getUser } from '@/lib/auth';
import { saveDoc } from '@/lib/db';
import { getSettings } from '@/lib/data';
import { settingsSchema } from '@/lib/schemas';
import { audit } from '@/lib/audit';
import { can, type Perm } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

/* Settings are one document, edited from several pages. Each page sends only its own fields;
   the permission depends on what is being changed. */
const FIELD_PERM: Record<string, Perm> = { promos: 'promos', catStations: 'menu', tables: 'tables', bookingEnabled: 'tables', bookingMaxGuests: 'tables', deals: 'promos', happyHours: 'promos', loyalty: 'promos' };
const LABEL: Record<string, string> = {
  promos: 'промокоды', catStations: 'цеха категорий', tables: 'число столов', servicePct: 'обслуживание %', printGuestChecks: 'печать чеков', bookingEnabled: 'бронь на сайте', helpVideo: 'видео-инструкция', deals: 'акции', happyHours: 'счастливые часы', loyalty: 'баллы', bookingMaxGuests: 'макс. гостей в брони',
  autoAcceptOnline: 'автоприём онлайн-заказов', ordersPaused: 'пауза онлайн-заказов', openFrom: 'часы приёма', openTo: 'часы приёма', closedDays: 'рабочие дни',
  zones: 'зоны доставки', pickup: 'самовывоз', delivery: 'доставка', pay: 'способы оплаты', paper: 'ширина ленты', prepMinutes: 'время готовки',
  deliveryMinutes: 'время доставки', story: 'история', storyPhotos: 'фото истории', name: 'название', phone: 'телефон', phone2: 'телефон 2', address: 'адрес',
};

export async function PATCH(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Войдите заново' }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Пустой запрос' }, { status: 400 });
  const keys = Object.keys(body);
  const denied = keys.find((k) => !can(user.role, FIELD_PERM[k] || 'settings'));
  if (denied) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  const cur = await getSettings();
  const p = settingsSchema.safeParse({ ...cur, ...body });
  if (!p.success) return NextResponse.json({ error: 'Проверьте поле: ' + p.error.issues[0]?.path.join('.') + ' — ' + p.error.issues[0]?.message }, { status: 400 });
  await saveDoc('settings', p.data);
  await audit(user, 'Настройки сохранены', [...new Set(keys.map((k) => LABEL[k] || k))].join(', '));
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true });
}
