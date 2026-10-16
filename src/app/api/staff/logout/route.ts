import { NextResponse } from 'next/server';
import { clearStaffSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  clearStaffSession();
  return NextResponse.json({ ok: true });
}
