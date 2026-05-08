'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface OllamaStatus {
    available: boolean;
    model?: string;
    responseTimeMs?: number;
    error?: string;
}

export function OllamaHealthBanner() {
    const [status, setStatus] = useState<OllamaStatus | null>(null);
    const [checking, setChecking] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    const checkHealth = async () => {
        setChecking(true);
        try {
            const res = await fetch('/api/v1/ai/health', { cache: 'no-store' });
            const data = await res.json();
            // Response shape: { status: 'healthy'|'unhealthy', providers: { available: string[] } }
            const isHealthy = data.status === 'healthy' || (data.providers?.available?.length ?? 0) > 0;
            setStatus({
                available: isHealthy,
                model: data.providers?.available?.[0],
                error: isHealthy ? undefined : 'No AI providers available',
            });
        } catch {
            setStatus({ available: false, error: 'Cannot reach AI health endpoint' });
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        checkHealth();
        // Recheck every 60 seconds
        const interval = setInterval(checkHealth, 60_000);
        return () => clearInterval(interval);
    }, []);

    // Don't show anything while checking first time, or if dismissed, or if healthy
    if (checking && !status) return null;
    if (dismissed) return null;
    if (status?.available) return null; // All good — no banner needed

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-amber-500/20 bg-amber-500/5 overflow-hidden"
            >
                <div className="max-w-7xl mx-auto px-6 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                            </div>
                            <div>
                                <span className="text-sm font-bold text-amber-600">Ollama AI is offline</span>
                                <span className="text-sm text-amber-600/70 ml-2">— AI features won't respond until it's running.</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="text-xs font-bold text-amber-600 flex items-center gap-1 hover:text-amber-700 transition-colors"
                            >
                                How to fix {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            <button
                                onClick={checkHealth}
                                disabled={checking}
                                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-600 transition-colors"
                                title="Retry connection"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={() => setDismissed(true)}
                                className="text-amber-400 hover:text-amber-600 text-lg leading-none px-1 transition-colors"
                                title="Dismiss"
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-3 mb-1 bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 space-y-3">
                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Start Ollama in 2 steps:</p>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                                            <div>
                                                <p className="text-xs font-semibold text-amber-700">Open a terminal and run:</p>
                                                <code className="text-xs bg-amber-900/10 text-amber-800 px-2 py-1 rounded-lg font-mono mt-1 inline-block">ollama serve</code>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                                            <div>
                                                <p className="text-xs font-semibold text-amber-700">Pull the AI model (first time only):</p>
                                                <code className="text-xs bg-amber-900/10 text-amber-800 px-2 py-1 rounded-lg font-mono mt-1 inline-block">ollama pull {process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'qwen3:0.6b'}</code>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <a
                                            href="https://ollama.com/download"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-semibold text-amber-600 flex items-center gap-1 hover:underline"
                                        >
                                            Don't have Ollama? Download it free <ExternalLink className="w-3 h-3" />
                                        </a>
                                        <button
                                            onClick={checkHealth}
                                            disabled={checking}
                                            className="text-xs font-bold px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
                                            Check Again
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
