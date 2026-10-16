import { z } from 'zod';

const str = (max: number) => z.string().trim().max(max);
const money = z.coerce.number().int().min(0).max(100_000_000);

export const orderInput = z.object({
  items: z
    .array(
      z.object({
        id: str(64),
        si: z.number().int().min(0).max(50),
        ex: z.array(z.number().int().min(0).max(50)).max(20),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(60),
  type: z.enum(['pickup', 'delivery']),
  zone: z.number().int().min(0).max(100).optional(),
  address: str(300).optional().default(''),
  name: str(80),
  phone: str(40),
  note: str(500).optional().default(''),
  when: z.union([z.literal('asap'), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)]),
  pay: z.enum(['cash', 'card', 'payme', 'click']),
  website: z.string().optional(), // honeypot, must stay empty
});

export const statusInput = z.object({ status: z.enum(['new', 'accepted', 'cooking', 'ready', 'done', 'cancelled']) });

const size = z.object({ label: str(80), w: str(40).default(''), p: money });
const extra = z.object({ label: str(80), p: money });
export const dishSchema = z.object({
  id: str(64).min(1),
  cat: str(64),
  name: str(120),
  ru: str(160).default(''),
  desc: str(1200).default(''),
  ingr: z.array(str(80)).max(40).default([]),
  allergens: z.array(str(60)).max(20).default([]),
  weight: str(40).default(''),
  price: money,
  tags: z.array(str(20)).max(10).default([]),
  art: str(40).default('plov'),
  photo: str(500).default(''),
  sizes: z.array(size).max(12).default([]),
  extras: z.array(extra).max(20).default([]),
  available: z.boolean().default(true),
  featured: z.boolean().default(false),
});
export const menuSchema = z.object({
  cats: z.array(z.object({ id: str(64).min(1), name: str(120), ru: str(160).default('') })).max(40),
  dishes: z.array(dishSchema).max(400),
});

export const settingsSchema = z.object({
  name: str(80),
  tagline: str(200),
  phone: str(40),
  address: str(200),
  city: str(80),
  hours: str(160),
  mapUrl: z.string().trim().max(500).refine((v) => !v || /^https:\/\//.test(v), 'https only').default(''),
  instagram: str(80),
  telegram: str(80),
  pickup: z.boolean(),
  delivery: z.boolean(),
  prepTime: str(60),
  minOrder: money,
  zones: z.array(z.object({ name: str(120), fee: money, min: money })).max(30),
  pay: z.object({ cash: z.boolean(), card: z.boolean() }),
  story: z.array(str(1500)).length(6),
  storyPhotos: z.array(str(500)).length(6),
  tables: z.coerce.number().int().min(0).max(200),
  servicePct: z.coerce.number().min(0).max(30),
  autoAcceptOnline: z.boolean(),
  prepMinutes: z.coerce.number().int().min(1).max(240).default(25),
  deliveryMinutes: z.coerce.number().int().min(0).max(240).default(20),
  printGuestChecks: z.boolean().default(false),
  catStations: z.record(z.string().max(64), z.enum(['kitchen', 'mangal', 'bar'])),
  paper: z.enum(['80', '58']),
});

const posLine = z.object({
  id: str(64),
  si: z.number().int().min(0).max(50).default(0),
  ex: z.array(z.number().int().min(0).max(50)).max(20).default([]),
  qty: z.number().int().min(1).max(99).default(1),
  note: str(200).optional().default(''),
});
export const posCreate = z.object({ table: z.number().int().min(0).max(500).nullable(), guests: z.number().int().min(0).max(100).default(0), waiter: str(60).default(''), type: z.enum(['hall', 'pickup']).default('hall') });
export const posAdd = z.object({ items: z.array(posLine).min(1).max(40) });
export const posLineEdit = z.object({ line: z.number().int().min(0).max(500), qty: z.number().int().min(0).max(99) });
export const posPay = z.object({ method: z.enum(['cash', 'card', 'payme', 'click']) });
export const kitchenUpdate = z.object({ lines: z.array(z.number().int().min(0).max(500)).max(100), to: z.enum(['cooking', 'ready']) });
