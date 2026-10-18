import { NextResponse } from 'next/server';
import { guardAny } from '@/lib/auth';
import { q } from '@/lib/db';
import { getSettings } from '@/lib/data';
import { STATIONS } from '@/lib/pos';

export const dynamic = 'force-dynamic';

/** Print station polls here. A job is claimed for 60 s so two stations never print it twice. */
export async function GET(req: Request) {
  const g = await guardAny(['print', 'pos', 'kitchen']);
  if ('res' in g) return g.res;
  const stations = (new URL(req.url).searchParams.get('stations') || '').split(',').filter((s) => s in STATIONS);
  if (!stations.length) return NextResponse.json({ jobs: [] });
  const r = await q(
    `UPDATE print_jobs SET claimed_at = now()
      WHERE id IN (SELECT id FROM print_jobs
                    WHERE printed_at IS NULL AND station = ANY($1)
                      AND (claimed_at IS NULL OR claimed_at < now() - interval '60 seconds')
                      AND created_at > now() - interval '6 hours'
                    ORDER BY id LIMIT 5 FOR UPDATE SKIP LOCKED)
      RETURNING id, station, kind, body, created_at`,
    [stations],
  );
  const st = await getSettings();
  return NextResponse.json({ jobs: r.rows.sort((a, b) => a.id - b.id), paper: st.paper || '80' });
}

export async function POST(req: Request) {
  const g = await guardAny(['print', 'pos', 'kitchen']);
  if ('res' in g) return g.res;
  const b = await req.json().catch(() => ({}));
  if (b.action === 'done' && Number.isInteger(b.id)) {
    await q('UPDATE print_jobs SET printed_at = now() WHERE id = $1', [b.id]);
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'release' && Number.isInteger(b.id)) {
    await q('UPDATE print_jobs SET claimed_at = NULL WHERE id = $1 AND printed_at IS NULL', [b.id]);
    return NextResponse.json({ ok: true });
  }
  if (b.action === 'test' && b.station in STATIONS) {
    await q('INSERT INTO print_jobs (station, kind, body) VALUES ($1, $2, $3)', [b.station, 'test', JSON.stringify({ title: STATIONS[b.station], at: Date.now() })]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
}
