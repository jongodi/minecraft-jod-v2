import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, isValidAdminToken } from '@/lib/auth';

const ADMIN_PAGE_ROUTES = ['/admin'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminPage = ADMIN_PAGE_ROUTES.some(
    r => pathname === r || pathname.startsWith(r + '/')
  );

  if (isAdminPage) {
    const session = req.cookies.get(ADMIN_COOKIE)?.value ?? '';

    if (!isValidAdminToken(session)) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      if (pathname !== '/admin/login') {
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
