import { NextResponse, type NextRequest } from 'next/server';

/* Shareable language links: /menu?lang=ru remembers Russian and shows the clean URL. */
export function middleware(req: NextRequest) {
  const lang = req.nextUrl.searchParams.get('lang');
  if (lang !== 'uz' && lang !== 'ru') return NextResponse.next();
  const url = req.nextUrl.clone();
  url.searchParams.delete('lang');
  const res = NextResponse.redirect(url, 302);
  res.cookies.set('lang', lang, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  return res;
}

export const config = { matcher: ['/((?!api|_next|art|staff|admin|.*\\..*).*)'] };
