export type AIMode = 'local' | 'cloud' | 'auto';
export type AIRoutingMode = 'local-only' | 'cloud-first' | 'auto';

export const AI_MODE_STORAGE_KEY = 'vbi-ai-mode';
export const AI_MODE_COOKIE_KEY = 'vbi-ai-mode';
export const AI_MODE_HEADER_KEY = 'x-ai-mode';

export function normalizeAIMode(value: unknown): AIMode | null {
    if (value === 'local' || value === 'cloud' || value === 'auto') return value;
    return null;
}

export function modeToPreferLocal(mode: AIMode): boolean {
    return mode !== 'cloud';
}

export function modeToRoutingMode(mode: AIMode): AIRoutingMode {
    if (mode === 'local') return 'local-only';
    if (mode === 'cloud') return 'cloud-first';
    return 'auto';
}

export function preferLocalToMode(preferLocal: boolean): AIMode {
    return preferLocal ? 'local' : 'cloud';
}

export function getDefaultAIMode(): AIMode {
    const configured = normalizeAIMode(process.env.NEXT_PUBLIC_DEFAULT_AI_MODE);
    if (configured) return configured;
    if (process.env.NEXT_PUBLIC_DEFAULT_AI_MODE === 'local') return 'local';
    return 'auto';
}

export function readClientAIMode(): AIMode {
    if (typeof window === 'undefined') return getDefaultAIMode();
    const fromStorage = normalizeAIMode(window.localStorage.getItem(AI_MODE_STORAGE_KEY));
    return fromStorage ?? getDefaultAIMode();
}

export function writeClientAIMode(mode: AIMode): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(AI_MODE_STORAGE_KEY, mode);
    document.cookie = `${AI_MODE_COOKIE_KEY}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

export function getClientAIModeHeaders(): Record<string, string> {
    const mode = readClientAIMode();
    return { [AI_MODE_HEADER_KEY]: mode };
}
