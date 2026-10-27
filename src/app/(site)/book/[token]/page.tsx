import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLang } from "@/lib/lang";
import { getSettings } from "@/lib/data";
import { byToken } from "@/lib/reservations";
import CancelBooking from "@/components/store/CancelBooking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Бронь", robots: { index: false } };

const ST: Record<string, [string, string]> = {
  new: [
    "Заявка принята. Администратор перезвонит и подтвердит.",
    "Soʻrov qabul qilindi. Administrator qoʻngʻiroq qilib tasdiqlaydi.",
  ],
  confirmed: [
    "Бронь подтверждена. Ждём вас!",
    "Bron tasdiqlandi. Sizni kutamiz!",
  ],
  seated: ["Вы у нас. Приятного аппетита!", "Siz bizdasiz. Yoqimli ishtaha!"],
  cancelled: ["Бронь отменена.", "Bron bekor qilindi."],
  noshow: ["Бронь закрыта.", "Bron yopildi."],
};

export default async function Page({ params }: { params: { token: string } }) {
  const r = await byToken(params.token);
  if (!r) notFound();
  const st = await getSettings();
  const uz = getLang() === "uz";
  const [y, m, d] = r.day.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(
    uz ? "uz-UZ" : "ru-RU",
    { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" },
  );
  const live = r.status === "new" || r.status === "confirmed";
  return (
    <>
      <section className="masthead g" style={{ paddingBottom: 10 }}>
        <div className="in">
          <div className="kicker">{uz ? "Bron" : "Бронь"}</div>
          <h1 className="num">{r.time}</h1>
        </div>
      </section>
      <div className="g">
        <div className="in bk-done">
          <div style={{ maxWidth: 760 }}>
            <div
              className={`alert ${r.status === "confirmed" ? "ok" : live ? "" : "warn"}`}
            >
              {ST[r.status]?.[uz ? 1 : 0]}
            </div>
            <dl className="kv">
              <dt>{uz ? "Kun" : "День"}</dt>
              <dd>{date}</dd>
              <dt>{uz ? "Vaqt" : "Время"}</dt>
              <dd className="num">{r.time}</dd>
              <dt>{uz ? "Mehmonlar" : "Гостей"}</dt>
              <dd className="num">{r.guests}</dd>
              <dt>{uz ? "Ism" : "Имя"}</dt>
              <dd>{r.name}</dd>
              {r.tableNo && (
                <>
                  <dt>{uz ? "Stol" : "Стол"}</dt>
                  <dd className="num">{r.tableNo}</dd>
                </>
              )}
              {r.note && (
                <>
                  <dt>{uz ? "Izoh" : "Пожелание"}</dt>
                  <dd>{r.note}</dd>
                </>
              )}
            </dl>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 24,
              }}
            >
              <Link className="btn" href="/">
                {uz ? "Menyuni koʻrish" : "Посмотреть меню"}
              </Link>
              {st.phone && (
                <a
                  className="btn ghost"
                  href={`tel:${st.phone.replace(/[^\d+]/g, "")}`}
                >
                  {st.phone}
                </a>
              )}
              {live && <CancelBooking token={r.token} uz={uz} />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
