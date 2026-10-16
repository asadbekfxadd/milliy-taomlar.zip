import 'server-only';
import { Pool, type QueryResultRow } from 'pg';
import { randomBytes } from 'crypto';

/* Plain PostgreSQL via node-postgres. The schema is created automatically on first use
   (idempotent), so a fresh Railway Postgres needs no manual migration step. */

const g = globalThis as unknown as { pgPool?: Pool; pgReady?: Promise<void> };

function pool() {
  if (!g.pgPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    const local = /localhost|127\.0\.0\.1|\.railway\.internal/.test(url);
    g.pgPool = new Pool({ connectionString: url, max: 8, ssl: local ? undefined : { rejectUnauthorized: false } });
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
CREATE INDEX IF NOT EXISTS payments_order_idx ON payments (order_id);`;

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

export async function q<T extends QueryResultRow = any>(text: string, params: unknown[] = []) {
  await ready();
  return pool().query<T>(text, params);
}

export const newId = () => randomBytes(12).toString('hex');

/* ---------- orders ---------- */
export type OrderRow = {
  id: string; no: number; token: string; status: string; type: string; zone: string; fee: number; address: string;
  name: string; phone: string; note: string; when: string; pay: string; items: any; subtotal: number; total: number;
  tgMessageId: number | null; createdAt: string;
  source: string; tableNo: number | null; guests: number; waiter: string; service: number; paidWith: string; paidAt: string | null;
  payStatus: string; acceptedAt: string | null; etaAt: string | null; customerChat: number | null;
};
export const mapOrder = (r: any): OrderRow => ({
  id: r.id, no: r.no, token: r.token, status: r.status, type: r.type, zone: r.zone, fee: r.fee, address: r.address,
  name: r.name, phone: r.phone, note: r.note, when: r.when, pay: r.pay, items: r.items, subtotal: r.subtotal, total: r.total,
  tgMessageId: r.tg_message_id === null || r.tg_message_id === undefined ? null : Number(r.tg_message_id), createdAt: new Date(r.created_at).toISOString(),
  source: r.source ?? 'site', tableNo: r.table_no ?? null, guests: r.guests ?? 0, waiter: r.waiter ?? '', service: r.service ?? 0,
  paidWith: r.paid_with ?? '', paidAt: r.paid_at ? new Date(r.paid_at).toISOString() : null,
  payStatus: r.pay_status ?? 'unpaid', acceptedAt: r.accepted_at ? new Date(r.accepted_at).toISOString() : null,
  etaAt: r.eta_at ? new Date(r.eta_at).toISOString() : null, customerChat: r.customer_chat ? Number(r.customer_chat) : null,
});

export async function getOrder(id: string) {
  const r = await q('SELECT * FROM orders WHERE id = $1', [id]);
  return r.rows[0] ? mapOrder(r.rows[0]) : null;
}

export async function setOrderStatus(id: string, status: string) {
  const r = await q('UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 RETURNING *', [id, status]);
  return r.rows[0] ? mapOrder(r.rows[0]) : null;
}

export async function saveDoc(id: string, data: unknown) {
  await q('INSERT INTO site_docs (id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()', [id, JSON.stringify(data)]);
}
export async function loadDoc<T>(id: string): Promise<T | null> {
  const r = await q('SELECT data FROM site_docs WHERE id = $1', [id]);
  return (r.rows[0]?.data as T) ?? null;
}
