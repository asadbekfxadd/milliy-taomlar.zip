/* Roles and permissions. Shared by server checks and the sidebar (client-safe: no secrets here). */

export type Role = 'owner' | 'manager' | 'cashier' | 'waiter' | 'cook' | 'storekeeper' | 'courier';

export type Perm =
  | 'dashboard'
  | 'orders'
  | 'menu'
  | 'promos'
  | 'stock'
  | 'recipes'
  | 'customers'
  | 'analytics'
  | 'finance'
  | 'employees'
  | 'tables'
  | 'settings'
  | 'audit'
  | 'pos'
  | 'waiter'
  | 'kitchen'
  | 'print'
  | 'void'
  | 'courier'
  | 'dispatch';

export const ROLES: Record<Role, { name: string; hint: string; perms: Perm[]; home: string }> = {
  owner: {
    name: 'Владелец',
    hint: 'Всё, включая сотрудников и журнал действий',
    perms: ['dashboard', 'orders', 'menu', 'promos', 'stock', 'recipes', 'customers', 'analytics', 'finance', 'employees', 'tables', 'settings', 'audit', 'pos', 'waiter', 'kitchen', 'print', 'void', 'dispatch'],
    home: '/admin',
  },
  manager: {
    name: 'Управляющий',
    hint: 'Меню, склад, заказы, отчёты, касса; может отменять позиции',
    perms: ['dashboard', 'orders', 'menu', 'promos', 'stock', 'recipes', 'customers', 'analytics', 'finance', 'tables', 'settings', 'pos', 'waiter', 'kitchen', 'print', 'void', 'dispatch'],
    home: '/admin',
  },
  cashier: {
    name: 'Кассир',
    hint: 'Касса и смена, столы, заказы с сайта, курьеры',
    perms: ['pos', 'waiter', 'orders', 'print', 'dispatch'],
    home: '/pos',
  },
  waiter: {
    name: 'Официант',
    hint: 'Столы и заказы с телефона, отправка на кухню',
    perms: ['waiter', 'print'],
    home: '/waiter',
  },
  cook: {
    name: 'Повар',
    hint: 'Экран кухни по цехам',
    perms: ['kitchen', 'print'],
    home: '/kitchen',
  },
  storekeeper: {
    name: 'Кладовщик',
    hint: 'Склад: приход, списания, инвентаризация',
    perms: ['stock'],
    home: '/admin/stock',
  },
  courier: {
    name: 'Курьер',
    hint: 'Свои доставки с телефона: адрес, звонок гостю, «Забрал» и «Доставил»',
    perms: ['courier'],
    home: '/courier',
  },
};

export const ROLE_IDS = Object.keys(ROLES) as Role[];
export const can = (role: string | undefined, p: Perm) => Boolean(role && (ROLES as Record<string, { perms: Perm[] }>)[role]?.perms.includes(p));

export type NavItem = { group: string; label: string; href: string; perm: Perm; icon: string };

/** Sidebar, in the order a restaurant manager thinks about the day. */
export const NAV: NavItem[] = [
  { group: 'Работа', label: 'Обзор дня', href: '/admin', perm: 'dashboard', icon: 'home' },
  { group: 'Работа', label: 'Касса', href: '/pos', perm: 'pos', icon: 'cash' },
  { group: 'Работа', label: 'Официант', href: '/waiter', perm: 'waiter', icon: 'tray' },
  { group: 'Работа', label: 'Кухня', href: '/kitchen', perm: 'kitchen', icon: 'fire' },
  { group: 'Работа', label: 'Доставка', href: '/dispatch', perm: 'dispatch', icon: 'scooter' },
  { group: 'Работа', label: 'Заказы', href: '/admin/orders', perm: 'orders', icon: 'list' },
  { group: 'Работа', label: 'Бронь столов', href: '/admin/reservations', perm: 'tables', icon: 'calendar' },
  { group: 'Меню', label: 'Блюда', href: '/admin/menu', perm: 'menu', icon: 'dish' },
  { group: 'Меню', label: 'Категории и цеха', href: '/admin/categories', perm: 'menu', icon: 'folder' },
  { group: 'Меню', label: 'Сеты', href: '/admin/combos', perm: 'menu', icon: 'stack' },
  { group: 'Склад', label: 'Остатки', href: '/admin/stock', perm: 'stock', icon: 'box' },
  { group: 'Склад', label: 'Техкарты', href: '/admin/recipes', perm: 'recipes', icon: 'recipe' },
  { group: 'Гости', label: 'Клиенты', href: '/admin/customers', perm: 'customers', icon: 'users' },
  { group: 'Гости', label: 'Промокоды', href: '/admin/promos', perm: 'promos', icon: 'tag' },
  { group: 'Отчёты', label: 'Аналитика', href: '/admin/analytics', perm: 'analytics', icon: 'chart' },
  { group: 'Отчёты', label: 'Смены и касса', href: '/admin/shifts', perm: 'finance', icon: 'wallet' },
  { group: 'Настройки', label: 'Сотрудники', href: '/admin/employees', perm: 'employees', icon: 'badge' },
  { group: 'Настройки', label: 'Столы и QR', href: '/admin/tables', perm: 'tables', icon: 'qr' },
  { group: 'Настройки', label: 'Ресторан и сайт', href: '/admin/settings', perm: 'settings', icon: 'gear' },
  { group: 'Настройки', label: 'Интеграции', href: '/admin/integrations', perm: 'settings', icon: 'plug' },
  { group: 'Настройки', label: 'Журнал действий', href: '/admin/audit', perm: 'audit', icon: 'clock' },
];

export const STATIONS: Record<string, string> = { kitchen: 'Кухня', mangal: 'Мангал', bar: 'Бар', cashier: 'Касса' };
export const PAY_RU: Record<string, string> = { cash: 'Наличные', card: 'Карта', payme: 'Payme', click: 'Click' };
export const STATUS_RU: Record<string, string> = { new: 'Новый', accepted: 'Принят', cooking: 'Готовится', ready: 'Готов', done: 'Закрыт', cancelled: 'Отменён' };
export const TYPE_RU: Record<string, string> = { hall: 'Зал', pickup: 'С собой', delivery: 'Доставка' };
