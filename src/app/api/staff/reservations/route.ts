import { NextResponse } from "next/server";
import { guardAny } from "@/lib/auth";
import { normalizePhone } from "@/lib/format";
import { audit } from "@/lib/audit";
import {
  RES_STATUS_RU,
  byId,
  createReservation,
  listDay,
  listUpcoming,
  todayTashkent,
  updateReservation,
  type ResStatus,
} from "@/lib/reservations";

export const dynamic = "force-dynamic";

const PERMS = ["tables", "pos", "waiter"] as const;
const bad = (error: string, status = 400) =>
  NextResponse.json({ error }, { status });
const STATUSES = Object.keys(RES_STATUS_RU) as ResStatus[];

export async function GET(req: Request) {
  const g = await guardAny([...PERMS]);
  if ("res" in g) return g.res;
  const day = new URL(req.url).searchParams.get("day");
  if (day === "upcoming")
    return NextResponse.json({
      list: await listUpcoming(),
      today: todayTashkent(),
    });
  const d = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : todayTashkent();
  return NextResponse.json({
    list: await listDay(d),
    day: d,
    today: todayTashkent(),
  });
}

/** A booking taken by phone or at the door. */
export async function POST(req: Request) {
  const g = await guardAny([...PERMS]);
  if ("res" in g) return g.res;
  const b = await req.json().catch(() => null);
  const name = String(b?.name || "")
    .trim()
    .slice(0, 60);
  if (!name) return bad("Укажите имя гостя");
  const phone = normalizePhone(String(b?.phone || "")) || "";
  if (!phone) return bad("Телефон в формате +998 90 123 45 67");
  const day = String(b?.day || "");
  const time = String(b?.time || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time))
    return bad("Укажите дату и время");
  const guests = Math.max(1, Math.min(500, Math.floor(Number(b?.guests) || 2)));
  const tableNo = b?.table ? Math.floor(Number(b.table)) || null : null;
  const r = await createReservation({
    day,
    time,
    guests,
    name,
    phone,
    note: String(b?.note || "").slice(0, 300),
    tableNo,
    source: "staff",
    byName: g.user.name,
    status: "confirmed",
  });
  await audit(
    g.user,
    "Бронь создана",
    `${day} ${time}, ${guests} гост., ${name}${tableNo ? `, стол ${tableNo}` : ""}`,
  );
  return NextResponse.json(r);
}

export async function PATCH(req: Request) {
  const g = await guardAny([...PERMS]);
  if ("res" in g) return g.res;
  const b = await req.json().catch(() => null);
  const cur = await byId(Number(b?.id));
  if (!cur) return bad("Бронь не найдена", 404);
  const patch: Parameters<typeof updateReservation>[1] = {};
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) return bad("Неизвестный статус");
    patch.status = b.status;
  }
  if (b.table !== undefined)
    patch.tableNo = b.table ? Math.floor(Number(b.table)) || null : null;
  if (b.time !== undefined) {
    if (!/^\d{2}:\d{2}$/.test(b.time)) return bad("Время в формате 19:30");
    patch.time = b.time;
  }
  if (b.day !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.day)) return bad("Неверная дата");
    patch.day = b.day;
  }
  if (b.guests !== undefined)
    patch.guests = Math.max(
      1,
      Math.min(500, Math.floor(Number(b.guests) || 1)),
    );
  if (b.note !== undefined) patch.note = String(b.note).slice(0, 300);
  const r = await updateReservation(cur.id, patch);
  const what = patch.status
    ? RES_STATUS_RU[patch.status]
    : patch.tableNo !== undefined
      ? `стол ${patch.tableNo ?? "—"}`
      : "изменена";
  await audit(g.user, "Бронь", `${cur.day} ${cur.time} ${cur.name}: ${what}`);
  return NextResponse.json(r);
}
