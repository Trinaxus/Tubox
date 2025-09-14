import { NextResponse, NextRequest } from 'next/server';

// Protect admin section with middleware. Only allow if tubox_session cookie exists and role === 'admin'.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard /admin and its subpaths
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Allow access to the login page to avoid loops
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Read cookie
  const cookie = req.cookies.get('tubox_session')?.value;
  if (!cookie) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('message', 'Bitte melde dich an');
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  try {
    const session = JSON.parse(decodeURIComponent(cookie));
    if (session?.role === 'admin') {
      return NextResponse.next();
    }
  } catch (e) {
    // fallthrough to redirect
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('message', 'Zugriff verweigert');
  url.searchParams.set('redirect', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*'],
};
