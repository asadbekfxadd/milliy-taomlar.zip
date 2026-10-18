import 'server-only';
import { q } from './db';
import type { User } from './auth';

/** Who did what. Never throws: a failed log line must not break the action itself. */
export async function audit(u: Pick<User, 'name' | 'role'> | null, action: string, details = '') {
  try {
    await q('INSERT INTO audit_log (who, role, action, details) VALUES ($1, $2, $3, $4)', [u?.name || 'система', u?.role || '', action, details.slice(0, 2000)]);
  } catch (e) {
    console.error('audit', e);
  }
}
