import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { isAdmin } from '@/lib/auth';
import { newId, q } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX = 15 * 1024 * 1024;

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Файл не получен' }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: 'Файл больше 15 МБ' }, { status: 413 });
  try {
    const input = Buffer.from(await file.arrayBuffer());
    // Auto-rotate, cap at 1800px, convert to WebP (smaller than JPEG at the same quality).
    const { data, info } = await sharp(input, { failOn: 'error' })
      .rotate()
      .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const id = newId();
    await q('INSERT INTO images (id, mime, width, height, data) VALUES ($1, $2, $3, $4, $5)', [id, 'image/webp', info.width, info.height, data]);
    return NextResponse.json({ id, width: info.width, height: info.height });
  } catch (e) {
    console.error('upload', e);
    return NextResponse.json({ error: 'Не удалось обработать изображение. Подойдут JPG, PNG, WebP, AVIF.' }, { status: 400 });
  }
}
