import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter';

/**
 * GET /api/user/data/export
 * GDPR Article 20 – Data Portability
 * Returns all user data as a downloadable JSON file.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Rate limit: 3 exports per minute
  const rl = checkRateLimit(getIdentifier(request, user.userId, 'export'), { limit: 3, windowMs: 60_000 });
  const headers = buildRateLimitHeaders(rl);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before exporting again.' },
      { status: 429, headers }
    );
  }

  try {
    // Collect all user data across all tables
    const [profile, projects] = await Promise.all([
      db.user.findUnique({
        where: { id: user.userId },
        select: { id: true, email: true, name: true, createdAt: true },
      }),
      db.project.findMany({
        where: { userId: user.userId },
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          sources: {
            select: {
              id: true,
              fileName: true,
              fileType: true,
              rowCount: true,
              colCount: true,
              uploadedAt: true,
            },
          },
        },
      }),
    ]);

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      gdprNotice: 'This export contains all personal data held by VistaraBI for your account.',
      data: {
        profile,
        projects,
      },
    };

    const jsonStr = JSON.stringify(exportPayload, null, 2);

    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="vistarabi-data-export-${new Date().toISOString().split('T')[0]}.json"`,
        'Cache-Control': 'no-store',
        ...Object.fromEntries(headers.entries()),
      },
    });
  } catch (err) {
    console.error('[GDPR Export] Error:', err);
    return NextResponse.json({ error: 'Failed to export data. Please try again.' }, { status: 500 });
  }
}
