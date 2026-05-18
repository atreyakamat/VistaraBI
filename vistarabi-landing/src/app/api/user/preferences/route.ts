import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { normalizeAIMode, type AIMode } from '@/lib/ai/ai-mode';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter';

type UserPreferences = {
    aiMode: AIMode;
    [key: string]: unknown;
};

function normalizePreferences(value: unknown): UserPreferences {
    const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return {
        ...source,
        aiMode: normalizeAIMode(source.aiMode) ?? 'auto',
    };
}

export async function GET(_request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ preferences: normalizePreferences(null), demo: true });
    }

    if (user.userId === 'demo-user-id') {
        return NextResponse.json({ preferences: normalizePreferences(null), demo: true });
    }

    const dbUser = await (prisma.user as any).findUnique({
        where: { id: user.userId },
        select: { preferences: true },
    });

    return NextResponse.json({
        preferences: normalizePreferences(dbUser?.preferences),
    });
}

export async function PATCH(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const rl = checkRateLimit(getIdentifier(request, user.userId, 'preferences'), RATE_LIMITS.API);
    const rlHeaders = buildRateLimitHeaders(rl);
    if (!rl.success) {
        return NextResponse.json(
            { error: 'Preference update rate limit exceeded.' },
            { status: 429, headers: rlHeaders }
        );
    }

    const body = await request.json().catch(() => ({}));
    const aiMode = normalizeAIMode((body as { aiMode?: unknown }).aiMode);
    if (!aiMode) {
        return NextResponse.json(
            { error: 'aiMode must be one of: local, cloud, auto' },
            { status: 400, headers: rlHeaders }
        );
    }

    if (user.userId === 'demo-user-id') {
        return NextResponse.json({ preferences: normalizePreferences({ aiMode }), demo: true }, { headers: rlHeaders });
    }

    const dbUser = await (prisma.user as any).findUnique({
        where: { id: user.userId },
        select: { preferences: true },
    });
    const preferences = normalizePreferences(dbUser?.preferences);
    preferences.aiMode = aiMode;

    const updated = await (prisma.user as any).update({
        where: { id: user.userId },
        data: { preferences },
        select: { preferences: true },
    });

    return NextResponse.json({ preferences: normalizePreferences(updated.preferences) }, { headers: rlHeaders });
}
