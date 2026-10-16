import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

/* Two sessions:
   - admin (ADMIN_PASSWORD): /admin, and every staff screen;
   - staff (STAFF_PIN): /staff — waiter/cashier, kitchen screen, print station. */
const ADMIN = 'mt_admin';
const STAFF = 'mt_staff';
const TTL_ADMIN = 1000 * 60 * 60 * 24 * 14; // 14 days
const TTL_STAFF = 1000 * 60 * 60 * 24 * 30; // 30 days on a kitchen tablet

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

const same = (given: string, real: string | undefined, min: number) => Boolean(real && real.length >= min && safeEq(sign('pw:' + given), sign('pw:' + real)));
export const checkPassword = (pw: string) => same(pw, process.env.ADMIN_PASSWORD, 8);
export const checkStaffPin = (pin: string) => same(pin, process.env.STAFF_PIN, 4);

function issue(name: string, role: string, ttl: number) {
  const exp = Date.now() + ttl;
  cookies().set(name, `${exp}.${sign(role + ':' + exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ttl / 1000,
  });
}
function valid(name: string, role: string) {
  try {
    const v = cookies().get(name)?.value;
    if (!v) return false;
    const [exp, sig] = v.split('.');
    if (!exp || !sig || Number(exp) < Date.now()) return false;
    return safeEq(sig, sign(role + ':' + exp));
  } catch {
    return false;
  }
}

export const issueSession = () => issue(ADMIN, 'admin', TTL_ADMIN);
export const issueStaffSession = () => issue(STAFF, 'staff', TTL_STAFF);
export function clearSession() {
  cookies().delete(ADMIN);
}
export function clearStaffSession() {
  cookies().delete(STAFF);
}
export const isAdmin = () => valid(ADMIN, 'admin');
export const isStaff = () => isAdmin() || valid(STAFF, 'staff');
