import type { NextRequest } from 'next/server';
import { AI_MODE_COOKIE_KEY, AI_MODE_HEADER_KEY, normalizeAIMode, modeToPreferLocal } from './ai-mode';

export function resolvePreferLocalFromRequest(
    request: NextRequest,
    bodyPreferLocal?: boolean
): boolean {
    if (typeof bodyPreferLocal === 'boolean') return bodyPreferLocal;

    const headerMode = normalizeAIMode(request.headers.get(AI_MODE_HEADER_KEY));
    if (headerMode) return modeToPreferLocal(headerMode);

    const cookieMode = normalizeAIMode(request.cookies.get(AI_MODE_COOKIE_KEY)?.value);
    if (cookieMode) return modeToPreferLocal(cookieMode);

    return process.env.FORCE_GROQ !== 'true' && process.env.PREFER_LOCAL === 'true';
}
