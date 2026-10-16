import { NextResponse } from 'next/server';
import { isStaff } from '@/lib/auth';
import { getOrder } from '@/lib/db';
import { getMenu, getSettings } from '@/lib/data';
import { posAdd, posLineEdit, posPay } from '@/lib/schemas';
import { adjustEta, kitchenMove, printCheck, priceLine, saveItems, sendToKitchen, updateStatus } from '@/lib/pos';
import type { OrderItem } from '@/lib/types';

export const dynamic = 'force-dynamic';
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** One endpoint per check; `action` says what the waiter/cashier pressed. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isStaff()) return bad('unauthorized', 401);
  const body = await req.json().catch(() => null);
  const action = String(body?.action || '');
  const [o, menu, st] = await Promise.all([getOrder(params.id), getMenu(), getSettings()]);
  if (!o) return bad('Чек не найден', 404);
  const closed = ['done', 'cancelled'].includes(o.status);
  if (closed && action !== 'reprint') return bad('Чек уже закрыт');
  const items: OrderItem[] = (o.items as OrderItem[]).map((l) => ({ ...l }));

  switch (action) {
    case 'add': {
      const p = posAdd.safeParse(body);
      if (!p.success) return bad('Неверные позиции');
      for (const i of p.data.items) {
        const line = priceLine(menu, st, i);
        if (typeof line === 'string') return bad(line);
        // same dish, same options, not yet sent → just bump the quantity
        const same = items.find((l) => !l.sent && l.id === line.id && l.mods === line.mods && (l.note || '') === (line.note || ''));
        if (same) same.qty += line.qty;
        else items.push(line);
      }
      return NextResponse.json(await saveItems(o, items, st));
    }
    case 'qty': {
      const p = posLineEdit.safeParse(body);
      if (!p.success || !items[p.data.line]) return bad('Нет такой позиции');
      if (items[p.data.line].sent) return bad('Позиция уже на кухне. Отмена — через администратора.');
      if (p.data.qty === 0) items.splice(p.data.line, 1);
      else items[p.data.line].qty = p.data.qty;
      return NextResponse.json(await saveItems(o, items, st));
    }
    case 'guests': {
      const g = Math.max(0, Math.min(100, Number(body?.guests) || 0));
      return NextResponse.json(await saveItems(o, items, st, { guests: g }));
    }
    case 'send':
    case 'accept': {
      if (!items.some((l) => !l.sent)) return bad('Нет новых позиций для кухни');
      const r = await sendToKitchen(o, st);
      return NextResponse.json(r.order);
    }
    case 'precheck': {
      if (!items.length) return bad('Чек пустой');
      if (!st.printGuestChecks) return bad('Печать чеков для гостя выключена в настройках');
      await printCheck(o, st, 'precheck');
      return NextResponse.json(o);
    }
    case 'pay': {
      const p = posPay.safeParse(body);
      if (!p.success) return bad('Выберите способ оплаты');
      if (!items.length) return bad('Чек пустой');
      if (o.payStatus === 'paid') return bad('Заказ уже оплачен онлайн. Нажмите «Выдан».');
      if (items.some((l) => !l.sent)) return bad('Есть позиции, не отправленные на кухню');
      const paid = await saveItems(o, items, st, { status: 'done', paid_with: p.data.method, paid_at: new Date().toISOString(), pay_status: 'paid' });
      if (st.printGuestChecks) await printCheck(paid, st, 'receipt');
      return NextResponse.json(paid);
    }
    case 'cancel': {
      return NextResponse.json(await updateStatus(o.id, 'cancelled', st));
    }
    case 'eta': {
      const m = Math.max(-60, Math.min(120, Math.round(Number(body?.minutes) || 0)));
      if (!m) return bad('Укажите минуты');
      return NextResponse.json(await adjustEta(o, m));
    }
    case 'ready': {
      if (!items.some((l) => l.sent)) return bad('Сначала отправьте заказ на кухню');
      const idx = items.map((l, i) => (l.sent && l.ks !== 'ready' ? i : -1)).filter((i) => i >= 0);
      return NextResponse.json(idx.length ? await kitchenMove(o.id, idx, 'ready', st) : await updateStatus(o.id, 'ready', st));
    }
    case 'complete': {
      if (o.payStatus !== 'paid') return bad('Заказ не оплачен. Примите оплату.');
      if (items.some((l) => !l.sent)) return bad('Есть позиции, не отправленные на кухню');
      return NextResponse.json(await updateStatus(o.id, 'done', st));
    }
    case 'reprint': {
      if (!st.printGuestChecks) return bad('Печать чеков для гостя выключена в настройках');
      await printCheck(o, st, closed ? 'receipt' : 'precheck');
      return NextResponse.json(o);
    }
    default:
      return bad('Неизвестное действие');
  }
}
