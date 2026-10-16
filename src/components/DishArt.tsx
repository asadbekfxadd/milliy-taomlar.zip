'use client';
import { useEffect, useRef, useState } from 'react';
import { photoSrc } from '@/lib/format';

/* Shows the uploaded photo when there is one, otherwise a lazily drawn canvas illustration. */
const cache = new Map<string, HTMLCanvasElement>();
let artMod: Promise<any> | null = null;
export const loadArt = () => (artMod ??= import('@/lib/art.js'));

export async function artBitmap(key: string, size: number) {
  const k = key + '@' + size;
  const hit = cache.get(k);
  if (hit) return hit;
  const m = await loadArt();
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const fn = m.ART[key] || m.ART.plov;
  if (key === 'kazanlive') m.LIVE.layers = null;
  fn(cv.getContext('2d'), size, size);
  if (key === 'kazanlive') m.LIVE.layers = null;
  cache.set(k, cv);
  return cv;
}

export default function DishArt({ art, photo, className = '', label = '', eager = false }: { art: string; photo?: string; className?: string; label?: string; eager?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const cvRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<'idle' | 'loaded' | 'photo-failed'>('idle');
  const usePhoto = Boolean(photo) && state !== 'photo-failed';

  // a photo can finish loading before hydration, when onLoad has no listener yet
  useEffect(() => {
    const im = imgRef.current;
    if (usePhoto && im?.complete) setState(im.naturalWidth > 0 ? 'loaded' : 'photo-failed');
  }, [usePhoto, photo]);

  useEffect(() => {
    if (usePhoto) return;
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const draw = async () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(innerWidth < 1020 ? 1.5 : 2, devicePixelRatio || 1);
      const size = Math.max(64, Math.min(1600, Math.round((Math.max(r.width, r.height) * dpr) / 64) * 64));
      const bmp = await artBitmap(art || 'plov', size);
      const cv = cvRef.current;
      if (cancelled || !cv) return;
      cv.width = cv.height = size;
      cv.getContext('2d')!.drawImage(bmp, 0, 0);
      setState('loaded');
    };
    if (eager || !('IntersectionObserver' in window)) {
      draw();
      return () => {
        cancelled = true;
      };
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          draw();
        }
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [art, usePhoto, eager]);

  return (
    <div ref={ref} className={`ph ${className}`} role="img" aria-label={label}>
      {state !== 'loaded' && <div className="shim" />}
      {usePhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={photoSrc(photo)}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={state === 'loaded' ? 'ld' : ''}
          onLoad={() => setState('loaded')}
          onError={() => setState('photo-failed')}
        />
      ) : (
        <canvas ref={cvRef} className={state === 'loaded' ? 'ld' : ''} />
      )}
    </div>
  );
}
