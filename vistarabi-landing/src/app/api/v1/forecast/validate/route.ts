import { NextRequest, NextResponse } from 'next/server';
import { validateStrategy } from '@/lib/module-8/strategy-validator';
import { ForecastRequest } from '@/lib/module-8/types';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Rate limit: 30 forecast requests per minute per user
  const rl = checkRateLimit(getIdentifier(request, user.userId, 'forecast'), { limit: 30, windowMs: 60_000 });
  const rlHeaders = buildRateLimitHeaders(rl);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Forecast rate limit exceeded. Please wait before running more simulations.' },
      { status: 429, headers: rlHeaders }
    );
  }

  try {
    const body: ForecastRequest = await request.json();
    
    // Input validation
    if (!body.kpiHistory || !Array.isArray(body.kpiHistory) || body.kpiHistory.length === 0) {
      return NextResponse.json({ error: 'kpiHistory is required and must be a non-empty array' }, { status: 400 });
    }
    if (!body.goalValue || typeof body.goalValue !== 'number') {
      return NextResponse.json({ error: 'goalValue is required and must be a number' }, { status: 400 });
    }
    if (!body.horizonDays || typeof body.horizonDays !== 'number' || body.horizonDays < 1 || body.horizonDays > 1825) {
      return NextResponse.json({ error: 'horizonDays must be a number between 1 and 1825' }, { status: 400 });
    }
    if (!body.actions || !Array.isArray(body.actions)) {
      return NextResponse.json({ error: 'actions must be an array' }, { status: 400 });
    }

    const result = await validateStrategy(body);
    return NextResponse.json(result, { headers: rlHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Forecast API Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

