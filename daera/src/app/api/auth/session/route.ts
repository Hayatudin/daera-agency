import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import prismaAuth from '@/lib/prisma-auth';

/**
 * GET /api/auth/session
 * Returns the current Better Auth session enriched with the user's role from DB.
 * Used by the middleware and the login page for role-based redirects.
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json(null);
    }

    // Fetch role from DB (Better Auth doesn't expose custom fields by default)
    const dbUser = await prismaAuth.user.findUnique({
      where:  { id: session.user.id },
      select: { role: true },
    });

    return NextResponse.json({
      ...session,
      user: {
        ...session.user,
        role: dbUser?.role ?? 'user',
      },
    });
  } catch {
    return NextResponse.json(null);
  }
}
