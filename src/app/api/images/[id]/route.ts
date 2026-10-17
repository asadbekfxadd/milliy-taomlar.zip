import sharp from 'sharp';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* Uploaded photos. ?w=480|960|1600 returns a resized copy so phones don't download the 1800px original. */
const WIDTHS = new Set([480, 960, 1600]);
const cache = new Map<string, Buffer>();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!/^[a-f0-9]{24}$/.test(params.id)) return new Response('Not found', { status: 404 });
  const w = Number(new URL(req.url).searchParams.get('w')) || 0;
  const key = params.id + ':' + w;
  let body = cache.get(key);
  if (!body) {
    const img = (await q('SELECT data, width FROM images WHERE id = $1', [params.id])).rows[0];
    if (!img) return new Response('Not found', { status: 404 });
    body = WIDTHS.has(w) && img.width > w ? await sharp(img.data).resize({ width: w }).webp({ quality: 80 }).toBuffer() : (img.data as Buffer);
    cache.set(key, body);
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
  }
  return new Response(body, { headers: { 'content-type': 'image/webp', 'cache-control': 'public, max-age=31536000, immutable' } });
}
