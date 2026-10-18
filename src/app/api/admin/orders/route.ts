import { NextResponse } from 'next/server';
import { guard } from '@/lib/auth';
import { mapOrder, q } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Order history with simple filters: ?status=open|done|cancelled&type=hall|pickup|delivery&q=phone/name/№&days=1|7|30 */
export async function GET(req: Request) {
  const g = await guard('orders');
  if ('res' in g) return g.res;
  const sp = new URL(req.url).searchParams;
  const cond: string[] = [];
  const vals: unknown[] = [];
  const st = sp.get('status');
  if (st === 'open') cond.push(`status NOT IN ('done','cancelled')`);
  else if (st === 'done' || st === 'cancelled') cond.push(`status = $${vals.push(st)}`);
  const type = sp.get('type');
  if (type === 'hall' || type === 'pickup' || type === 'delivery') cond.push(`type = $${vals.push(type)}`);
  if (sp.get('source') === 'site') cond.push(`source = 'site'`);
  const days = Math.min(365, Math.max(1, Number(sp.get('days')) || 7));
  cond.push(`created_at > now() - make_interval(days => $${vals.push(days)})`);
  const s = (sp.get('q') || '').trim();
  if (s) {
    const digits = s.replace(/\D/g, '');
    if (/^\d{1,6}$/.test(s)) cond.push(`(no = $${vals.push(Number(s))} OR phone LIKE $${vals.push('%' + s + '%')})`);
    else cond.push(`(name ILIKE $${vals.push('%' + s + '%')}${digits.length >= 4 ? ` OR phone LIKE $${vals.push('%' + digits + '%')}` : ''})`);
  }
  cond.push(`NOT (source = 'pos' AND jsonb_array_length(items) = 0 AND status = 'cancelled')`);
  const r = await q(`SELECT * FROM orders WHERE ${cond.join(' AND ')} ORDER BY created_at DESC LIMIT 300`, vals);
  return NextResponse.json(
    r.rows.map((row) => {
      const { token, tgMessageId, ...o } = mapOrder(row);
      return o;
    }),
  );
}
