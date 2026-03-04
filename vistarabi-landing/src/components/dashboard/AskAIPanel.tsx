'use client';

// Module 6 — Ask AI Chat Panel
// Unified chat interface for all Module 6 intelligence interactions.
//
// Rendering rules:
//   6A command → "Card created: ..." or error
//   6B event   → Insight Card (title, narrative, confidence badge)
//   6C corr    → Correlation block (r, confidence, lag, narrative)
//   6E synth   → Composite insight (narrative, conflicts, supporting packets count)
//   suppressed → Neutral message (no red, no technical details)
//   error      → Clean error with retry
//
// Security:
//   - No raw JSON rendered
//   - All AI narrative escaped (no dangerouslySetInnerHTML)
//   - No model metadata shown
//   - Input length capped to 500 chars

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: ChatContent;
    timestamp: Date;
}

type ChatContent =
    | { type: 'text'; text: string }
    | { type: 'insight'; kpiName: string; narrative: string; confidence: string; unit?: string }
    | { type: 'correlation'; kpiA: string; kpiB: string; rValue?: number; confidence: string; lag?: number; narrative?: string }
    | { type: 'synthesis'; narrative: string; conflictCount: number; packetCount: number; reasoningTier: string }
    | { type: 'command'; action: string; detail: string; requiresRefresh?: boolean }
    | { type: 'suppressed'; message: string }
    | { type: 'error'; message: string; recoverable: boolean };

interface AskAIPanelProps {
    projectId: string;
    onCommandSuccess?: () => void;  // Called when 6A creates a card → trigger dashboard refresh
    isOpen: boolean;
    onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseResponse(data: any): ChatContent {
    const { route, status } = data;

    if (status === 'suppressed') {
        return {
            type: 'suppressed',
            message: data.message || 'This insight could not be validated against the available statistical evidence.',
        };
    }

    if (status === 'causation_violation') {
        return {
            type: 'suppressed',
            message: 'The response contained language that could not be validated and was suppressed.',
        };
    }

    if (status === 'rejected' || status === 'error') {
        const isTimeout = (data.message || '').toLowerCase().includes('timed out') ||
            (data.message || '').toLowerCase().includes('timeout');
        return {
            type: 'error',
            message: data.message || 'Something went wrong. Please try again.',
            recoverable: isTimeout || status === 'rejected',
        };
    }

    if (status === 'timeout') {
        return { type: 'error', message: 'AI response timed out. Please try again.', recoverable: true };
    }

    // 6A — Command
    if (route === '6A' && status === 'success') {
        const action = data.executedAction?.action || 'COMMAND';
        return {
            type: 'command',
            action,
            detail: data.message || `Command executed successfully.`,
            requiresRefresh: action === 'CREATE_CARD',
        };
    }

    // 6B — Event narration
    if (route === '6B' && status === 'success') {
        const ev = data;
        return {
            type: 'insight',
            kpiName: ev.kpiName || 'KPI',
            narrative: ev.explanation || ev.message || '',
            confidence: ev.confidence_level || ev.confidence || 'moderate',
            unit: ev.unit,
        };
    }

    // 6C — Correlation
    if (route === '6C') {
        if (status !== 'success') {
            return {
                type: 'error',
                message: data.message || 'The available data does not support a statistically valid conclusion.',
                recoverable: false,
            };
        }
        const ev = data.evidence || data;
        return {
            type: 'correlation',
            kpiA: ev.kpi_a_name || 'KPI A',
            kpiB: ev.kpi_b_name || 'KPI B',
            rValue: ev.statistically_significant ? ev.pearson_r : undefined,
            confidence: ev.confidence_level || 'moderate',
            lag: ev.lag_applied !== 0 ? ev.lag_applied : undefined,
            narrative: data.explanation,
        };
    }

    // 6E — Synthesis
    if (route === '6E' && status === 'success') {
        return {
            type: 'synthesis',
            narrative: data.narrative || '',
            conflictCount: data.conflictSummary?.length ?? 0,
            packetCount: data.supportingPacketIds?.length ?? 0,
            reasoningTier: data.reasoningTier || 'MULTI_PACKET_SYNTHESIS',
        };
    }

    // Fallback text
    return {
        type: 'text',
        text: data.message || data.explanation || data.narrative || 'Response received.',
    };
}

const CONFIDENCE_COLORS: Record<string, string> = {
    high: 'bg-emerald-100 text-emerald-700',
    moderate: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-600',
    insufficient: 'bg-slate-100 text-slate-500',
};

// ─── Message Bubble Components ────────────────────────────────────────────────

function InsightCard({ c }: { c: Extract<ChatContent, { type: 'insight' }> }) {
    const confClass = CONFIDENCE_COLORS[c.confidence] ?? CONFIDENCE_COLORS.moderate;
    return (
        <div className="ask-ai-insight-card">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {c.kpiName}{c.unit ? ` (${c.unit})` : ''}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${confClass}`}>
                    {c.confidence} confidence
                </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-800">{c.narrative}</p>
        </div>
    );
}

function CorrelationCard({ c }: { c: Extract<ChatContent, { type: 'correlation' }> }) {
    const confClass = CONFIDENCE_COLORS[c.confidence] ?? CONFIDENCE_COLORS.moderate;
    const reportable = c.rValue !== undefined;
    return (
        <div className="ask-ai-insight-card">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-700">{c.kpiA}</span>
                <span className="text-slate-400">↔</span>
                <span className="text-xs font-semibold text-slate-700">{c.kpiB}</span>
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${confClass}`}>
                    {c.confidence}
                </span>
            </div>
            {reportable ? (
                <div className="flex gap-4 text-xs text-slate-600 mb-2">
                    <span>r = <strong>{c.rValue!.toFixed(3)}</strong></span>
                    {c.lag ? <span>Lag: <strong>{c.lag > 0 ? `+${c.lag}` : c.lag} period(s)</strong></span> : null}
                </div>
            ) : (
                <p className="text-xs text-slate-500 mb-2">The available data does not support a statistically valid conclusion.</p>
            )}
            {c.narrative && <p className="text-sm leading-relaxed text-slate-800">{c.narrative}</p>}
        </div>
    );
}

function SynthesisCard({ c }: { c: Extract<ChatContent, { type: 'synthesis' }> }) {
    const tierLabel: Record<string, string> = {
        SINGLE_PACKET_SUMMARY: 'Summary',
        MULTI_PACKET_SYNTHESIS: 'Multi-Signal Analysis',
        CORRELATION_CLUSTER_ANALYSIS: 'Correlation Cluster',
        STRATEGIC_FINANCIAL_OVERVIEW: 'Strategic Overview',
        RISK_SIGNAL_SYNTHESIS: 'Risk Signals',
    };
    return (
        <div className="ask-ai-insight-card synthesis">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                    {tierLabel[c.reasoningTier] ?? 'Financial Overview'}
                </span>
                <span className="text-[10px] text-slate-400">
                    {c.packetCount} signal{c.packetCount !== 1 ? 's' : ''}
                </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-800">{c.narrative}</p>
            {c.conflictCount > 0 && (
                <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1">
                    ⚠ {c.conflictCount} signal conflict{c.conflictCount !== 1 ? 's' : ''} detected in the evidence
                </div>
            )}
        </div>
    );
}

function CommandCard({ c }: { c: Extract<ChatContent, { type: 'command' }> }) {
    return (
        <div className="ask-ai-command-card">
            <span className="material-symbols-outlined text-sm text-indigo-500">check_circle</span>
            <span className="text-sm text-slate-700">{c.detail}</span>
        </div>
    );
}

function SuppressedCard({ c }: { c: Extract<ChatContent, { type: 'suppressed' }> }) {
    return (
        <div className="ask-ai-suppressed-card">
            <span className="text-sm text-slate-500">{c.message}</span>
        </div>
    );
}

function ErrorCard({ c, onRetry }: { c: Extract<ChatContent, { type: 'error' }>; onRetry?: () => void }) {
    return (
        <div className="ask-ai-error-card">
            <span className="text-sm text-slate-600">{c.message}</span>
            {c.recoverable && onRetry && (
                <button onClick={onRetry} className="ask-ai-retry-btn">Retry</button>
            )}
        </div>
    );
}

function MessageBubble({ msg, onRetry }: { msg: ChatMessage; onRetry?: () => void }) {
    const isUser = msg.role === 'user';
    const c = msg.content;

    if (isUser && c.type === 'text') {
        return (
            <div className="flex justify-end mb-3">
                <div className="ask-ai-user-bubble">{c.text}</div>
            </div>
        );
    }

    return (
        <div className="flex justify-start mb-3">
            <div className="ask-ai-assistant-wrapper">
                <div className="ask-ai-avatar">
                    <span className="material-symbols-outlined text-sm text-indigo-600">psychology</span>
                </div>
                <div className="flex-1">
                    {c.type === 'text' && <p className="text-sm text-slate-700 leading-relaxed">{c.text}</p>}
                    {c.type === 'insight' && <InsightCard c={c} />}
                    {c.type === 'correlation' && <CorrelationCard c={c} />}
                    {c.type === 'synthesis' && <SynthesisCard c={c} />}
                    {c.type === 'command' && <CommandCard c={c} />}
                    {c.type === 'suppressed' && <SuppressedCard c={c} />}
                    {c.type === 'error' && <ErrorCard c={c} onRetry={onRetry} />}
                    <span className="text-[10px] text-slate-400 mt-1 block">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function AskAIPanel({ projectId, onCommandSuccess, isOpen, onClose }: AskAIPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: genId(),
            role: 'assistant',
            timestamp: new Date(),
            content: {
                type: 'text',
                text: "Hi! I can explain KPI trends, show correlations, create dashboard cards, or give you a financial overview. What would you like to explore?",
            },
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [lastUserMessage, setLastUserMessage] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
    }, [isOpen]);

    const sendMessage = useCallback(async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        const userMsg: ChatMessage = {
            id: genId(),
            role: 'user',
            timestamp: new Date(),
            content: { type: 'text', text: messageText.trim() },
        };
        setMessages(prev => [...prev, userMsg]);
        setLastUserMessage(messageText.trim());
        setInput('');
        setIsLoading(true);

        // 3-second client-side timeout sentinel
        const clientTimeout = setTimeout(() => {
            setMessages(prev => [...prev, {
                id: genId(),
                role: 'assistant',
                timestamp: new Date(),
                content: { type: 'error', message: 'AI response timed out. Please try again.', recoverable: true },
            }]);
            setIsLoading(false);
        }, 3000);

        try {
            const res = await fetch(`/api/projects/${projectId}/ask-ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText.trim(), sessionId: projectId }),
            });

            clearTimeout(clientTimeout);

            const data = await res.json();
            const content = parseResponse(data);

            setMessages(prev => [...prev, {
                id: genId(),
                role: 'assistant',
                timestamp: new Date(),
                content,
            }]);

            // Trigger dashboard refresh on successful 6A command
            if (content.type === 'command' && content.requiresRefresh) {
                onCommandSuccess?.();
            }
        } catch {
            clearTimeout(clientTimeout);
            setMessages(prev => [...prev, {
                id: genId(),
                role: 'assistant',
                timestamp: new Date(),
                content: { type: 'error', message: 'Failed to reach the analytics engine. Please try again.', recoverable: true },
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, isLoading, onCommandSuccess]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) sendMessage(input);
    };

    const handleRetry = () => sendMessage(lastUserMessage);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="ask-ai-backdrop" onClick={onClose} aria-label="Close Ask AI panel" />

            {/* Panel */}
            <div className="ask-ai-panel" role="dialog" aria-label="Ask AI" aria-modal="true">
                {/* Header */}
                <div className="ask-ai-header">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm text-indigo-600">psychology</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-800">Vistara Intelligence</h2>
                            <p className="text-[10px] text-slate-400">Evidence-governed analytics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMessages([{
                                id: genId(), role: 'assistant', timestamp: new Date(),
                                content: { type: 'text', text: "Chat cleared. What would you like to explore?" },
                            }])}
                            className="ask-ai-clear-btn"
                            title="Clear chat"
                        >
                            <span className="material-symbols-outlined text-sm">delete_sweep</span>
                        </button>
                        <button onClick={onClose} className="ask-ai-close-btn" title="Close">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="ask-ai-messages">
                    {messages.map(msg => (
                        <MessageBubble key={msg.id} msg={msg} onRetry={handleRetry} />
                    ))}
                    {isLoading && (
                        <div className="flex justify-start mb-3">
                            <div className="ask-ai-assistant-wrapper">
                                <div className="ask-ai-avatar">
                                    <span className="material-symbols-outlined text-sm text-indigo-600">psychology</span>
                                </div>
                                <div className="ask-ai-typing-indicator">
                                    <span /><span /><span />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="ask-ai-input-area">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => {
                            // Cap at 500 chars (security)
                            if (e.target.value.length <= 500) setInput(e.target.value);
                        }}
                        placeholder="Ask about KPIs, correlations, or request a chart…"
                        disabled={isLoading}
                        className="ask-ai-input"
                        maxLength={500}
                        aria-label="Message input"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="ask-ai-send-btn"
                        aria-label="Send message"
                    >
                        <span className="material-symbols-outlined text-sm">send</span>
                    </button>
                </form>

                {/* Input char count hint */}
                {input.length > 400 && (
                    <p className="text-[10px] text-amber-500 px-4 pb-2">{500 - input.length} characters remaining</p>
                )}
            </div>
        </>
    );
}
