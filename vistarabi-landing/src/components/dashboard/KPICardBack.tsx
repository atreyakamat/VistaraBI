'use client';

// Module 5C — KPI Card Back Face (Enhanced)
// Shows: lineage explanation, AI insight, formula, trend, anomaly, attribution, timestamp

import type { KPIExplanationData } from './types';

interface KPICardBackProps {
    kpiName: string;
    explanation?: KPIExplanationData;
    formula: string;
    onFlipBack: () => void;
    // Module 5C enrichments
    lineageExplanation?: string;
    trendSummary?: string;
    anomalySeverity?: 'normal' | 'warning' | 'critical';
    anomalyReason?: string;
    changeAttribution?: string;
    lastUpdated?: string;
}

export function KPICardBack({
    kpiName, explanation, formula, onFlipBack,
    lineageExplanation, trendSummary, anomalySeverity, anomalyReason,
    changeAttribution, lastUpdated,
}: KPICardBackProps) {
    const severityBadge = {
        critical: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: '🔴 Critical' },
        warning: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', label: '🟡 Warning' },
        normal: { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', label: '🟢 Normal' },
    };
    const badge = severityBadge[anomalySeverity || 'normal'];

    return (
        <div className="bg-slate-900 text-white rounded-xl p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                    🤖 AI Insight
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); onFlipBack(); }}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                    ✕ Close
                </button>
            </div>

            <div className="space-y-2 text-xs flex-1 overflow-y-auto custom-scrollbar">
                {/* Anomaly Status Badge */}
                <div className="flex items-center gap-2">
                    <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                    >
                        {badge.label}
                    </span>
                    {anomalyReason && anomalySeverity !== 'normal' && (
                        <span className="text-slate-400 text-[10px] truncate">{anomalyReason}</span>
                    )}
                </div>

                {/* Lineage Explanation */}
                {lineageExplanation && (
                    <div>
                        <div className="text-slate-400 font-medium mb-0.5">📐 How It's Calculated</div>
                        <div className="text-slate-200 leading-relaxed">{lineageExplanation}</div>
                    </div>
                )}

                {/* Trend Interpretation */}
                {trendSummary && (
                    <div>
                        <div className="text-slate-400 font-medium mb-0.5">📊 Trend</div>
                        <div className="text-slate-200">{trendSummary}</div>
                    </div>
                )}

                {/* Change Attribution */}
                {changeAttribution && (
                    <div>
                        <div className="text-slate-400 font-medium mb-0.5">🎯 Key Driver</div>
                        <div className="text-slate-200">{changeAttribution}</div>
                    </div>
                )}

                {/* AI Explanation (from cache) */}
                {explanation ? (
                    <>
                        <div>
                            <div className="text-slate-400 font-medium mb-0.5">💬 Business Definition</div>
                            <div className="text-slate-200">{explanation.businessDefinition}</div>
                        </div>
                        <div>
                            <div className="text-slate-400 font-medium mb-0.5">🧠 AI Insight</div>
                            <div className="text-slate-200">{explanation.explanation}</div>
                        </div>
                        {explanation.recommendation && (
                            <div className="bg-blue-500/10 rounded-lg p-2 mt-1">
                                <div className="text-blue-400 font-medium mb-0.5">💡 Recommendation</div>
                                <div className="text-slate-300">{explanation.recommendation}</div>
                            </div>
                        )}
                    </>
                ) : (
                    <div>
                        <div className="text-slate-400 font-medium mb-0.5">Formula</div>
                        <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded text-[11px]">
                            {formula}
                        </code>
                    </div>
                )}

                {/* Last Updated */}
                {lastUpdated && (
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-700">
                        Last updated: {new Date(lastUpdated).toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    );
}
