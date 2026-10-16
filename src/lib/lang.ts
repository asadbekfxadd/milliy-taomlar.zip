import 'server-only';
import { cookies } from 'next/headers';
import { isLang, LANG_COOKIE, type Lang } from './i18n';

/** Guest language from the cookie set by the UZ/RU switch; Uzbek by default. */
export function getLang(): Lang {
  const v = cookies().get(LANG_COOKIE)?.value;
  return isLang(v) ? v : 'uz';
}
