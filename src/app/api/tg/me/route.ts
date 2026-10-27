import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/data';
import { balance, cfgOf } from '@/lib/loyalty';
import { prettyPhone } from '@/lib/format';
import { getTgUser, upsertTgUser, verifyInitData } from '@/lib/tgapp';
import { botUsername } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

/** Who opened the Mini App: name, the phone Telegram confirmed (if shared with the bot) and their points. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const u = verifyInitData(b?.initData);
  if (!u) return NextResponse.json({ error: 'not telegram' }, { status: 401 });
  const row = (await getTgUser(u.id)) || (await upsertTgUser(u));
  const st = await getSettings();
  const cfg = cfgOf(st);
  const bot = await botUsername().catch(() => null);
  return NextResponse.json({
    name: row.name,
    phone: row.phone ? prettyPhone(row.phone) : '',
    points: row.phone ? await balance(row.phone) : 0,
    loyalty: { enabled: cfg.enabled, earnPct: cfg.earnPct, maxRedeemPct: cfg.maxRedeemPct },
    shareLink: bot ? `https://t.me/${bot}?start=phone` : null,
  });
}
