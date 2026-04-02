// AI Health Check API Endpoint
// GET /api/v1/ai/health
// Returns the status of all configured AI providers

import { NextRequest, NextResponse } from 'next/server';
import { checkAIHealth } from '@/lib/ai/unified-ai-client';

export async function GET(request: NextRequest) {
    try {
        console.log('[AI-Health] Checking AI provider health...');

        const health = await checkAIHealth();

        const status = health.available.length > 0 ? 'healthy' : 'unhealthy';
        const httpStatus = health.available.length > 0 ? 200 : 503;

        return NextResponse.json({
            status,
            providers: {
                configured: health.configured,
                available: health.available,
                unavailable: health.unavailable,
            },
            timestamp: new Date().toISOString(),
        }, { status: httpStatus });

    } catch (error: any) {
        console.error('[AI-Health] Health check failed:', error);

        return NextResponse.json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
}
