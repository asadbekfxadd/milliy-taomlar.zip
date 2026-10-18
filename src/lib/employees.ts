import 'server-only';
import { newId, q } from './db';
import { hashPin, pinMatches } from './auth';
import { can, type Role } from './rbac';

export type Employee = { id: string; name: string; role: Role; phone: string; active: boolean; createdAt: string };

const map = (r: any): Employee => ({ id: r.id, name: r.name, role: r.role, phone: r.phone, active: r.active, createdAt: new Date(r.created_at).toISOString() });

export async function listEmployees(all = false) {
  const r = await q(`SELECT * FROM employees ${all ? '' : 'WHERE active'} ORDER BY active DESC, name`);
  return r.rows.map(map);
}

export async function employeeCount() {
  const r = await q<{ n: string }>('SELECT count(*) AS n FROM employees WHERE active');
  return Number(r.rows[0]?.n || 0);
}

export async function createEmployee(d: { name: string; role: Role; pin: string; phone?: string }) {
  const id = newId();
  await q('INSERT INTO employees (id, name, role, pin_hash, phone) VALUES ($1, $2, $3, $4, $5)', [id, d.name, d.role, hashPin(d.pin), d.phone || '']);
  return id;
}

export async function updateEmployee(id: string, d: { name?: string; role?: Role; pin?: string; phone?: string; active?: boolean }) {
  const sets: string[] = [];
  const vals: unknown[] = [id];
  const add = (col: string, v: unknown) => {
    vals.push(v);
    sets.push(`${col} = $${vals.length}`);
  };
  if (d.name !== undefined) add('name', d.name);
  if (d.role !== undefined) add('role', d.role);
  if (d.phone !== undefined) add('phone', d.phone);
  if (d.active !== undefined) add('active', d.active);
  if (d.pin) add('pin_hash', hashPin(d.pin));
  if (!sets.length) return;
  await q(`UPDATE employees SET ${sets.join(', ')} WHERE id = $1`, vals);
}

export async function checkEmployeePin(id: string, pin: string) {
  const r = await q('SELECT * FROM employees WHERE id = $1 AND active', [id]);
  const row = r.rows[0];
  if (!row || !pinMatches(pin, row.pin_hash)) return null;
  return map(row);
}

/** Manager approval at the cash desk: any active employee whose role may cancel items, found by PIN alone. */
export async function approverByPin(pin: string) {
  const r = await q('SELECT * FROM employees WHERE active');
  for (const row of r.rows) if (can(row.role, 'void') && pinMatches(pin, row.pin_hash)) return map(row);
  return null;
}
