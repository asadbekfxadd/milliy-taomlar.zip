"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Menu, Settings } from "@/lib/types";
import { ROLES, can, type Role } from "@/lib/rbac";
import { PanelProvider, usePanel } from "../panel/kit";
import type { StaffOrder } from "./types";

export type Booking = {
  id: number;
  day: string;
  time: string;
  guests: number;
  name: string;
  phone: string;
  note: string;
  tableNo: number | null;
  status: string;
};
export type ShiftInfo = {
  id: number;
  openedAt: string;
  openedBy: string;
} | null;
type Me = { id: string; name: string; role: Role };
type Ctx = {
  me: Me;
  menu: Menu;
  settings: Settings;
  orders: StaffOrder[];
  bookings: Booking[];
  shift: ShiftInfo;
  online: boolean;
  refresh: () => Promise<void>;
  act: (
    id: string,
    body: Record<string, unknown>,
  ) => Promise<StaffOrder | null>;
  toast: (m: string) => void;
};
const C = createContext<Ctx | null>(null);
export const useStaff = () => useContext(C)!;

export default function FloorShell(props: {
  me: Me;
  menu: Menu;
  settings: Settings;
  children: React.ReactNode;
}) {
  return (
    <PanelProvider>
      <Inner {...props} />
    </PanelProvider>
  );
}

function Inner({
  me,
  menu,
  settings,
  children,
}: {
  me: Me;
  menu: Menu;
  settings: Settings;
  children: React.ReactNode;
}) {
  const { toast } = usePanel();
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [shift, setShift] = useState<ShiftInfo>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [newOnline, setNewOnline] = useState(0);
  const [online, setOnline] = useState(true);
  const path = usePathname();

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/staff/state", { cache: "no-store" });
      if (r.status === 401) {
        location.href = "/login?next=" + encodeURIComponent(location.pathname);
        return;
      }
      const j = await r.json();
      setOrders(j.orders || []);
      setShift(j.shift || null);
      setBookings(j.bookings || []);
      setNewOnline(j.newOnline || 0);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);

  const act = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      try {
        const r = await fetch(`/api/staff/orders/${id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          toast(j.error || "Ошибка");
          return null;
        }
        await refresh();
        return j as StaffOrder;
      } catch {
        toast("Нет связи с сервером");
        return null;
      }
    },
    [refresh, toast],
  );

  const nav = (
    [
      ["/pos", "Касса", "pos"],
      ["/waiter", "Официант", "waiter"],
      ["/kitchen", "Кухня", "kitchen"],
      ["/print", "Печать", "print"],
      ["/admin", "Управление", "dashboard"],
    ] as const
  ).filter(([, , p]) => can(me.role, p));

  return (
    <C.Provider
      value={{
        me,
        menu,
        settings,
        orders,
        bookings,
        shift,
        online,
        refresh,
        act,
        toast,
      }}
    >
      <div className="pn fl">
        <header className="fl-bar">
          <span className="ad-logo">{settings.name.slice(0, 1)}</span>
          <nav className="fl-nav">
            {nav.map(([h, l]) => (
              <Link
                key={h}
                href={h}
                className={path === h || path.startsWith(h + "/") ? "on" : ""}
              >
                {l}
                {h === "/pos" && newOnline > 0 && (
                  <span className="cnt">{newOnline}</span>
                )}
              </Link>
            ))}
          </nav>
          <i
            className={`fl-net ${online ? "" : "bad"}`}
            title={online ? "Связь есть" : "Нет связи с сервером"}
          />
          <span className="fl-who">
            <b>{me.name}</b> <span>· {ROLES[me.role].name}</span>
          </span>
          <button
            className="fl-out"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              location.href = "/login";
            }}
          >
            Выйти
          </button>
        </header>
        {!online && (
          <div className="fl-off">
            Нет связи с сервером. Данные на экране могут быть старыми.
          </div>
        )}
        <main className="fl-main">{children}</main>
      </div>
    </C.Provider>
  );
}
