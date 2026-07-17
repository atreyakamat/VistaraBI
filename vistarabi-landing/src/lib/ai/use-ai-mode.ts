'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { preferLocalToMode, readClientAIMode, type AIMode, writeClientAIMode, getDefaultAIMode, normalizeAIMode, AI_MODE_STORAGE_KEY } from './ai-mode';

export function useAIMode() {
    const [mode, setModeState] = useState<AIMode>(getDefaultAIMode());
    const [loadedFromProfile, setLoadedFromProfile] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const fromStorage = normalizeAIMode(window.localStorage.getItem(AI_MODE_STORAGE_KEY));
            if (fromStorage) setModeState(fromStorage);
        }
    }, []);

    useEffect(() => {
        writeClientAIMode(mode);
    }, [mode]);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/user/preferences')
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                const savedMode = data?.preferences?.aiMode;
                if (!cancelled && (savedMode === 'local' || savedMode === 'cloud' || savedMode === 'auto')) {
                    setModeState(savedMode);
                }
            })
            .catch(() => { /* anonymous/demo sessions can keep the client default */ })
            .finally(() => {
                if (!cancelled) setLoadedFromProfile(true);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const persistMode = useCallback((nextMode: AIMode) => {
        fetch('/api/user/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aiMode: nextMode }),
        }).catch(() => { /* keep local preference even if server persistence is unavailable */ });
    }, []);

    const setMode = useCallback((nextMode: AIMode) => {
        setModeState(nextMode);
        persistMode(nextMode);
    }, [persistMode]);

    const setPreferLocal = useCallback((preferLocal: boolean) => {
        const nextMode = preferLocalToMode(preferLocal);
        setModeState(nextMode);
        persistMode(nextMode);
    }, [persistMode]);

    const toggleMode = useCallback(() => {
        setModeState(prev => {
            const nextMode = prev === 'cloud' ? 'local' : 'cloud';
            persistMode(nextMode);
            return nextMode;
        });
    }, [persistMode]);

    const preferLocal = useMemo(() => mode !== 'cloud', [mode]);

    return {
        mode,
        preferLocal,
        loadedFromProfile,
        setMode,
        setPreferLocal,
        toggleMode,
    };
}
