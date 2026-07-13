'use client';

// Module 6 — Ask AI Chat Panel
// Unified chat interface for all Module 6 intelligence interactions.
//
// Rendering rules:
//   6A command  to  "Card created: ..." or error
//   6B event    to  Insight Card (title, narrative, confidence badge)
//   6C corr     to  Correlation block (r, confidence, lag, narrative)
//   6E synth    to  Composite insight (narrative, conflicts, supporting packets count)
//   suppressed  to  Neutral message (no red, no technical details)
//   error       to  Clean error with retry
//
// Security:
//   - No raw JSON rendered
//   - All AI narrative escaped (no dangerouslySetInnerHTML)
//   - No model metadata shown
//   - Input length capped to 500 chars

import { CheckCircle2, ChevronRight, CloudOff, FileWarning, LineChart, MessageSquare, Play, Sparkles, TrendingUp, X, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useRef, useEffect, useCallback } from 'react';
import { AI_MODE_HEADER_KEY } from '@/lib/ai/ai-mode';
import { useAIMode } from '@/lib/ai/use-ai-mode';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: ChatContent;
    timestamp: Date;
    isStreamingCompleted?: boolean;
}

type ChatContentBase = { conversationalPreamble?: string };
type ChatContent = ChatContentBase & (
    | { type: 'text'; text: string }
    | { type: 'insight'; kpiName: string; narrative: string; confidence: string; unit?: string }
    | { type: 'correlation'; kpiA: string; kpiB: string; rValue?: number; confidence: string; lag?: number; narrative?: string }
    | { type: 'synthesis'; narrative: string; conflictCount: number; packetCount: number; reasoningTier: string }
    | { type: 'command'; action: string; detail: string; requiresRefresh?: boolean }
    | { type: 'suppressed'; message: string }
    | { type: 'error'; message: string; recoverable: boolean }
    | {
        type: 'kpi_value';
        kpiName: string;
        value: string;
        unit: string;
        period: string;
        delta?: number | null;
        deltaPercent?: number | null;
        deltaDirection?: 'up' | 'down' | 'flat' | null;
    }
    | {
        type: 'trend_analysis';
        kpiName: string;
        trendDirection: 'up' | 'down' | 'flat';
        deltaPercent: number;
        volatilityIndex: number;
        summarySentence: string;
        dataset: any[];
    }
    | {
        type: 'comparison';
        kpiAName: string;
        kpiBName: string;
        valueA: number;
        valueB: number;
        unitA: string;
        unitB: string;
        ratio: number;
        summarySentence: string;
    }
    | {
        type: 'clarification';
        message: string;
        options: Array<{ id: string; name: string }>;
    }
    | {
        type: 'directive';
        directive: string;
        message: string;
    }
    | {
        type: 'unsupported';
        message: string;
        suggestions: string[];
    }
);

interface AskAIPanelProps {
    projectId: string;
    onCommandSuccess?: () => void;  // Called when 6A creates a card  to  trigger dashboard refresh
    onOpenGoalEngine?: (query: string) => void;  // Called when 7A requires goal engine to open
    strategyContext?: import('@/lib/module-8/types').StrategyCanvasResult; // M6 to M8 State Injection
    onMessagesChange?: (msgs: { role: string; text: string }[]) => void; // Added for Report Generation
    isOpen: boolean;
    targetKpi?: string;
    onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function parseResponse(data: any): ChatContent {
    const { route, status, directive, error } = data;

    if (error) {
        return {
            type: 'error',
            message: error,
            recoverable: true,
        };
    }

    if (directive === 'OPEN_GOAL_ENGINE') {
        return {
            type: 'directive',
            directive: data.directive,
            message: data.message || "I've routed this to the Goal Strategy Engine.",
        };
    }

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

    if (status === 'clarification_required') {
        return {
            type: 'clarification',
            message: data.message || 'I found multiple matches. Which would you like to explore?',
            options: data.options || []
        };
    }

    if (status === 'rejected' || status === 'error') {
        const isTimeout = (data.message || '').toLowerCase().includes('timed out') ||
            (data.message || '').toLowerCase().includes('timeout');

        let displayMsg = data.message || 'I encountered an issue processing that query. Please try again.';
        if (status === 'rejected' && data.route === 'UNSUPPORTED_SCOPE') {
            displayMsg = "This type of query is outside my current structured reasoning capabilities. I'm focused on governed financial metrics and their relationships.";
        }

        return {
            type: 'error',
            message: displayMsg,
            recoverable: isTimeout || status === 'rejected',
            conversationalPreamble: data.conversationalPreamble
        };
    }

    if (status === 'unsupported') {
        return {
            type: 'unsupported',
            message: data.message || "I couldn't find a structured path for that query. Try rephrasing around a specific metric.",
            suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
            conversationalPreamble: data.conversationalPreamble
        };
    }

    if (status === 'timeout') {
        return { type: 'error', message: 'AI response timed out. Please try again.', recoverable: true };
    }

    // New: KPI Scalar Read
    if (route === 'KPI_VALUE_QUERY' && status === 'success') {
        return {
            type: 'kpi_value',
            kpiName: data.kpiName,
            value: data.value,
            unit: data.unit || '',
            period: data.period || 'Total',
            delta: data.delta,
            deltaPercent: data.deltaPercent,
            deltaDirection: data.deltaDirection,
            conversationalPreamble: data.conversationalPreamble
        };
    }

    // New: Trend Analysis
    if (route === 'TREND_ANALYSIS' && status === 'success') {
        return {
            type: 'trend_analysis',
            kpiName: data.kpiName,
            trendDirection: data.trendDirection || 'flat',
            deltaPercent: data.deltaPercent || 0,
            volatilityIndex: data.volatilityIndex || 0,
            summarySentence: data.summarySentence || 'Trend analysis complete.',
            dataset: data.dataset || [],
            conversationalPreamble: data.conversationalPreamble
        };
    }

    // New: Comparison
    if (route === 'COMPARISON_ANALYSIS' && status === 'success') {
        return {
            type: 'comparison',
            kpiAName: data.kpiAName,
            kpiBName: data.kpiBName,
            valueA: data.valueA || 0,
            valueB: data.valueB || 0,
            unitA: data.unitA || '',
            unitB: data.unitB || '',
            ratio: data.ratio || 0,
            summarySentence: data.summarySentence || 'Comparison complete.',
            conversationalPreamble: data.conversationalPreamble
        };
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
            conversationalPreamble: data.conversationalPreamble
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
            conversationalPreamble: data.conversationalPreamble
        };
    }

    // 6E — Synthesis / Contextual Explanation
    if ((route === '6E' || route === 'CONTEXTUAL_EXPLANATION') && status === 'success') {
        return {
            type: 'synthesis',
            narrative: data.narrative || '',
            conflictCount: data.conflictSummary?.length ?? 0,
            packetCount: data.supportingPacketIds?.length ?? 0,
            reasoningTier: data.reasoningTier || (route === 'CONTEXTUAL_EXPLANATION' ? 'CONTEXTUAL_SYNTHESIS' : 'MULTI_PACKET_SYNTHESIS'),
            conversationalPreamble: data.conversationalPreamble
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

function UnsupportedCard({ c, onSuggest }: {
    c: Extract<ChatContent, { type: 'unsupported' }>;
    onSuggest?: (query: string) => void;
}) {
    return (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-3 max-w-lg">
            <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-500 text-base mt-0.5">help_outline</span>
                <p className="text-sm text-amber-800 leading-relaxed">{c.message}</p>
            </div>
            {c.suggestions.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Try asking:</p>
                    <div className="flex flex-wrap gap-2">
                        {c.suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => onSuggest?.(s)}
                                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors text-left"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ScalarKpiCard({ c }: { c: Extract<ChatContent, { type: 'kpi_value' }> }) {
    const renderDelta = () => {
        if (!c.deltaDirection || typeof c.deltaPercent !== 'number') return null;

        const isPositive = c.deltaDirection === 'up';

        let colorClass = 'text-slate-500';
        let arrow = '−';

        if (isPositive) {
            colorClass = 'text-green-600';
            arrow = '↑';
        } else if (c.deltaDirection === 'down') {
            colorClass = 'text-rose-600';
            arrow = '↓';
        }

        return (
            <div className={`text-sm font-medium flex items-center gap-1 ${colorClass} mt-1`}>
                <span>{arrow}</span>
                <span>{Math.abs(c.deltaPercent).toFixed(1)}%</span>
                <span className="text-xs text-slate-400 font-normal ml-1">compared to previous period</span>
            </div>
        );
    };

    return (
        <div className="ask-ai-insight-card p-4 rounded-xl border border-slate-100 bg-white shadow-sm w-full max-w-sm">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                    {c.kpiName}
                </span>
                <span className="text-3xl font-bold text-slate-900 tracking-tight">
                    {c.unit && c.unit !== 'number' ? `${c.unit} ` : ''}
                    {Number(c.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                {renderDelta()}
                <span className="text-[10px] text-slate-400 mt-2 block border-t border-slate-50 pt-2">
                    Period: {c.period}
                </span>
            </div>
        </div>
    );
}

function TrendCard({ c }: { c: Extract<ChatContent, { type: 'trend_analysis' }> }) {
    const isPositive = c.trendDirection === 'up';
    const isNegative = c.trendDirection === 'down';

    let colorClass = 'text-slate-500';
    let bgClass = 'bg-slate-50 text-slate-500 border-slate-200';
    let icon = 'trending_flat';

    if (isPositive) {
        colorClass = 'text-green-600';
        bgClass = 'bg-green-50 text-green-700 border-green-200';
        icon = 'trending_up';
    } else if (isNegative) {
        colorClass = 'text-rose-600';
        bgClass = 'bg-rose-50 text-rose-700 border-rose-200';
        icon = 'trending_down';
    }

    return (
        <div className="ask-ai-insight-card p-4 rounded-xl border border-slate-100 bg-white shadow-sm w-full max-w-lg">
            <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${bgClass} uppercase tracking-wider flex items-center gap-1`}>
                    <span className="material-symbols-outlined text-[14px]">{icon}</span>
                    {Math.abs(c.deltaPercent).toFixed(1)}% {c.trendDirection}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-2 border-l border-slate-200">
                    {c.kpiName} Trend
                </span>
            </div>

            <p className="text-sm leading-relaxed text-slate-800 font-medium mb-3">
                {c.summarySentence}
            </p>

            {/* Sparkline visualization logic here eventually */}
            {c.dataset.length > 0 && (
                <div className="h-12 w-full flex items-end justify-between gap-1 opacity-60">
                    {c.dataset.map((pt, i) => (
                        <div
                            key={i}
                            className={`w-full rounded-sm ${isNegative ? 'bg-rose-200' : isPositive ? 'bg-green-200' : 'bg-slate-200'}`}
                            style={{
                                height: `${Math.max(10, (pt.value / Math.max(...c.dataset.map(d => d.value))) * 100)}%`,
                                minHeight: '4px'
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function ComparisonCard({ c }: { c: Extract<ChatContent, { type: 'comparison' }> }) {
    return (
        <div className="ask-ai-insight-card p-4 rounded-xl border border-indigo-100 bg-white shadow-sm w-full max-w-lg">
            <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200 uppercase tracking-wider">
                    Comparison
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center text-center">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">{c.kpiAName}</span>
                    <span className="text-xl font-bold text-slate-900">
                        {c.unitA === 'currency' ? '$' : c.unitA === 'percentage' ? '' : ''}
                        {c.valueA.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        {c.unitA === 'percentage' ? '%' : ''}
                    </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center text-center">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">{c.kpiBName}</span>
                    <span className="text-xl font-bold text-slate-900">
                        {c.unitB === 'currency' ? '$' : c.unitB === 'percentage' ? '' : ''}
                        {c.valueB.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        {c.unitB === 'percentage' ? '%' : ''}
                    </span>
                </div>
            </div>

            <p className="text-sm leading-relaxed text-slate-800 font-medium">
                {c.summarySentence}
            </p>
        </div>
    );
}

function ClarificationCard({ c, onSelect }: { c: Extract<ChatContent, { type: 'clarification' }>; onSelect: (name: string) => void }) {
    return (
        <div className="ask-ai-insight-card p-4 rounded-xl border border-amber-100 bg-amber-50 shadow-sm w-full max-w-sm">
            <p className="text-sm font-medium text-amber-900 mb-3">{c.message}</p>
            <div className="flex flex-wrap gap-2">
                {c.options.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => onSelect(opt.name)}
                        className="px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                        {opt.name}
                    </button>
                ))}
            </div>
        </div>
    );
}

function DirectiveCard({ c }: { c: Extract<ChatContent, { type: 'directive' }> }) {
    return (
        <div className="ask-ai-insight-card p-4 rounded-xl border border-indigo-100 bg-white shadow-sm w-full max-w-sm">
            <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-indigo-600 text-lg">route</span>
                <h3 className="text-sm font-bold text-slate-800">Routing Request</h3>
            </div>
            <p className="text-sm text-slate-600">
                {c.message}
            </p>
        </div>
    );
}

function TypewriterText({ text, speed = 10, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
    const [displayedText, setDisplayedText] = useState('');
    const textRef = useRef(text);
    const indexRef = useRef(0);

    useEffect(() => {
        textRef.current = text;
        indexRef.current = 0;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDisplayedText('');

        const interval = setInterval(() => {
            if (indexRef.current < textRef.current.length) {
                setDisplayedText(prev => prev + textRef.current.charAt(indexRef.current));
                indexRef.current += 1;
                
                // Scroll container to bottom
                const container = document.querySelector('.ask-ai-messages');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            } else {
                clearInterval(interval);
                onComplete?.();
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed, onComplete]);

    const isComplete = displayedText.length === text.length;
    return (
        <span className="whitespace-pre-wrap">
            {displayedText}
            {!isComplete && (
                <span className="inline-block w-1 h-3.5 ml-0.5 bg-indigo-600 align-middle animate-pulse" />
            )}
        </span>
    );
}

function MessageBubble({ msg, onRetry, onClarify, onStreamComplete }: { 
    msg: ChatMessage; 
    onRetry?: () => void; 
    onClarify?: (name: string) => void;
    onStreamComplete?: (msgId: string) => void;
}) {
    const isUser = msg.role === 'user';
    const c = msg.content;
    const [preambleDone, setPreambleDone] = useState(!!msg.isStreamingCompleted);

    const hasPreamble = !!c.conversationalPreamble;
    const hasText = c.type === 'text' && !c.conversationalPreamble && !!c.text;

    useEffect(() => {
        if (msg.isStreamingCompleted) return;
        if (!hasPreamble && !hasText) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPreambleDone(true);
            onStreamComplete?.(msg.id);
        }
    }, [msg.isStreamingCompleted, hasPreamble, hasText, msg.id, onStreamComplete]);

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
                    {hasPreamble && (
                        <p className="text-sm text-slate-800 leading-relaxed mb-3">
                            {!msg.isStreamingCompleted ? (
                                <TypewriterText 
                                    text={c.conversationalPreamble!} 
                                    onComplete={() => {
                                        setPreambleDone(true);
                                        if (!hasText) onStreamComplete?.(msg.id);
                                    }}
                                />
                            ) : (
                                c.conversationalPreamble
                            )}
                        </p>
                    )}

                    {hasText && (
                        <p className="text-sm text-slate-700 leading-relaxed">
                            {!msg.isStreamingCompleted ? (
                                <TypewriterText 
                                    text={c.text} 
                                    onComplete={() => onStreamComplete?.(msg.id)}
                                />
                            ) : (
                                c.text
                            )}
                        </p>
                    )}

                    {/* Render cards only when preamble is done typing */}
                    {preambleDone && (
                        <>
                            {c.type === 'insight' && <InsightCard c={c} />}
                            {c.type === 'correlation' && <CorrelationCard c={c} />}
                            {c.type === 'synthesis' && <SynthesisCard c={c} />}
                            {c.type === 'command' && <CommandCard c={c} />}
                            {c.type === 'suppressed' && <SuppressedCard c={c} />}
                            {c.type === 'error' && <ErrorCard c={c} onRetry={onRetry} />}
                            {c.type === 'unsupported' && <UnsupportedCard c={c} onSuggest={onClarify} />}
                            {c.type === 'kpi_value' && <ScalarKpiCard c={c} />}
                            {c.type === 'trend_analysis' && <TrendCard c={c} />}
                            {c.type === 'comparison' && <ComparisonCard c={c} />}
                            {c.type === 'clarification' && <ClarificationCard c={c} onSelect={onClarify || (() => { })} />}
                            {c.type === 'directive' && <DirectiveCard c={c} />}
                        </>
                    )}

                    <span className="text-[10px] text-slate-400 mt-1 block">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export function AskAIPanel({ projectId, onCommandSuccess, onOpenGoalEngine, strategyContext, onMessagesChange, isOpen, targetKpi, onClose }: AskAIPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: genId(),
            role: 'assistant' as const,
            timestamp: new Date(),
            content: {
                type: 'text',
                text: "Hi! I can explain KPI trends, show correlations, create dashboard cards, or give you a financial overview. What would you like to explore?",
            },
            isStreamingCompleted: true,
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { preferLocal, setPreferLocal } = useAIMode();
    const [lastUserMessage, setLastUserMessage] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Load chat history from DB
    useEffect(() => {
        if (!projectId) return;
        fetch(`/api/projects/${projectId}/chat?module=module-6`)
            .then(res => res.json())
            .then(data => {
                if (data.messages && data.messages.length > 0) {
                    const loadedMessages: ChatMessage[] = data.messages.map((m: any) => ({
                        id: m.id,
                        role: m.role as 'user' | 'assistant',
                        timestamp: new Date(m.createdAt),
                        content: m.content,
                        isStreamingCompleted: true,
                    }));
                    setMessages(loadedMessages);
                }
            })
            .catch(err => console.error('Failed to load chat history', err));
    }, [projectId]);

    // Lift message state up for global reporting
    useEffect(() => {
        if (onMessagesChange) {
            onMessagesChange(messages.map(m => ({ 
                role: m.role, 
                text: 'text' in m.content && typeof m.content.text === 'string'
                         ? m.content.text 
                         : 'narrative' in m.content && typeof m.content.narrative === 'string'
                             ? m.content.narrative
                             : `[${m.content.type.toUpperCase()} Response]`
            })));
        }
    }, [messages, onMessagesChange]);

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
    }, [isOpen]);

    // If AI providers are unavailable, or if targetKpi is set, show canned/targeted suggestions
    useEffect(() => {
        if (!isOpen) return;

        if (targetKpi) {
            setSuggestions([
                `Why did ${targetKpi} change recently?`,
                `What factors are driving ${targetKpi}?`,
                `Forecast the future trend of ${targetKpi}`
            ]);
            setMessages(prev => {
                if (prev.length <= 1) {
                    return [{
                        id: genId(), role: 'assistant', timestamp: new Date(),
                        content: { type: 'text', text: `I'm ready to perform deep causal analysis on ${targetKpi}. What would you like to know?` } as ChatContent,
                        isStreamingCompleted: true
                    }];
                }
                return prev;
            });
            return;
        }

        (async () => {
            try {
                const res = await fetch('/api/v1/ai/health', { cache: 'no-store' });
                const data = await res.json();
                const healthy = data.status === 'healthy' || (data.providers?.available?.length ?? 0) > 0;
                if (!healthy) {
                    const canned = [
                        'What caused the recent revenue drop?',
                        'Show top 3 contributors to sales growth.',
                        'Which KPI shows an anomaly in last 30 days?'
                    ];
                    setSuggestions(prev => prev.length ? prev : canned);
                    setMessages(prev => {
                        const intro: ChatMessage = {
                            id: genId(), role: 'assistant', timestamp: new Date(),
                            content: { type: 'text', text: 'Live AI providers are currently unavailable. Showing cached suggestions and guidance — try one of the suggestions below.' } as ChatContent,
                            isStreamingCompleted: true
                        };
                        if (prev.length && prev[0]?.content?.type === 'text' && typeof prev[0].content.text === 'string' && prev[0].content.text.includes('Live AI providers are currently unavailable')) return prev;
                        return [intro, ...prev];
                    });
                }
            } catch (e) {
                // silently ignore health check failures
            }
        })();
    }, [isOpen]);

    const sendMessage = useCallback(async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        const userMsg: ChatMessage = {
            id: genId(),
            role: 'user',
            timestamp: new Date(),
            content: { type: 'text' as const, text: messageText.trim() },
        };
        setMessages(prev => [...prev, userMsg]);
        setLastUserMessage(messageText.trim());
        setInput('');
        setSuggestions([]); // Clear suggestions when user sends new message
        setIsLoading(true);

        // 5-minute client-side timeout sentinel with AbortController for slow local models
        const controller = new AbortController();
        const clientTimeout = setTimeout(() => {
            controller.abort();
            setMessages(prev => [...prev, {
                id: genId(),
                role: 'assistant' as const,
                timestamp: new Date(),
                content: { type: 'error', message: 'AI response timed out (took longer than 5 minutes). Please try again.', recoverable: true },
                isStreamingCompleted: true,
            }]);
            setIsLoading(false);
        }, 300000); // Increased from 60s to 5m

        try {
            const res = await fetch(`/api/projects/${projectId}/ask-ai`, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    [AI_MODE_HEADER_KEY]: preferLocal ? 'local' : 'cloud',
                },
                body: JSON.stringify({
                    message: messageText.trim(),
                    sessionId: projectId,
                    preferLocal,
                    // State Injection Pipeline: forward live strategy context to the AI
                    ...(strategyContext ? { strategyContext } : {}),
                }),
            });

            clearTimeout(clientTimeout);


            let data;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                console.error('[AskAI] Non-JSON response received:', text.substring(0, 500));
                throw new Error(`Server returned unexpected format (${res.status})`);
            }

            if (!res.ok) {
                // If the backend explicitly returned a JSON error (e.g. 500 or 429)
                console.error('[AskAI] API Error:', data);
                const isTimeout = (data.error || '').toLowerCase().includes('timeout');
                setMessages(prev => [...prev, {
                    id: genId(),
                    role: 'assistant' as const,
                    timestamp: new Date(),
                    content: { 
                        type: 'error', 
                        message: data.error || 'The server encountered an issue processing that query. Please try again.', 
                        recoverable: isTimeout || res.status === 429
                    },
                    isStreamingCompleted: true,
                }]);
                return;
            }

            const parsedMsg = parseResponse(data);
            setMessages(prev => [...prev, {
                id: genId(),
                role: 'assistant' as const,
                timestamp: new Date(),
                content: parsedMsg,
                isStreamingCompleted: true,
            }]);

            // Add suggestions if present
            if (data.suggestions && Array.isArray(data.suggestions)) {
                setSuggestions(data.suggestions);
            }

            // Trigger dashboard refresh on successful 6A command
            if (parsedMsg.type === 'command' && parsedMsg.requiresRefresh) {
                onCommandSuccess?.();
            }

            // Trigger goal engine on 7A directive
            if (parsedMsg.type === 'directive' && parsedMsg.directive === 'OPEN_GOAL_ENGINE') {
                if (onOpenGoalEngine) {
                    setTimeout(() => onOpenGoalEngine(messageText.trim()), 800); // slight delay for better UX
                }
            }
        } catch (error: any) {
            clearTimeout(clientTimeout);
            console.error('AskAI Error:', error);
            
            if (error.name === 'AbortError') {
                // The timeout already pushed a message, don't push another one.
                return;
            }

            // Graceful fallback for offline / demo mode
            setMessages(prev => [...prev, {
                id: genId(),
                role: 'assistant' as const,
                timestamp: new Date(),
                content: { type: 'error' as const, message: `AI connection failed: ${error.message || 'Server is offline or unreachable.'}`, recoverable: true },
                isStreamingCompleted: true,
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, isLoading, preferLocal, strategyContext, onCommandSuccess]);

    const handleStreamComplete = useCallback((msgId: string) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStreamingCompleted: true } : m));
    }, []);

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
                            onClick={() => setPreferLocal(!preferLocal)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                                preferLocal 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                            title={preferLocal ? "Using Local AI (Ollama)" : "Using Cloud AI (Groq)"}
                        >
                            <span className="material-symbols-outlined text-[14px]">
                                {preferLocal ? 'memory' : 'cloud'}
                            </span>
                            {preferLocal ? 'Local' : 'Cloud'}
                        </button>
                        <button
                            onClick={() => {
                                localStorage.setItem('vistara_saved_chat_m6', JSON.stringify(messages));
                                toast.success("Conversation history recorded for final Executive Report.");
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                            title="Save Chat to Report"
                        >
                            <span className="material-symbols-outlined text-[16px]">bookmark_add</span>
                        </button>
                        <button
                            onClick={() => setMessages([{
                                id: genId(), role: 'assistant' as const, timestamp: new Date(),
                                content: { type: 'text' as const, text: "Chat cleared. What would you like to explore?" },
                                isStreamingCompleted: true
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
                        <MessageBubble
                            key={msg.id}
                            msg={msg}
                            onRetry={handleRetry}
                            onClarify={(name) => sendMessage(name)}
                            onStreamComplete={handleStreamComplete}
                        />
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

                {/* Suggestions Footer */}
                {!isLoading && suggestions.length > 0 && (
                    <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-slate-50 bg-slate-50/30">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => sendMessage(s)}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                {s}
                            </button>
                        ))}
                    </div>
                )}

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
