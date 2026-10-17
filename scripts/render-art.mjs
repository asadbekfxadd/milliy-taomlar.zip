// Renders every drawn dish illustration (src/lib/art.js) to static WebP files in public/art.
// Guests then download a small image instead of drawing canvases on their phone.
// Run after changing art.js:  node scripts/render-art.mjs   (needs: npm i -D @napi-rs/canvas)
import { createCanvas } from '@napi-rs/canvas';
import { copyFileSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
globalThis.document = { createElement: () => createCanvas(1, 1) };
const tmp = join(root, 'scripts', '.art.tmp.mjs');
copyFileSync(join(root, 'src/lib/art.js'), tmp);
const { ART } = await import(tmp + '?' + Date.now());
const skip = new Set(['kazanlive']);
let n = 0;
for (const size of [400, 800]) {
  const dir = join(root, 'public/art', String(size));
  mkdirSync(dir, { recursive: true });
  for (const [key, fn] of Object.entries(ART)) {
    if (skip.has(key)) continue;
    const cv = createCanvas(size, size);
    fn(cv.getContext('2d'), size, size);
    writeFileSync(join(dir, key + '.webp'), await cv.encode('webp', size > 500 ? 80 : 78));
    n++;
  }
}
console.log('rendered', n, 'images');
