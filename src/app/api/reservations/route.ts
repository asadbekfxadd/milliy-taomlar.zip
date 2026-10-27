import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data";
import { normalizePhone } from "@/lib/format";
import { openAtDate, tashkentNow } from "@/lib/hours";
import { clientIp, over, record } from "@/lib/rate";
import {
  createReservation,
  notifyReservation,
  todayTashkent,
} from "@/lib/reservations";

export const dynamic = "force-dynamic";

const UZ: Record<string, string> = {
  "Бронь на сайте сейчас не принимаем. Позвоните нам":
    "Saytda bron hozir qabul qilinmayapti. Bizga qoʻngʻiroq qiling",
  "Слишком много заявок. Позвоните нам":
    "Juda koʻp soʻrov. Bizga qoʻngʻiroq qiling",
  "Укажите имя": "Ismingizni kiriting",
  "Номер в формате +998 90 123 45 67": "Raqam +998 90 123 45 67 koʻrinishida",
  "Выберите дату": "Sanani tanlang",
  "Бронь — не дальше чем на 60 дней": "Bron — 60 kundan oshmasin",
  "Выберите время": "Vaqtni tanlang",
  "Это время уже прошло": "Bu vaqt oʻtib ketgan",
  "В это время мы закрыты": "Bu vaqtda biz yopiqmiz",
  "Сколько гостей?": "Necha mehmon?",
  "Для большой компании позвоните нам":
    "Katta davra uchun bizga qoʻngʻiroq qiling",
};

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const uz = b?.lang === "uz";
  const bad = (e: string, field?: string, status = 400) =>
    NextResponse.json({ error: uz ? UZ[e] || e : e, field }, { status });
  const st = await getSettings();
  if (st.bookingEnabled === false)
    return bad("Бронь на сайте сейчас не принимаем. Позвоните нам");
  const ip = clientIp(req);
  if (over("book:" + ip, 5, 60 * 60 * 1000))
    return bad("Слишком много заявок. Позвоните нам", undefined, 429);

  const name = String(b?.name || "")
    .trim()
    .slice(0, 60);
  if (!name) return bad("Укажите имя", "name");
  const phone = normalizePhone(String(b?.phone || ""));
  if (!phone) return bad("Номер в формате +998 90 123 45 67", "phone");
  const day = String(b?.day || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return bad("Выберите дату", "day");
  const today = todayTashkent();
  const max = todayTashkent(new Date(Date.now() + 60 * 86400_000));
  if (day < today) return bad("Это время уже прошло", "day");
  if (day > max) return bad("Бронь — не дальше чем на 60 дней", "day");
  const time = String(b?.time || "");
  if (!/^\d{2}:\d{2}$/.test(time)) return bad("Выберите время", "time");
  if (day === today) {
    const [hh, mm] = time.split(":").map(Number);
    if (hh * 60 + mm < tashkentNow().min + 15)
      return bad("Это время уже прошло", "time");
  }
  if (!openAtDate(st, day, time)) return bad("В это время мы закрыты", "time");
  const guests = Math.floor(Number(b?.guests));
  if (!(guests >= 1)) return bad("Сколько гостей?", "guests");
  if (guests > (st.bookingMaxGuests || 20))
    return bad("Для большой компании позвоните нам", "guests");

  const r = await createReservation({
    day,
    time,
    guests,
    name,
    phone,
    note: String(b?.note || "")
      .trim()
      .slice(0, 300),
    source: "site",
    lang: uz ? "uz" : "ru",
  });
  record("book:" + ip);
  notifyReservation(r, "new").catch(() => {});
  return NextResponse.json({ token: r.token });
}
