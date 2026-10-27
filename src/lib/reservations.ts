import "server-only";
import { randomBytes } from "crypto";
import { q } from "./db";
import { tg } from "./telegram";
import { prettyPhone } from "./format";

/* Table bookings. Day and time are kept as Tashkent wall-clock values ("2026-10-27", "19:30"),
   which is how the guest and the staff think about them. */

export type ResStatus = "new" | "confirmed" | "seated" | "cancelled" | "noshow";
export type Reservation = {
  id: number;
  token: string;
  day: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
  note: string;
  tableNo: number | null;
  status: ResStatus;
  source: "site" | "staff";
  lang: "uz" | "ru";
  byName: string;
  createdAt: string;
};

export const RES_STATUS_RU: Record<ResStatus, string> = {
  new: "Новая",
  confirmed: "Подтверждена",
  seated: "Гости пришли",
  cancelled: "Отменена",
  noshow: "Не пришли",
};

const map = (r: any): Reservation => ({
  id: r.id,
  token: r.token,
  day: typeof r.day === "string" ? r.day.slice(0, 10) : ymd(r.day),
  time: r.time,
  guests: r.guests,
  name: r.name,
  phone: r.phone,
  note: r.note,
  tableNo: r.table_no,
  status: r.status,
  source: r.source,
  lang: r.lang === "uz" ? "uz" : "ru",
  byName: r.by_name,
  createdAt: new Date(r.created_at).toISOString(),
});

/** pg returns DATE as a local-midnight Date; read it back without a timezone shift */
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today's date in Tashkent, "YYYY-MM-DD". */
export function todayTashkent(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function listDay(day: string) {
  const r = await q(
    `SELECT * FROM reservations WHERE day = $1 ORDER BY time, id`,
    [day],
  );
  return r.rows.map(map);
}

/** Active bookings from today on (for the staff list). */
export async function listUpcoming(limit = 200) {
  const r = await q(
    `SELECT * FROM reservations WHERE day >= $1 AND status IN ('new','confirmed') ORDER BY day, time, id LIMIT $2`,
    [todayTashkent(), limit],
  );
  return r.rows.map(map);
}

export async function byToken(token: string) {
  const r = await q(`SELECT * FROM reservations WHERE token = $1`, [token]);
  return r.rows[0] ? map(r.rows[0]) : null;
}

export async function byId(id: number) {
  const r = await q(`SELECT * FROM reservations WHERE id = $1`, [id]);
  return r.rows[0] ? map(r.rows[0]) : null;
}

export async function createReservation(x: {
  day: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
  note?: string;
  tableNo?: number | null;
  source: "site" | "staff";
  lang?: "uz" | "ru";
  byName?: string;
  status?: ResStatus;
}) {
  const r = await q(
    `INSERT INTO reservations (token, day, time, guests, name, phone, note, table_no, source, lang, by_name, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [
      randomBytes(12).toString("hex"),
      x.day,
      x.time,
      x.guests,
      x.name,
      x.phone,
      x.note || "",
      x.tableNo ?? null,
      x.source,
      x.lang || "ru",
      x.byName || "",
      x.status || "new",
    ],
  );
  return map(r.rows[0]);
}

export async function updateReservation(
  id: number,
  patch: Partial<{
    status: ResStatus;
    tableNo: number | null;
    day: string;
    time: string;
    guests: number;
    note: string;
    name: string;
    phone: string;
  }>,
) {
  const cols: Record<string, string> = {
    status: "status",
    tableNo: "table_no",
    day: "day",
    time: "time",
    guests: "guests",
    note: "note",
    name: "name",
    phone: "phone",
  };
  const keys = Object.keys(patch).filter((k) => k in cols);
  if (!keys.length) return byId(id);
  const sets = keys.map((k, i) => `${cols[k]} = $${i + 2}`).join(", ");
  const r = await q(
    `UPDATE reservations SET ${sets}, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, ...keys.map((k) => (patch as any)[k])],
  );
  return r.rows[0] ? map(r.rows[0]) : null;
}

const DAY_FMT = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("ru-RU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "long",
  });
};
export const dayLabel = DAY_FMT;

const h = (s: string) =>
  String(s ?? "").replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!,
  );

/** Tell the staff chat about a booking made or cancelled by a guest. */
export async function notifyReservation(
  r: Reservation,
  what: "new" | "cancelled",
) {
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!chat) return;
  const head =
    what === "new" ? "📅 <b>Новая бронь</b>" : "✖️ <b>Гость отменил бронь</b>";
  const text = [
    head,
    `${DAY_FMT(r.day)}, <b>${h(r.time)}</b> · ${r.guests} гост.`,
    `${h(r.name)} · ${h(prettyPhone(r.phone))}`,
    r.note ? `<i>${h(r.note)}</i>` : "",
    what === "new" ? "Подтвердите в «Управление → Бронь»." : "",
  ]
    .filter(Boolean)
    .join("\n");
  await tg("sendMessage", { chat_id: chat, text, parse_mode: "HTML" });
}
