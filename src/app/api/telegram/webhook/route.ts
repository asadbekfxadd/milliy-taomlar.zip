import { setOrderStatus } from '@/lib/db';
import { answerCallback, refreshOrderMessage, STATUS_RU } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
const ALLOWED = ['accepted', 'cooking', 'ready', 'done', 'cancelled'];

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) return new Response('forbidden', { status: 403 });

  const u = await req.json().catch(() => null);
  const cq = u?.callback_query;
  if (!cq) return Response.json({ ok: true });

  // Only the restaurant chat may change statuses.
  if (String(cq.message?.chat?.id) !== String(process.env.TELEGRAM_CHAT_ID)) {
    await answerCallback(cq.id, 'Нет доступа');
    return Response.json({ ok: true });
  }
  const [kind, id, status] = String(cq.data || '').split(':');
  if (kind !== 'st' || !id || !ALLOWED.includes(status)) {
    await answerCallback(cq.id, 'Неизвестная команда');
    return Response.json({ ok: true });
  }
  const o = await setOrderStatus(id, status).catch(() => null);
  if (!o) {
    await answerCallback(cq.id, 'Заказ не найден');
    return Response.json({ ok: true });
  }
  await refreshOrderMessage(o);
  await answerCallback(cq.id, `№ ${o.no}: ${STATUS_RU[status]}`);
  return Response.json({ ok: true });
}
