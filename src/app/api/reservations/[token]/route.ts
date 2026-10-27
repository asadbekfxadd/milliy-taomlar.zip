import { NextResponse } from "next/server";
import {
  byToken,
  notifyReservation,
  updateReservation,
} from "@/lib/reservations";

export const dynamic = "force-dynamic";

/** The guest cancels their own booking from the link they got. */
export async function DELETE(
  _: Request,
  { params }: { params: { token: string } },
) {
  const r = await byToken(params.token);
  if (!r)
    return NextResponse.json({ error: "Бронь не найдена" }, { status: 404 });
  if (!["new", "confirmed"].includes(r.status))
    return NextResponse.json({ error: "Бронь уже закрыта" }, { status: 400 });
  const n = await updateReservation(r.id, { status: "cancelled" });
  notifyReservation(n!, "cancelled").catch(() => {});
  return NextResponse.json({ ok: true });
}
