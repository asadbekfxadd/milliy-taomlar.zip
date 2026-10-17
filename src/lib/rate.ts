import 'server-only';

/** Small in-memory limiter (one Railway instance is enough for a restaurant). */
const hits = new Map<string, number[]>();

export function limited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return false;
}

export function clientIp(req: Request) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

/** Like `limited`, but only checks; call `record` after the action really happened. */
export function over(key: string, max: number, windowMs: number) {
  const now = Date.now();
  return (hits.get(key) ?? []).filter((t) => now - t < windowMs).length >= max;
}
export function record(key: string) {
  hits.set(key, [...(hits.get(key) ?? []), Date.now()]);
}
