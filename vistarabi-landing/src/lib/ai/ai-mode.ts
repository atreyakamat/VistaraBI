export type AIMode = 'local' | 'cloud';

export const AI_MODE_STORAGE_KEY = 'vbi-ai-mode';
export const AI_MODE_COOKIE_KEY = 'vbi-ai-mode';
export const AI_MODE_HEADER_KEY = 'x-ai-mode';

export function normalizeAIMode(value: unknown): AIMode | null {
    if (value === 'local' || value === 'cloud') return value;
    return null;
}

export function modeToPreferLocal(mode: AIMode): boolean {
    return mode === 'local';
}

export function preferLocalToMode(preferLocal: boolean): AIMode {
    return preferLocal ? 'local' : 'cloud';
}

export function getDefaultAIMode(): AIMode {
    if (process.env.NEXT_PUBLIC_DEFAULT_AI_MODE === 'local') return 'local';
    return 'cloud';
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
