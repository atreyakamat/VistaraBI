import { NextResponse } from 'next/server';

// GET /api/health — used by Render to verify the app is running
// Returns 200 with service status — Render will restart the service if this fails
export async function GET() {
    const checks: Record<string, string> = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? 'unknown',
    };

    // Check DB connectivity (non-blocking check)
    try {
        const { default: prisma } = await import('@/lib/prisma');
        await prisma.$queryRaw`SELECT 1`;
        checks.database = 'connected';
    } catch {
        checks.database = 'unreachable';
        // Don't fail the health check for DB — app can still serve cached pages
    }

    // Check AI provider
    checks.ai = process.env.GROQ_API_KEY
        ? 'groq'
        : process.env.OPENROUTER_API_KEY
        ? 'openrouter'
        : process.env.OLLAMA_URL
        ? 'ollama'
        : 'none';

    return NextResponse.json(checks, { status: 200 });
}
