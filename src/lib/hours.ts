import type { Settings } from './types';

/* Opening hours in Tashkent time. Used by the site (banner, disabled button) and by the server (rejects orders). */
const TZ = 'Asia/Tashkent';
export const DAY_UZ = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
export const DAY_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

const toMin = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  return m ? Math.min(24 * 60, +m[1] * 60 + +m[2]) : null;
};

/** Current weekday (0 = Sunday) and minutes since midnight in Tashkent. */
export function tashkentNow(d = new Date()) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day, min: +get('hour') * 60 + +get('minute') };
}

function openOn(st: Settings, day: number, min: number) {
  const a = toMin(st.openFrom || ''),
    b = toMin(st.openTo || '');
  if (a === null || b === null) return true; // hours not configured: always open
  if ((st.closedDays || []).includes(day)) return false;
  return b > a ? min >= a && min < b : min >= a || min < b; // past midnight
}

/** Is the restaurant taking orders now? Returns why not and when it opens next. */
export function orderWindow(st: Settings, d = new Date()) {
  if (st.ordersPaused) return { open: false as const, reason: 'paused' as const };
  const { day, min } = tashkentNow(d);
  if (openOn(st, day, min)) return { open: true as const };
  // next opening: today later, or the next working day
  const a = toMin(st.openFrom || '')!;
  for (let k = 0; k < 8; k++) {
    const dd = (day + k) % 7;
    if ((st.closedDays || []).includes(dd)) continue;
    if (k === 0 && min >= a) continue;
    return { open: false as const, reason: 'closed' as const, day: dd, inDays: k, at: st.openFrom! };
  }
  return { open: false as const, reason: 'closed' as const, day, inDays: 0, at: st.openFrom! };
}

/** A pre-order time "HH:MM" today must fall inside opening hours. */
export function timeInHours(st: Settings, hhmm: string) {
  const m = toMin(hhmm);
  if (m === null) return false;
  return openOn(st, tashkentNow().day, m);
}
