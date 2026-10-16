import { NextResponse } from 'next/server';
import { isStaff } from '@/lib/auth';
import { getOrder, setOrderStatus } from '@/lib/db';
import { getMenu, getSettings } from '@/lib/data';
import { posAdd, posLineEdit, posPay } from '@/lib/schemas';
import { printCheck, priceLine, saveItems, sendToKitchen } from '@/lib/pos';
import { refreshOrderMessage } from '@/lib/telegram';
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
      if (o.source === 'site') refreshOrderMessage(r.order).catch(() => {});
      return NextResponse.json(r.order);
    }
    case 'precheck': {
      if (!items.length) return bad('Чек пустой');
      await printCheck(o, st, 'precheck');
      return NextResponse.json(o);
    }
    case 'pay': {
      const p = posPay.safeParse(body);
      if (!p.success) return bad('Выберите способ оплаты');
      if (!items.length) return bad('Чек пустой');
      if (items.some((l) => !l.sent)) return bad('Есть позиции, не отправленные на кухню');
      const paid = await saveItems(o, items, st, { status: 'done', paid_with: p.data.method, paid_at: new Date().toISOString() });
      await printCheck(paid, st, 'receipt');
      if (o.source === 'site') refreshOrderMessage(paid).catch(() => {});
      return NextResponse.json(paid);
    }
    case 'cancel': {
      const c = await setOrderStatus(o.id, 'cancelled');
      if (c && o.source === 'site') refreshOrderMessage(c).catch(() => {});
      return NextResponse.json(c);
    }
    case 'reprint': {
      await printCheck(o, st, closed ? 'receipt' : 'precheck');
      return NextResponse.json(o);
    }
    default:
      return bad('Неизвестное действие');
  }
}
