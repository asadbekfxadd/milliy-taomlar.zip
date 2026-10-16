import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { sendTest, setWebhook } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID)
    return NextResponse.json({ ok: false, description: 'Не заданы TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID' });
  const { action } = await req.json().catch(() => ({ action: '' }));
  const r: any = action === 'webhook' ? await setWebhook() : await sendTest();
  return NextResponse.json({ ok: Boolean(r?.ok), description: r?.description || '' });
}
