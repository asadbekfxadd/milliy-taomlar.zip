import "server-only";
import { Pool, type QueryResultRow } from "pg";
import { randomBytes } from "crypto";

/* Plain PostgreSQL via node-postgres. The schema is created automatically on first use
   (idempotent), so a fresh Railway Postgres needs no manual migration step. */

const g = globalThis as unknown as { pgPool?: Pool; pgReady?: Promise<void> };

function pool() {
  if (!g.pgPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const local = /localhost|127\.0\.0\.1|\.railway\.internal/.test(url);
    g.pgPool = new Pool({
      connectionString: url,
      max: 8,
      ssl: local ? undefined : { rejectUnauthorized: false },
    });
  }
  return g.pgPool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS site_docs (
  id         text PRIMARY KEY,
  data       jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
  id            text PRIMARY KEY,
  no            serial UNIQUE,
  token         text NOT NULL,
  status        text NOT NULL DEFAULT 'new',
  type          text NOT NULL,
  zone          text NOT NULL DEFAULT '',
  fee           integer NOT NULL DEFAULT 0,
  address       text NOT NULL DEFAULT '',
  name          text NOT NULL,
  phone         text NOT NULL,
  note          text NOT NULL DEFAULT '',
  "when"        text NOT NULL DEFAULT 'asap',
  pay           text NOT NULL,
  items         jsonb NOT NULL,
  subtotal      integer NOT NULL,
  total         integer NOT NULL,
  tg_message_id bigint,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE TABLE IF NOT EXISTS images (
  id         text PRIMARY KEY,
  mime       text NOT NULL,
  width      integer NOT NULL,
  height     integer NOT NULL,
  data       bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source   text NOT NULL DEFAULT 'site';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_no integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guests   integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter   text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service  integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_with text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at  timestamptz;
CREATE TABLE IF NOT EXISTS print_jobs (
  id          serial PRIMARY KEY,
  station     text NOT NULL,
  kind        text NOT NULL,
  order_id    text,
  body        jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  claimed_at  timestamptz,
  printed_at  timestamptz
);
CREATE INDEX IF NOT EXISTS print_jobs_pending_idx ON print_jobs (station) WHERE printed_at IS NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pay_status    text NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at   timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eta_at        timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_chat bigint;
CREATE TABLE IF NOT EXISTS payments (
  id           serial PRIMARY KEY,
  provider     text NOT NULL,
  ext_id       text NOT NULL,
  order_id     text NOT NULL,
  amount       bigint NOT NULL,
  state        integer NOT NULL DEFAULT 1,
  reason       integer,
  create_time  bigint NOT NULL,
  perform_time bigint NOT NULL DEFAULT 0,
  cancel_time  bigint NOT NULL DEFAULT 0,
  UNIQUE (provider, ext_id)
);
CREATE INDEX IF NOT EXISTS payments_order_idx ON payments (order_id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo     text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_pct numeric NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_fixed integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount  integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS lang      text NOT NULL DEFAULT 'ru';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_id text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tips      integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cashier   text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shift_id  integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stock_done boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders (phone) WHERE phone <> '';
CREATE INDEX IF NOT EXISTS orders_paid_idx ON orders (paid_at) WHERE paid_at IS NOT NULL;
CREATE TABLE IF NOT EXISTS employees (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  role       text NOT NULL,
  pin_hash   text NOT NULL,
  phone      text NOT NULL DEFAULT '',
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shifts (
  id            serial PRIMARY KEY,
  opened_at     timestamptz NOT NULL DEFAULT now(),
  opened_by     text NOT NULL,
  opening_cash  integer NOT NULL DEFAULT 0,
  closed_at     timestamptz,
  closed_by     text NOT NULL DEFAULT '',
  counted_cash  integer,
  report        jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS shifts_one_open ON shifts ((closed_at IS NULL)) WHERE closed_at IS NULL;
CREATE TABLE IF NOT EXISTS cash_moves (
  id         serial PRIMARY KEY,
  shift_id   integer NOT NULL,
  kind       text NOT NULL,
  amount     integer NOT NULL,
  note       text NOT NULL DEFAULT '',
  by_name    text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ingredients (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  unit       text NOT NULL DEFAULT 'кг',
  stock      numeric NOT NULL DEFAULT 0,
  min_stock  numeric NOT NULL DEFAULT 0,
  cost       numeric NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stock_moves (
  id            serial PRIMARY KEY,
  ingredient_id text NOT NULL,
  kind          text NOT NULL,
  qty           numeric NOT NULL,
  price         numeric NOT NULL DEFAULT 0,
  note          text NOT NULL DEFAULT '',
  order_id      text,
  by_name       text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS stock_moves_ing_idx ON stock_moves (ingredient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_moves_at_idx ON stock_moves (created_at DESC);
CREATE TABLE IF NOT EXISTS recipes (
  dish_id    text NOT NULL,
  si         integer NOT NULL DEFAULT -1,
  lines      jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dish_id, si)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id         serial PRIMARY KEY,
  at         timestamptz NOT NULL DEFAULT now(),
  who        text NOT NULL DEFAULT '',
  role       text NOT NULL DEFAULT '',
  action     text NOT NULL,
  details    text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS audit_at_idx ON audit_log (at DESC);
CREATE TABLE IF NOT EXISTS customer_notes (
  phone      text PRIMARY KEY,
  note       text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reservations (
  id         serial PRIMARY KEY,
  token      text NOT NULL UNIQUE,
  day        date NOT NULL,
  time       text NOT NULL,
  guests     int NOT NULL DEFAULT 2,
  name       text NOT NULL,
  phone      text NOT NULL,
  note       text NOT NULL DEFAULT '',
  table_no   int,
  status     text NOT NULL DEFAULT 'new',
  source     text NOT NULL DEFAULT 'site',
  lang       text NOT NULL DEFAULT 'ru',
  by_name    text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reservations_day_idx ON reservations (day, time);`;

function ready() {
  if (!g.pgReady)
    g.pgReady = pool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((e) => {
        g.pgReady = undefined; // retry on next call
        throw e;
      });
  return g.pgReady;
}

export async function q<T extends QueryResultRow = any>(
  text: string,
  params: unknown[] = [],
) {
  await ready();
  return pool().query<T>(text, params);
}

export const newId = () => randomBytes(12).toString("hex");

/* ---------- orders ---------- */
export type OrderRow = {
  id: string;
  no: number;
  token: string;
  status: string;
  type: string;
  zone: string;
  fee: number;
  address: string;
  name: string;
  phone: string;
  note: string;
  when: string;
  pay: string;
  items: any;
  subtotal: number;
  total: number;
  tgMessageId: number | null;
  createdAt: string;
  source: string;
  tableNo: number | null;
  guests: number;
  waiter: string;
  service: number;
  paidWith: string;
  paidAt: string | null;
  payStatus: string;
  acceptedAt: string | null;
  etaAt: string | null;
  customerChat: number | null;
  promo: string;
  promoPct: number;
  promoFixed: number;
  discount: number;
  lang: string;
  waiterId: string;
  tips: number;
  cashier: string;
  shiftId: number | null;
  cancelReason: string;
};
export const mapOrder = (r: any): OrderRow => ({
  id: r.id,
  no: r.no,
  token: r.token,
  status: r.status,
  type: r.type,
  zone: r.zone,
  fee: r.fee,
  address: r.address,
  name: r.name,
  phone: r.phone,
  note: r.note,
  when: r.when,
  pay: r.pay,
  items: r.items,
  subtotal: r.subtotal,
  total: r.total,
  tgMessageId:
    r.tg_message_id === null || r.tg_message_id === undefined
      ? null
      : Number(r.tg_message_id),
  createdAt: new Date(r.created_at).toISOString(),
  source: r.source ?? "site",
  tableNo: r.table_no ?? null,
  guests: r.guests ?? 0,
  waiter: r.waiter ?? "",
  service: r.service ?? 0,
  paidWith: r.paid_with ?? "",
  paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
  payStatus: r.pay_status ?? "unpaid",
  acceptedAt: r.accepted_at ? new Date(r.accepted_at).toISOString() : null,
  etaAt: r.eta_at ? new Date(r.eta_at).toISOString() : null,
  customerChat: r.customer_chat ? Number(r.customer_chat) : null,
  promo: r.promo ?? "",
  promoPct: Number(r.promo_pct ?? 0),
  promoFixed: r.promo_fixed ?? 0,
  discount: r.discount ?? 0,
  lang: r.lang ?? "ru",
  waiterId: r.waiter_id ?? "",
  tips: r.tips ?? 0,
  cashier: r.cashier ?? "",
  shiftId: r.shift_id ?? null,
  cancelReason: r.cancel_reason ?? "",
});

export async function getOrder(id: string) {
  const r = await q("SELECT * FROM orders WHERE id = $1", [id]);
  return r.rows[0] ? mapOrder(r.rows[0]) : null;
}

export async function setOrderStatus(id: string, status: string) {
  const r = await q(
    "UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [id, status],
  );
  return r.rows[0] ? mapOrder(r.rows[0]) : null;
}

export async function saveDoc(id: string, data: unknown) {
  await q(
    "INSERT INTO site_docs (id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
    [id, JSON.stringify(data)],
  );
}
export async function loadDoc<T>(id: string): Promise<T | null> {
  const r = await q("SELECT data FROM site_docs WHERE id = $1", [id]);
  return (r.rows[0]?.data as T) ?? null;
}
