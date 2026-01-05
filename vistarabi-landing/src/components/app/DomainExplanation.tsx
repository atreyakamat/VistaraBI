"use client";

import { motion } from 'framer-motion';

interface DomainInfo {
    type: string;
    name: string;
    icon: string;
    color: string;
}

const DOMAIN_INFO: Record<string, DomainInfo> = {
    ECOMMERCE: { type: 'ECOMMERCE', name: 'E-Commerce', icon: '🛒', color: '#f97316' },
    SAAS: { type: 'SAAS', name: 'SaaS', icon: '💻', color: '#3b82f6' },
    EDTECH: { type: 'EDTECH', name: 'EdTech', icon: '🎓', color: '#8b5cf6' },
    RETAIL: { type: 'RETAIL', name: 'Retail', icon: '🏪', color: '#22c55e' },
    SERVICES: { type: 'SERVICES', name: 'Services', icon: '🧾', color: '#06b6d4' },
    MANUFACTURING: { type: 'MANUFACTURING', name: 'Manufacturing', icon: '🏭', color: '#6b7280' },
    HEALTHCARE: { type: 'HEALTHCARE', name: 'Healthcare', icon: '🏥', color: '#ef4444' },
    FINANCE: { type: 'FINANCE', name: 'Finance', icon: '💰', color: '#eab308' },
};

const ALL_DOMAINS = Object.keys(DOMAIN_INFO);

interface DomainExplanationProps {
    domain: string | null;
    confidence: number;
    status: 'AUTO_ASSIGNED' | 'MANUAL_REQUIRED' | 'MANUALLY_SELECTED';
    scoringBreakdown: Record<string, number>;
    matchedColumns: string[];
    explanation: string;
    onClose: () => void;
    onSelectDomain: (domain: string) => void;
}

export default function DomainExplanation({
    domain,
    confidence,
    status,
    scoringBreakdown,
    matchedColumns,
    explanation,
    onClose,
    onSelectDomain,
}: DomainExplanationProps) {
    const info = domain ? DOMAIN_INFO[domain] : null;

    // Sort domains by score
    const sortedDomains = ALL_DOMAINS
        .map(d => ({ domain: d, score: scoringBreakdown[d] || 0, info: DOMAIN_INFO[d] }))
        .sort((a, b) => b.score - a.score);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[var(--card)] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-[var(--border)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{info?.icon || '🎯'}</span>
                            <div>
                                <h2 className="text-xl font-bold text-[var(--foreground)]">
                                    Domain Intelligence
                                </h2>
                                <p className="text-sm text-[var(--muted)]">
                                    How we classified your business data
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)] space-y-6">
                    {/* Current Detection */}
                    {domain && (
                        <div
                            className="p-4 rounded-xl border"
                            style={{
                                backgroundColor: `${info?.color}10`,
                                borderColor: `${info?.color}30`,
                            }}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{info?.icon}</span>
                                <span className="text-xl font-bold" style={{ color: info?.color }}>
                                    {info?.name}
                                </span>
                                <span
                                    className="px-2 py-0.5 rounded-full text-sm font-semibold"
                                    style={{
                                        backgroundColor: `${info?.color}20`,
                                        color: info?.color,
                                    }}
                                >
                                    {confidence}% confident
                                </span>
                            </div>
                            <p className="text-sm text-[var(--foreground)]">{explanation}</p>
                        </div>
                    )}

                    {/* Scoring Breakdown */}
                    <div>
                        <h3 className="font-semibold mb-3 text-[var(--foreground)]">All Domain Scores</h3>
                        <div className="space-y-2">
                            {sortedDomains.map(({ domain: d, score, info: dInfo }) => (
                                <div
                                    key={d}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--background)] transition-colors cursor-pointer"
                                    onClick={() => onSelectDomain(d)}
                                >
                                    <span className="text-lg">{dInfo.icon}</span>
                                    <span className="flex-1 font-medium">{dInfo.name}</span>
                                    <div className="w-32 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all"
                                            style={{
                                                width: `${score}%`,
                                                backgroundColor: dInfo.color,
                                            }}
                                        />
                                    </div>
                                    <span
                                        className="w-12 text-right text-sm font-medium"
                                        style={{ color: score > 0 ? dInfo.color : 'var(--muted)' }}
                                    >
                                        {score}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Matched Columns */}
                    {matchedColumns.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-3 text-[var(--foreground)]">
                                Matched Columns ({matchedColumns.length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {matchedColumns.map((col, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-1 text-sm rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] font-mono"
                                    >
                                        {col}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Manual Selection Notice */}
                    {status === 'MANUAL_REQUIRED' && (
                        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                            <div className="flex items-start gap-2">
                                <span className="text-yellow-600">⚠️</span>
                                <div>
                                    <p className="font-medium text-yellow-600">Manual Confirmation Required</p>
                                    <p className="text-sm text-yellow-600/80">
                                        Confidence is below 60%. Click on any domain above to manually select your business type.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border)] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg font-medium hover:bg-[var(--background)] transition-colors"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
