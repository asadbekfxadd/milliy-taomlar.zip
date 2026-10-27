"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { priceCart } from "@/lib/pricing";
import { fmt } from "@/lib/format";
import { useClosed, useSite } from "../Providers";
import { readTable } from "../TableEntry";
import { useMode, type Mode } from "./mode";
import { StoreSearch } from "./Store";

export const L = (lang: string, uz: string, ru: string) =>
  lang === "uz" ? uz : ru;

function ModeToggle({ className = "" }: { className?: string }) {
  const { settings: st, lang } = useSite();
  const allowed = [st.delivery && "delivery", st.pickup && "pickup"].filter(
    Boolean,
  ) as Mode[];
  const [mode, setMode] = useMode(allowed);
  return (
    <div
      className={`s-mode ${className}`}
      role="group"
      aria-label={L(lang, "Qanday olasiz", "Как получить")}
    >
      <button
        className={mode === "delivery" ? "on" : ""}
        disabled={!st.delivery}
        onClick={() => setMode("delivery")}
      >
        {L(lang, "Yetkazish", "Доставка")}
      </button>
      <button
        className={mode === "pickup" ? "on" : ""}
        disabled={!st.pickup}
        onClick={() => setMode("pickup")}
      >
        {L(lang, "Olib ketish", "Самовывоз")}
      </button>
    </div>
  );
}

export default function StoreHeader() {
  const { settings: st, lang, setLang, menu, cart, count } = useSite();
  const closed = useClosed();
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [table, setTable] = useState<number | null>(null);
  const { subtotal } = useMemo(() => priceCart(menu, cart), [menu, cart]);

  useEffect(() => {
    const f = () => setScrolled(scrollY > 8);
    f();
    addEventListener("scroll", f, { passive: true });
    return () => removeEventListener("scroll", f);
  }, []);
  useEffect(() => {
    setTable(readTable());
    setDrawer(false);
  }, [path]);

  const addr =
    lang === "uz"
      ? st.addressUz || st.address || st.cityUz || st.city
      : st.address || st.city;
  const tel = st.phone?.replace(/[^\d+]/g, "");

  return (
    <>
      <header className={`s-head ${scrolled ? "scrolled" : ""}`}>
        <div className="s-wrap">
          <button
            className="s-burger"
            onClick={() => setDrawer(true)}
            aria-label={L(lang, "Menyu", "Меню сайта")}
          >
            <svg viewBox="0 0 24 24">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <Link href="/" className="s-logo" aria-label={st.name}>
            <i>M</i>
            <b>{st.name}</b>
          </Link>
          {table ? (
            <span className="s-where s-table">
              {L(lang, `${table}-stol`, `Стол ${table}`)}
            </span>
          ) : (
            <ModeToggle />
          )}
          {!table && (
            <Link href="/contacts" className="s-where" title={addr}>
              <svg viewBox="0 0 24 24">
                <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <span>{addr}</span>
            </Link>
          )}
          <span className="s-sp" />
          {st.bookingEnabled !== false && (
            <Link
              href="/book"
              className="s-icon s-book"
              aria-label={L(lang, "Stol bron qilish", "Бронь стола")}
              title={L(lang, "Stol bron qilish", "Бронь стола")}
            >
              <svg viewBox="0 0 24 24">
                <path d="M4 6h16v15H4zM4 10h16M8 3v5M16 3v5" />
              </svg>
            </Link>
          )}
          <button
            className="s-icon"
            onClick={() => setSearch(true)}
            aria-label={L(lang, "Qidirish", "Поиск")}
          >
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
          {tel && (
            <a
              className="s-icon call"
              href={`tel:${tel}`}
              aria-label={st.phone}
            >
              <svg viewBox="0 0 24 24">
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
              </svg>
            </a>
          )}
          <div className="s-lang" role="group" aria-label="Til / Язык">
            <button
              className={lang === "uz" ? "on" : ""}
              onClick={() => setLang("uz")}
            >
              UZ
            </button>
            <button
              className={lang === "ru" ? "on" : ""}
              onClick={() => setLang("ru")}
            >
              RU
            </button>
          </div>
          <Link
            href="/cart"
            className="s-cartbtn"
            data-cart-target
            aria-label={L(lang, `Savat: ${count}`, `Корзина: ${count}`)}
          >
            <svg viewBox="0 0 24 24">
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" />
              <circle cx="10" cy="20" r="1.3" />
              <circle cx="17" cy="20" r="1.3" />
            </svg>
            {count > 0 && <span className="n">{count}</span>}
            <span className="t num">{fmt(subtotal)} UZS</span>
          </Link>
        </div>
        {!table && (
          <div className="s-row2">
            <ModeToggle />
          </div>
        )}
        {closed && (
          <div className="s-closed" role="status">
            {closed.title} · {closed.when}
          </div>
        )}
      </header>

      {drawer && (
        <div className="s-drawer" role="dialog" aria-modal="true">
          <div className="scr" onClick={() => setDrawer(false)} />
          <nav>
            <Link href="/">{L(lang, "Menyu", "Меню")}</Link>
            <Link href="/cart">{L(lang, "Savat", "Корзина")}</Link>
            {st.bookingEnabled !== false && (
              <Link href="/book">
                {L(lang, "Stol bron qilish", "Бронь стола")}
              </Link>
            )}
            <Link href="/contacts">
              {L(lang, "Manzil va aloqa", "Адрес и контакты")}
            </Link>
            <Link href="/story">{L(lang, "Biz haqimizda", "О нас")}</Link>
            <div
              className="s-lang"
              style={{ alignSelf: "flex-start", margin: "10px 12px" }}
            >
              <button
                className={lang === "uz" ? "on" : ""}
                onClick={() => setLang("uz")}
              >
                Oʻzbekcha
              </button>
              <button
                className={lang === "ru" ? "on" : ""}
                onClick={() => setLang("ru")}
              >
                Русский
              </button>
            </div>
            <div className="meta">
              {st.phone && <a href={`tel:${tel}`}>{st.phone}</a>}
              {st.phone2 && (
                <a href={`tel:${st.phone2.replace(/[^\d+]/g, "")}`}>
                  {st.phone2}
                </a>
              )}
              <span>{addr}</span>
              <span>{lang === "uz" ? st.hoursUz || st.hours : st.hours}</span>
            </div>
          </nav>
        </div>
      )}
      {search && <StoreSearch onClose={() => setSearch(false)} />}
    </>
  );
}
