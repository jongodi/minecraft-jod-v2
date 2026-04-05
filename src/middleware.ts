import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/auth';

// Routes that require admin authentication (page-level redirect)
const ADMIN_PAGE_ROUTES = ['/admin'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect admin pages (not API routes — those handle auth internally)
  const isAdminPage = ADMIN_PAGE_ROUTES.some(
    r => pathname === r || pathname.startsWith(r + '/')
  );

  if (isAdminPage) {
    const session = req.cookies.get(ADMIN_COOKIE)?.value ?? '';
    const expected = process.env.ADMIN_TOKEN;

    if (!expected || session !== expected) {
      // Redirect to login with ?next= for post-login redirect
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      // Don't redirect if already going to login (avoid loop)
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
