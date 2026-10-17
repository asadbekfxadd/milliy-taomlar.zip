'use client';
import { useEffect, useRef, useState } from 'react';
import { photoSrc, photoSrcSet } from '@/lib/format';

/* A dish picture: the uploaded photo when there is one, otherwise the pre-rendered illustration
   (public/art, made by scripts/render-art.mjs). Both are plain lazy images, so phones do no drawing. */
const cache = new Map<string, HTMLCanvasElement>();
let artMod: Promise<any> | null = null;
export const loadArt = () => (artMod ??= import('@/lib/art.js'));

/** Live canvas drawing — only the animated grill scene still needs it. */
export async function artBitmap(key: string, size: number) {
  const k = key + '@' + size;
  const hit = cache.get(k);
  if (hit) return hit;
  const m = await loadArt();
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  (m.ART[key] || m.ART.plov)(cv.getContext('2d'), size, size);
  cache.set(k, cv);
  return cv;
}

const artSrc = (art: string, size: 400 | 800) => `/art/${size}/${encodeURIComponent(art || 'plov')}.webp`;

export default function DishArt({
  art,
  photo,
  className = '',
  label = '',
  eager = false,
  sizes = '(max-width: 640px) 45vw, 360px',
}: {
  art: string;
  photo?: string;
  className?: string;
  label?: string;
  eager?: boolean;
  sizes?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const usePhoto = Boolean(photo) && !failed;

  // reset when the picture changes
  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [photo, art]);

  // the image may have finished before hydration attached onLoad/onError
  useEffect(() => {
    const im = imgRef.current;
    if (im?.complete) {
      if (im.naturalWidth > 0) setLoaded(true);
      else if (usePhoto) setFailed(true);
    }
  }, [usePhoto]);

  const src = usePhoto ? photoSrc(photo) : artSrc(art, 800);
  return (
    <div className={`ph ${className} ${usePhoto ? 'is-photo' : 'is-art'}`} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
      {!loaded && <div className="shim" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        ref={imgRef}
        src={src}
        srcSet={usePhoto ? photoSrcSet(photo) : `${artSrc(art, 400)} 400w, ${artSrc(art, 800)} 800w`}
        sizes={sizes}
        alt=""
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className={loaded ? 'ld' : ''}
        onLoad={() => setLoaded(true)}
        onError={() => (usePhoto ? setFailed(true) : setLoaded(true))}
      />
    </div>
  );
}
