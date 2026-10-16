/* Texts are stored in Russian (`label`, `desc`, …) with optional Uzbek twins (`uz`, `descUz`, …). */
export type Size = { label: string; w: string; p: number; uz?: string };
export type Extra = { label: string; p: number; uz?: string };
export type Dish = {
  id: string;
  cat: string;
  name: string;
  ru: string;
  desc: string;
  descUz?: string;
  ingr: string[];
  ingrUz?: string[];
  allergens: string[];
  weight: string;
  price: number;
  tags: string[];
  art: string;
  photo: string;
  sizes: Size[];
  extras: Extra[];
  available: boolean;
  featured: boolean;
  /** "Bugun nima yeymiz?" moods: hearty, light, family, friends, quick */
  moods?: string[];
  /** grill dishes sold per skewer: the card shows a skewer counter */
  skewer?: boolean;
  /** not shown to guests at all (e.g. a dish the restaurant may not serve) */
  hidden?: boolean;
};
export type Cat = { id: string; name: string; ru: string; theme?: string };
export type ComboItem = { id: string; si: number; qty: number };
export type Combo = { id: string; name: string; ru: string; descUz?: string; desc?: string; items: ComboItem[]; active?: boolean };
export type Menu = { cats: Cat[]; dishes: Dish[]; combos?: Combo[]; v?: number };
export type Zone = { name: string; fee: number; min: number; uz?: string };
export type Promo = { code: string; pct: number; fixed: number; min: number; active: boolean };
export type Settings = {
  name: string;
  tagline: string;
  phone: string;
  address: string;
  city: string;
  hours: string;
  mapUrl: string;
  instagram: string;
  telegram: string;
  pickup: boolean;
  delivery: boolean;
  prepTime: string;
  minOrder: number;
  zones: Zone[];
  pay: { cash: boolean; card: boolean };
  story: string[];
  storyPhotos: string[];
  /* Uzbek versions of the guest-facing texts */
  taglineUz?: string;
  cityUz?: string;
  addressUz?: string;
  hoursUz?: string;
  promos?: Promo[];
  /* POS */
  tables: number;
  servicePct: number;
  autoAcceptOnline: boolean;
  prepMinutes: number;
  deliveryMinutes: number;
  printGuestChecks: boolean;
  catStations: Record<string, string>;
  paper: '80' | '58';
};
export type CartItem = { key: string; id: string; si: number; ex: number[]; qty: number };
export type KitchenState = 'queued' | 'cooking' | 'ready';
export type OrderItem = {
  id: string; name: string; mods: string; qty: number; unit: number; sum: number;
  note?: string; station?: string; sent?: boolean; ks?: KitchenState | null; at?: number;
};
export type OrderStatus = 'new' | 'accepted' | 'cooking' | 'ready' | 'done' | 'cancelled';
export type PublicOrder = {
  id: string;
  no: number;
  status: OrderStatus;
  type: 'pickup' | 'delivery' | 'hall';
  pay: string;
  payStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  payUrl: string | null;
  etaAt: string | null;
  tgLink: string | null;
  tgLinked: boolean;
  fee: number;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  promo?: string;
  total: number;
  createdAt: string;
};
export type AdminOrder = PublicOrder & {
  name: string;
  phone: string;
  address: string;
  zone: string;
  note: string;
  when: string;
  pay: string;
};
