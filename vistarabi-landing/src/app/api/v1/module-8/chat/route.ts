import { NextResponse } from 'next/server';
import { callLocalModel } from '@/lib/module-6/infrastructure/local-adapter';

export async function POST(request: Request) {
  try {
    const { message, context } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

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

    return NextResponse.json({ reply: response.text });
  } catch (error: any) {
    console.error('[Module 8 Chat] Error calling AI:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to communicate with AI' },
      { status: 500 }
    );
  }
}
