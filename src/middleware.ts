import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // оптимизатор картинок Next не нужен (next/image не используется), а на нём держатся уязвимости Next 14: закрываем адрес
  if (req.nextUrl.pathname === '/_next/image') return new NextResponse('Not found', { status: 404 });
  // staff area: pass the path on, so a sign-in redirect can come back to the same page
  if (/^\/(admin|pos|waiter|kitchen|print|courier|dispatch)(\/|$)/.test(req.nextUrl.pathname)) {
    const h = new Headers(req.headers);
    h.set('x-path', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.next({ request: { headers: h } });
  }
  /* Shareable language links: /menu?lang=ru remembers Russian and shows the clean URL. */
  const lang = req.nextUrl.searchParams.get('lang');
  if (lang !== 'uz' && lang !== 'ru') return NextResponse.next();
  const url = req.nextUrl.clone();
  url.searchParams.delete('lang');
  const res = NextResponse.redirect(url, 302);
  res.cookies.set('lang', lang, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  return res;
}

export const config = { matcher: ['/_next/image', '/((?!api|_next|art|staff|.*\\..*).*)'] };
