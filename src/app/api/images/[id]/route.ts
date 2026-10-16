import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!/^[a-f0-9]{24}$/.test(params.id)) return new Response('Not found', { status: 404 });
  const img = (await q('SELECT mime, width, height, data FROM images WHERE id = $1', [params.id])).rows[0];
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(img.data, {
    headers: {
      'content-type': img.mime,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-image-size': `${img.width}x${img.height}`,
    },
  });
}
