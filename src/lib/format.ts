export const fmt = (n: number | string) =>
  Math.round(Number(n) || 0)
    .toLocaleString('ru-RU')
    .replace(/ |,/g, ' ');

export const photoSrc = (p?: string) => (!p ? '' : /^(https?:|data:|\/)/.test(p) ? p : `/api/images/${p}`);

/** Responsive sources for uploaded photos and Unsplash links (others are used as they are). */
export function photoSrcSet(p?: string) {
  if (!p) return undefined;
  if (/^[a-f0-9]{24}$/.test(p)) return [480, 960, 1600].map((w) => `/api/images/${p}?w=${w} ${w}w`).join(', ');
  if (/^https:\/\/images\.(unsplash|pexels)\.com\//.test(p)) return [480, 960, 1600].map((w) => `${p.replace(/([?&])w=\d+/, `$1w=${w}`)} ${w}w`).join(', ');
  return undefined;
}

/** "+998 90 123 45 67" style normalisation; returns null when the number is not Uzbek-shaped. */
export function normalizePhone(raw: string): string | null {
  const d = (raw || '').replace(/\D/g, '');
  if (d.length === 9) return '+998' + d;
  if (d.length === 12 && d.startsWith('998')) return '+' + d;
  return null;
}

export const prettyPhone = (p: string) => {
  const d = p.replace(/\D/g, '');
  if (d.length !== 12) return p;
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
};

export const handle = (s: string) => s.replace(/^@/, '').trim();
