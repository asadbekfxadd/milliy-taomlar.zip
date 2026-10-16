import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/data';
import { clientIp, limited } from '@/lib/rate';
import { findPromo } from '@/lib/promo';

export const dynamic = 'force-dynamic';

/* Checks one code; the list of codes is never sent to the browser. */
export async function GET(req: Request) {
  if (limited('promo:' + clientIp(req), 12, 10 * 60_000)) return NextResponse.json({ error: 'rate' }, { status: 429 });
  const code = new URL(req.url).searchParams.get('code') || '';
  const p = findPromo(await getSettings(), code);
  if (!p) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ code: p.code, pct: p.pct, fixed: p.fixed, min: p.min });
}
