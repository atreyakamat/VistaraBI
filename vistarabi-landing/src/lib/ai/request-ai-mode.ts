import type { NextRequest } from 'next/server';
import db from '@/lib/prisma';
import {
    AI_MODE_COOKIE_KEY,
    AI_MODE_HEADER_KEY,
    normalizeAIMode,
    modeToPreferLocal,
    modeToRoutingMode,
    preferLocalToMode,
    type AIMode,
    type AIRoutingMode,
} from './ai-mode';

function getEnvironmentDefaultMode(): AIMode {
    if (process.env.FORCE_GROQ === 'true') return 'cloud';
    if (process.env.PREFER_LOCAL === 'true') return 'auto';
    return 'cloud';
}

function readRequestMode(request: NextRequest, bodyPreferLocal?: boolean): AIMode | null {
    const headerMode = normalizeAIMode(request.headers.get(AI_MODE_HEADER_KEY));
    if (headerMode) return headerMode;

    const cookieMode = normalizeAIMode(request.cookies.get(AI_MODE_COOKIE_KEY)?.value);
    if (cookieMode) return cookieMode;

    if (typeof bodyPreferLocal === 'boolean') return preferLocalToMode(bodyPreferLocal);

    return null;
}

function readModeFromPreferences(preferences: unknown): AIMode | null {
    if (!preferences || typeof preferences !== 'object') return null;
    return normalizeAIMode((preferences as { aiMode?: unknown }).aiMode);
}

export function resolveAIModeFromRequest(
    request: NextRequest,
    bodyPreferLocal?: boolean
): AIMode {
    return readRequestMode(request, bodyPreferLocal) ?? getEnvironmentDefaultMode();
}

export async function resolveAIModeForUser(
    request: NextRequest,
    userId?: string,
    bodyPreferLocal?: boolean
): Promise<AIMode> {
    const explicitMode = readRequestMode(request, bodyPreferLocal);
    if (explicitMode) return explicitMode;

    if (userId && userId !== 'demo-user-id') {
        try {
            const user = await (db.user as any).findUnique({
                where: { id: userId },
                select: { preferences: true },
            });
            const savedMode = readModeFromPreferences(user?.preferences);
            if (savedMode) return savedMode;
        } catch {
            // Preference lookup should never block an AI route.
        }
    }

    return getEnvironmentDefaultMode();
}

export function resolveAIRoutingModeFromRequest(
    request: NextRequest,
    bodyPreferLocal?: boolean
): AIRoutingMode {
    return modeToRoutingMode(resolveAIModeFromRequest(request, bodyPreferLocal));
}

export async function resolveAIRoutingModeForUser(
    request: NextRequest,
    userId?: string,
    bodyPreferLocal?: boolean
): Promise<AIRoutingMode> {
    return modeToRoutingMode(await resolveAIModeForUser(request, userId, bodyPreferLocal));
}

export function resolvePreferLocalFromRequest(
    request: NextRequest,
    bodyPreferLocal?: boolean
): boolean {
    return modeToPreferLocal(resolveAIModeFromRequest(request, bodyPreferLocal));
}

export async function resolvePreferLocalForUser(
    request: NextRequest,
    userId?: string,
    bodyPreferLocal?: boolean
): Promise<boolean> {
    return modeToPreferLocal(await resolveAIModeForUser(request, userId, bodyPreferLocal));
}
