'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { preferLocalToMode, readClientAIMode, type AIMode, writeClientAIMode } from './ai-mode';

export function useAIMode() {
    const [mode, setModeState] = useState<AIMode>(readClientAIMode);

    useEffect(() => {
        writeClientAIMode(mode);
    }, [mode]);

    const setMode = useCallback((nextMode: AIMode) => {
        setModeState(nextMode);
    }, []);

    const setPreferLocal = useCallback((preferLocal: boolean) => {
        setModeState(preferLocalToMode(preferLocal));
    }, []);

    const toggleMode = useCallback(() => {
        setModeState(prev => (prev === 'local' ? 'cloud' : 'local'));
    }, []);

    const preferLocal = useMemo(() => mode === 'local', [mode]);

    return {
        mode,
        preferLocal,
        setMode,
        setPreferLocal,
        toggleMode,
    };
}
