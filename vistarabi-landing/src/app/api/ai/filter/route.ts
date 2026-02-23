import { NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/ai/ollama-client';

export async function POST(req: Request) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const prompt = `You are a Dashboard AI Filter Assistant. Do not converse.
Given the user's natural language request, derive the visualization filters.

Dashboard filter capabilities:
1. granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly'
2. dateRange: '7d' | '30d' | '90d' | '1y' | 'all'

User query: "${query}"

Return ONLY valid JSON matching this structure:
{"granularity": "monthly", "dateRange": "30d"}

If the query doesn't specify one, make a reasonable guess based on the other (e.g. if they say "last 7 days", daily is a good granularity).
If they ask a random question, invent a default { "granularity": "monthly", "dateRange": "30d" }.
NO MARKDOWN. NO BACKTICKS. JUST RAW JSON.`;

        const responseString = await generateCompletion({
            model: process.env.OLLAMA_MODEL || 'qwen3:0.6b',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
        });

        const jsonMatch = responseString.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[AIFilter] No JSON match. Raw response:', responseString);
            return NextResponse.json({ error: 'Failed to parse AI intent' }, { status: 500 });
        }

        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[AIFilter] Parsed filters:', parsed);

        return NextResponse.json(parsed);
    } catch (e: any) {
        console.error('[AIFilter] Error parsing AI query:', e);
        return NextResponse.json({ error: e.message || 'AI request failed' }, { status: 500 });
    }
}
