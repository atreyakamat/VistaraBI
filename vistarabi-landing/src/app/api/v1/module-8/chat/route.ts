import { NextRequest, NextResponse } from 'next/server';
import { callLocalModel } from '@/lib/module-6/infrastructure/local-adapter';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { z } from 'zod';

const module8ChatRequestSchema = z.object({
  message: z.string().trim().min(1),
  context: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rl = checkRateLimit(getIdentifier(request, user.userId, 'module8-chat'), RATE_LIMITS.AI);
  const rlHeaders = buildRateLimitHeaders(rl);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'AI chat rate limit exceeded. Please wait before sending another prompt.' },
      { status: 429, headers: rlHeaders }
    );
  }

  try {
    const body = await request.json();
    const parsed = module8ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid chat request payload', details: parsed.error.issues },
        { status: 400, headers: rlHeaders }
      );
    }

    const { message, context } = parsed.data;

    const systemPrompt = `You are the VistaraBI AI Strategist, an expert business analyst and data scientist.
You are currently helping the user evaluate their goal strategy and Module 8 Monte Carlo forecasting results.

--- CURRENT SYSTEM CONTEXT (DO NOT REVEAL THE RAW JSON TO THE USER) ---
${context ? JSON.stringify(context, null, 2) : 'No active simulation data yet.'}
--- END CONTEXT ---

CRITICAL INSTRUCTIONS:
1. Provide a concise, highly professional response (max 2-3 short paragraphs).
2. If probability of success is low (<60%), suggest specific changes (e.g., lower target, increase uplift, extend ramp-up).
3. If probability is high (>80%), validate the strategy but remind them of the primary risk factor.
4. Always ground your advice in the "Live Context" numbers provided above.
5. Do NOT output markdown code blocks wrapping the entire response. Just text.`;

    const userMessage = `${message}`;

    // Call the local Ollama adapter (same one used by Module 6)
    // Temperature 0.3 for a mix of creativity and analytical precision
    const response = await callLocalModel(systemPrompt, userMessage, 0.3);

    return NextResponse.json({ reply: response.text }, { headers: rlHeaders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to communicate with AI';
    console.error('[Module 8 Chat] Error calling AI:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
