import { NextResponse } from 'next/server';
import { checkOwnerPassword, guardAny } from '@/lib/auth';
import { getOrder, q } from '@/lib/db';
import { getMenu, getSettings } from '@/lib/data';
import { posAdd, posLineEdit, posPay } from '@/lib/schemas';
import { adjustEta, kitchenMove, printCheck, priceLine, saveItems, sendToKitchen, updateStatus, voidLine } from '@/lib/pos';
import { approverByPin } from '@/lib/employees';
import { currentShift } from '@/lib/shifts';
import { audit } from '@/lib/audit';
import { can } from '@/lib/rbac';
import type { OrderItem } from '@/lib/types';

export const dynamic = 'force-dynamic';
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const money = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ');

/** One endpoint per check; `action` says what the waiter/cashier pressed. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await guardAny(['pos', 'waiter']);
  if ('res' in g) return g.res;
  const me = g.user;
  const body = await req.json().catch(() => null);
  const action = String(body?.action || '');
  const [o, menu, st] = await Promise.all([getOrder(params.id), getMenu(), getSettings()]);
  if (!o) return bad('Чек не найден', 404);
  const closed = ['done', 'cancelled'].includes(o.status);
  if (closed && action !== 'reprint') return bad('Чек уже закрыт');
  const items: OrderItem[] = (o.items as OrderItem[]).map((l) => ({ ...l }));
  const cashier = can(me.role, 'pos');

  /** Someone allowed to cancel: the person themself, or a manager who typed their PIN on this device. */
  async function approver() {
    if (can(me.role, 'void')) return me.name;
    const pin = String(body?.pin || '');
    if (!pin) return null;
    if (checkOwnerPassword(pin)) return 'Владелец';
    return (await approverByPin(pin))?.name || null;
  }

  switch (action) {
    case 'add': {
      const p = posAdd.safeParse(body);
      if (!p.success) return bad('Неверные позиции');
      for (const i of p.data.items) {
        const line = priceLine(menu, st, i);
        if (typeof line === 'string') return bad(line);
        // same dish, same options, not yet sent → just bump the quantity
        const same = items.find((l) => !l.sent && !l.void && l.id === line.id && l.mods === line.mods && (l.note || '') === (line.note || ''));
        if (same) same.qty += line.qty;
        else items.push(line);
      }
      return NextResponse.json(await saveItems(o, items, st));
    }
    case 'qty': {
      const p = posLineEdit.safeParse(body);
      if (!p.success || !items[p.data.line]) return bad('Нет такой позиции');
      if (items[p.data.line].sent) return bad('Позиция уже на кухне. Отменить её может управляющий.');
      if (p.data.qty === 0) items.splice(p.data.line, 1);
      else items[p.data.line].qty = p.data.qty;
      return NextResponse.json(await saveItems(o, items, st));
    }
    case 'note': {
      const i = Number(body?.line);
      if (!items[i] || items[i].sent) return bad('Комментарий можно поменять до отправки на кухню');
      items[i].note = String(body?.note || '').slice(0, 200);
      return NextResponse.json(await saveItems(o, items, st));
    }
    case 'guests': {
      const gn = Math.max(0, Math.min(100, Number(body?.guests) || 0));
      return NextResponse.json(await saveItems(o, items, st, { guests: gn }));
    }
    case 'take': {
      // a waiter takes over a table (shift change, colleague went home)
      const r = await saveItems(o, items, st, { waiter: me.name, waiter_id: me.id });
      await audit(me, 'Стол передан', `чек № ${o.no}: ${o.waiter || '—'} → ${me.name}`);
      return NextResponse.json(r);
    }
    case 'move': {
      const to = Number(body?.table);
      if (o.type !== 'hall') return bad('Пересадить можно только чек зала');
      if (!Number.isInteger(to) || to < 1 || to > (st.tables || 0)) return bad('Нет такого стола');
      const busy = await q(`SELECT no FROM orders WHERE type = 'hall' AND table_no = $1 AND status NOT IN ('done','cancelled') AND id <> $2 LIMIT 1`, [to, o.id]);
      if (busy.rows[0]) return bad(`Стол ${to} занят (чек № ${busy.rows[0].no})`);
      const r = await saveItems(o, items, st, { table_no: to, name: `Стол ${to}` });
      await audit(me, 'Гости пересажены', `чек № ${o.no}: стол ${o.tableNo} → ${to}`);
      return NextResponse.json(r);
    }
    case 'send':
    case 'accept': {
      if (!items.some((l) => !l.sent && !l.void)) return bad('Нет новых позиций для кухни');
      const r = await sendToKitchen(o, st);
      return NextResponse.json(r.order);
    }
    case 'precheck': {
      if (!items.some((l) => !l.void)) return bad('Чек пустой');
      if (!st.printGuestChecks) return bad('Печать чеков выключена: Настройки → Зал, кухня и печать');
      await printCheck(o, st, 'precheck');
      return NextResponse.json(o);
    }
    case 'void': {
      const i = Number(body?.line);
      const reason = String(body?.reason || '').trim().slice(0, 120);
      if (!items[i] || !items[i].sent || items[i].void) return bad('Нет такой позиции на кухне');
      if (!reason) return bad('Укажите причину отмены');
      const by = await approver();
      if (!by) return bad(body?.pin ? 'PIN управляющего не подошёл' : 'Нужен PIN управляющего', 403);
      const n = Math.max(1, Math.min(items[i].qty, Number(body?.qty) || items[i].qty));
      const r = await voidLine(o, i, n, reason, by, st);
      await audit(me, 'Отмена позиции', `чек № ${o.no}: ${items[i].name} × ${n}, ${money(items[i].unit * n)} сум. Причина: ${reason}. Разрешил: ${by}`);
      return NextResponse.json(r);
    }
    case 'pay': {
      if (!cashier) return bad('Оплату принимает кассир', 403);
      const p = posPay.safeParse(body);
      if (!p.success) return bad('Выберите способ оплаты');
      const live = items.filter((l) => !l.void);
      if (!live.length) return bad('Чек пустой');
      if (o.payStatus === 'paid') return bad('Заказ уже оплачен онлайн. Нажмите «Выдан».');
      if (live.some((l) => !l.sent)) return bad('Есть позиции, не отправленные на кухню');
      const shift = await currentShift();
      if (!shift) return bad('Сначала откройте смену кассы');
      const tips = Math.max(0, Math.min(10_000_000, Math.round(Number(body?.tips) || 0)));
      const paid = await saveItems(o, items, st, { status: 'done', paid_with: p.data.method, paid_at: new Date().toISOString(), pay_status: 'paid', tips, cashier: me.name, shift_id: shift.id });
      if (st.printGuestChecks) await printCheck(paid, st, 'receipt');
      return NextResponse.json(paid);
    }
    case 'cancel': {
      const reason = String(body?.reason || '').trim().slice(0, 120);
      const touched = items.some((l) => l.sent && !l.void);
      let by = me.name;
      if (touched) {
        if (!reason) return bad('Укажите причину отмены');
        const a = await approver();
        if (!a) return bad(body?.pin ? 'PIN управляющего не подошёл' : 'Чек уже на кухне: нужен PIN управляющего', 403);
        by = a;
      }
      await q('UPDATE orders SET cancel_reason = $2 WHERE id = $1', [o.id, reason ? `${reason} (${by})` : by]);
      const r = await updateStatus(o.id, 'cancelled', st);
      if (touched || o.total > 0) await audit(me, 'Чек отменён', `№ ${o.no}, ${money(o.total)} сум${reason ? '. Причина: ' + reason : ''}. Разрешил: ${by}`);
      return NextResponse.json(r);
    }
    case 'eta': {
      const m = Math.max(-60, Math.min(120, Math.round(Number(body?.minutes) || 0)));
      if (!m) return bad('Укажите минуты');
      return NextResponse.json(await adjustEta(o, m));
    }
    case 'ready': {
      if (!items.some((l) => l.sent && !l.void)) return bad('Сначала отправьте заказ на кухню');
      const idx = items.map((l, i) => (l.sent && !l.void && l.ks !== 'ready' ? i : -1)).filter((i) => i >= 0);
      return NextResponse.json(idx.length ? await kitchenMove(o.id, idx, 'ready', st) : await updateStatus(o.id, 'ready', st));
    }
    case 'complete': {
      if (!cashier) return bad('Выдачу закрывает кассир', 403);
      if (o.payStatus !== 'paid') return bad('Заказ не оплачен. Примите оплату.');
      if (items.some((l) => !l.sent && !l.void)) return bad('Есть позиции, не отправленные на кухню');
      const shift = await currentShift();
      if (shift) await q('UPDATE orders SET shift_id = $2, cashier = $3 WHERE id = $1', [o.id, shift.id, me.name]);
      return NextResponse.json(await updateStatus(o.id, 'done', st));
    }
    case 'reprint': {
      if (!st.printGuestChecks) return bad('Печать чеков выключена: Настройки → Зал, кухня и печать');
      await printCheck(o, st, closed ? 'receipt' : 'precheck');
      return NextResponse.json(o);
    }
    default:
      return bad('Неизвестное действие');
  }
}
