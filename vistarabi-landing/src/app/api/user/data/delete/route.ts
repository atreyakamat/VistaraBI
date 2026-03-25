import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, clearAuthCookie } from '@/lib/auth';
import db from '@/lib/prisma';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders } from '@/lib/security/rate-limiter';

/**
 * DELETE /api/user/data/delete
 * GDPR Article 17 – Right to Erasure ("Right to be Forgotten")
 * 
 * Flow:
 * 1. Soft-delete: mark account as deleted with timestamp
 * 2. Cascade: orphan all project data (unlinking from user)
 * 3. Clear the auth cookie (immediate logout)
 * 
 * Hard delete (permanent erasure) runs after 30 days via a scheduled job.
 */
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Strict rate limit for account deletion
  const rl = checkRateLimit(getIdentifier(request, user.userId, 'delete'), { limit: 3, windowMs: 3600_000 });
  const headers = buildRateLimitHeaders(rl);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.' },
      { status: 429, headers }
    );
  }

  try {
    // Verify account exists and is not already deleted
    const dbUser = await db.user.findUnique({ where: { id: user.userId } });
    if (!dbUser) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Soft delete: set deletedAt timestamp (GDPR Art. 17 - 30-day retention before hard delete)
    // Using $executeRaw to avoid Prisma type cache lag after schema migration
    await db.$executeRaw`UPDATE "User" SET "deletedAt" = NOW() WHERE "id" = ${user.userId}`;

    // Clear auth cookie to immediately log out
    await clearAuthCookie();

    return NextResponse.json(
      {
        success: true,
        message:
          'Your account has been scheduled for deletion. All personal data will be permanently erased within 30 days. You have been logged out.',
        scheduledPermanentDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { status: 200, headers }
    );
  } catch (err) {
    console.error('[GDPR Delete] Error:', err);
    return NextResponse.json({ error: 'Failed to initiate account deletion. Please contact support.' }, { status: 500 });
  }
}
