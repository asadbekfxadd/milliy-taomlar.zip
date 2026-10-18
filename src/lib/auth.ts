import 'server-only';
import { cache } from 'react';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { q } from './db';
import { can, ROLES, type Perm, type Role } from './rbac';

/* One login for everyone who works in the restaurant.
   - Employees: pick your name, enter your PIN (each person has their own PIN and role).
   - Owner: ADMIN_PASSWORD from Railway always works, so the owner can never lock himself out.
   - STAFF_PIN (old shared PIN) still opens the cash desk until the first employee is added. */

const COOKIE = 'mt_user';
const TTL = 1000 * 60 * 60 * 24 * 14; // 14 days; tablets stay signed in

export type User = { id: string; name: string; role: Role };

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
export const checkOwnerPassword = (pw: string) => same(pw, process.env.ADMIN_PASSWORD, 8);
export const checkLegacyPin = (pin: string) => same(pin, process.env.STAFF_PIN, 4);

/* ---------- PIN hashing (scrypt, per-employee salt) ---------- */
export function hashPin(pin: string) {
  const salt = randomBytes(12).toString('base64url');
  return `${salt}:${scryptSync(pin, salt, 32, { N: 16384 }).toString('base64url')}`;
}
export function pinMatches(pin: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  return safeEq(scryptSync(pin, salt, 32, { N: 16384 }).toString('base64url'), hash);
}

/* ---------- session ---------- */
export function issueSession(u: User) {
  const exp = Date.now() + TTL;
  const body = Buffer.from(JSON.stringify(u)).toString('base64url');
  cookies().set(COOKIE, `${body}.${exp}.${sign(body + '.' + exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TTL / 1000,
  });
}
export function clearSession() {
  cookies().delete(COOKIE);
  // sessions from the previous version of the system
  cookies().delete('mt_admin');
  cookies().delete('mt_staff');
}

function readCookie(): User | null {
  try {
    const v = cookies().get(COOKIE)?.value;
    if (!v) return null;
    const [body, exp, sig] = v.split('.');
    if (!body || !exp || !sig || Number(exp) < Date.now()) return null;
    if (!safeEq(sig, sign(body + '.' + exp))) return null;
    const u = JSON.parse(Buffer.from(body, 'base64url').toString());
    return u && typeof u.id === 'string' && u.role in ROLES ? (u as User) : null;
  } catch {
    return null;
  }
}

/** Current user. Employees are re-checked in the database on every request, so a fired employee
    or a changed role takes effect immediately, without waiting for the cookie to expire. */
export const getUser = cache(async (): Promise<User | null> => {
  const u = readCookie();
  if (!u) return null;
  if (u.id === 'owner' || u.id === 'legacy') return u;
  try {
    const r = await q<{ name: string; role: Role; active: boolean }>('SELECT name, role, active FROM employees WHERE id = $1', [u.id]);
    const e = r.rows[0];
    if (!e || !e.active || !(e.role in ROLES)) return null;
    return { id: u.id, name: e.name, role: e.role };
  } catch {
    return null;
  }
});

/** API guard: `const g = await guard('menu'); if ('res' in g) return g.res;` */
export async function guard(p?: Perm): Promise<{ user: User } | { res: NextResponse }> {
  const user = await getUser();
  if (!user) return { res: NextResponse.json({ error: 'Войдите заново' }, { status: 401 }) };
  if (p && !can(user.role, p)) return { res: NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 }) };
  return { user };
}

/** Like guard, but any one of the permissions is enough. */
export async function guardAny(perms: Perm[]): Promise<{ user: User } | { res: NextResponse }> {
  const user = await getUser();
  if (!user) return { res: NextResponse.json({ error: 'Войдите заново' }, { status: 401 }) };
  if (!perms.some((p) => can(user.role, p))) return { res: NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 }) };
  return { user };
}

/** Page guard: sends to /login, or to the person's own start screen when the role has no access. */
export async function pageUser(p: Perm | Perm[], from: string): Promise<User> {
  const user = await getUser();
  if (!user) redirect('/login?next=' + encodeURIComponent(from));
  const ok = (Array.isArray(p) ? p : [p]).some((x) => can(user.role, x));
  if (!ok) redirect(ROLES[user.role].home === from ? '/login?switch=1' : ROLES[user.role].home);
  return user;
}

/** Shown on the public site: small editing hints for whoever can change the settings. */
export async function canEditSite() {
  const u = await getUser();
  return Boolean(u && can(u.role, 'settings'));
}
