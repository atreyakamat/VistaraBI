import { NextRequest, NextResponse } from 'next/server';
import { validateStrategy } from '@/lib/module-8/strategy-validator';
import type { ForecastRequest } from '@/lib/module-8/types';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const strategicActionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  expectedUplift: z.number().finite(),
  rampDays: z.number().int().min(0),
  startDayOffset: z.number().int().min(0),
  regressors: z.record(z.string(), z.number().finite()).optional(),
});

const forecastRequestSchema = z.object({
  kpiHistory: z.array(
    z.object({
      date: z.string().min(1),
      value: z.number().finite(),
    })
  ).min(1),
  goalValue: z.number().finite(),
  horizonDays: z.number().int().min(1).max(1825),
  actions: z.array(strategicActionSchema),
  confidenceLevel: z.union([z.literal(0.8), z.literal(0.95)]),
  domain: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }


  try {
    const body = await request.json();
    const parsed = forecastRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid forecast request payload', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const result = await validateStrategy(parsed.data as ForecastRequest);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Forecast API Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

