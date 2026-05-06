import { NextRequest, NextResponse } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Roles that are allowed to access the dashboard
const DASHBOARD_ROLES = ['super_admin', 'admin', 'agency'];

// Dashboard route prefixes to protect
const PROTECTED_PATHS = [
  '/dashboard',
  '/candidates',
  '/requested',
  '/not-requested',
  '/fit-candidates',
  '/brokers',
  '/registration',
  '/cv-generator',
  '/generated-cvs',
  '/backup',
  '/settings',
  '/users',
];

// Super-admin only paths
const SUPER_ADMIN_ONLY = ['/users'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the request is for a protected path
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  // Quickly check if a session cookie exists (lightweight check, no DB call)
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    // No session at all — redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For super-admin-only paths we need to verify the role via an internal API call
  const isSuperAdminOnly = SUPER_ADMIN_ONLY.some((p) => pathname.startsWith(p));

  if (isSuperAdminOnly) {
    try {
      const sessionRes = await fetch(
        new URL('/api/auth/session', request.url),
        {
          headers: { cookie: request.headers.get('cookie') ?? '' },
          cache: 'no-store',
        }
      );
      const session = await sessionRes.json();
      const role: string = session?.user?.role ?? 'user';

      if (role !== 'super_admin') {
        // Authenticated but not super admin — redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch {
      // If session check fails, redirect to login to be safe
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/candidates/:path*',
    '/requested/:path*',
    '/not-requested/:path*',
    '/fit-candidates/:path*',
    '/brokers/:path*',
    '/registration/:path*',
    '/cv-generator/:path*',
    '/generated-cvs/:path*',
    '/backup/:path*',
    '/settings/:path*',
    '/users/:path*',
  ],
};
