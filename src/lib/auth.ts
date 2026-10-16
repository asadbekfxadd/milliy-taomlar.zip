import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE = 'mt_admin';
const TTL = 1000 * 60 * 60 * 24 * 14; // 14 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 24) throw new Error('SESSION_SECRET is not set (min 24 chars)');
  return s;
}
const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

function safeEq(a: string, b: string) {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

export function checkPassword(pw: string) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real || real.length < 8) return false;
  // compare HMACs so length differences don't leak
  return safeEq(sign('pw:' + pw), sign('pw:' + real));
}

export function issueSession() {
  const exp = Date.now() + TTL;
  const value = `${exp}.${sign('admin:' + exp)}`;
  cookies().set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL / 1000,
  });
}

export function clearSession() {
  cookies().delete(COOKIE);
}

export function isAdmin(): boolean {
  try {
    const v = cookies().get(COOKIE)?.value;
    if (!v) return false;
    const [exp, sig] = v.split('.');
    if (!exp || !sig || Number(exp) < Date.now()) return false;
    return safeEq(sig, sign('admin:' + exp));
  } catch {
    return false;
  }
}
