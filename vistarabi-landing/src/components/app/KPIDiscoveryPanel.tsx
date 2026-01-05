'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiscoveredKPI {
    id: string;
    kpiName: string;
    confidence: number;
    matchType: string;
    explanation: string;
    matchedColumns: string[];
    formulaExpression: string;
    category: string;
    isComputable: boolean;
}

interface KPIDiscoveryResult {
    domain: string;
    totalKPIsAnalyzed: number;
    computableKPIs: DiscoveredKPI[];
    partialKPIs: DiscoveredKPI[];
}

interface KPIDiscoveryPanelProps {
    projectId: string;
    onClose?: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
    revenue: '💰',
    volume: '📊',
    conversion: '🎯',
    customer: '👥',
    retention: '🔄',
    engagement: '🔥',
    growth: '📈',
    profitability: '💎',
    operations: '⚙️',
    efficiency: '⚡',
    quality: '✅',
    performance: '🏆',
    cost: '💵',
    risk: '⚠️',
    liquidity: '💧',
    marketing: '📣',
    product: '📦',
    capacity: '🏗️',
};

export default function KPIDiscoveryPanel({ projectId, onClose }: KPIDiscoveryPanelProps) {
    const [discovery, setDiscovery] = useState<KPIDiscoveryResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'computable' | 'partial'>('computable');
    const [expandedKPI, setExpandedKPI] = useState<string | null>(null);

    const runDiscovery = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${projectId}/kpis`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'Discovery failed');
                return;
            }
            setDiscovery(data.discovery);
        } catch (err) {
            setError('Failed to run KPI discovery');
        } finally {
            setLoading(false);
        }
    };

    const fetchExisting = async () => {
        try {
            const res = await fetch(`/api/projects/${projectId}/kpis`);
            const data = await res.json();
            if (data.discovery) {
                setDiscovery(data.discovery);
            }
        } catch (err) {
            console.error('Failed to fetch KPIs');
        }
    };

    useEffect(() => {
        fetchExisting();
    }, [projectId]);

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 80) return '#22c55e';
        if (confidence >= 60) return '#eab308';
        return '#ef4444';
    };

    const currentKPIs = activeTab === 'computable'
        ? discovery?.computableKPIs || []
        : discovery?.partialKPIs || [];

    return (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📊</span>
                        <div>
                            <h3 className="font-bold text-lg">KPI Discovery</h3>
                            <p className="text-sm text-[var(--muted)]">
                                {discovery ? `${discovery.domain} • ${discovery.totalKPIsAnalyzed} analyzed` : 'Discover measurable KPIs'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={runDiscovery}
                        disabled={loading}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        {loading ? '🔍 Analyzing...' : '✨ Discover KPIs'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 text-red-600 text-sm">
                    ❌ {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="p-8 text-center">
                    <div className="animate-pulse">
                        <div className="text-4xl mb-3">🔍</div>
                        <p className="text-[var(--muted)]">Analyzing your data for KPIs...</p>
                    </div>
                </div>
            )}

            {/* Results */}
            {discovery && !loading && (
                <>
                    {/* Tabs */}
                    <div className="flex border-b border-[var(--border)]">
                        <button
                            onClick={() => setActiveTab('computable')}
                            className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'computable' ? 'text-green-600 border-b-2 border-green-500 bg-green-50/50' : 'text-[var(--muted)]'}`}
                        >
                            ✅ Computable ({discovery.computableKPIs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('partial')}
                            className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'partial' ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50' : 'text-[var(--muted)]'}`}
                        >
                            ⚠️ Partial Match ({discovery.partialKPIs.length})
                        </button>
                    </div>

                    {/* KPI Grid */}
                    <div className="p-4 max-h-[400px] overflow-y-auto">
                        {currentKPIs.length === 0 ? (
                            <p className="text-center text-[var(--muted)] py-8">No KPIs in this category</p>
                        ) : (
                            <div className="grid gap-3">
                                <AnimatePresence mode="wait">
                                    {currentKPIs.map((kpi) => (
                                        <motion.div
                                            key={kpi.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-3 rounded-xl border border-[var(--border)] hover:shadow-md transition-all cursor-pointer"
                                            onClick={() => setExpandedKPI(expandedKPI === kpi.id ? null : kpi.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{CATEGORY_ICONS[kpi.category] || '📊'}</span>
                                                    <span className="font-medium">{kpi.kpiName}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                                                        style={{ backgroundColor: `${getConfidenceColor(kpi.confidence)}20`, color: getConfidenceColor(kpi.confidence) }}
                                                    >
                                                        {kpi.confidence}%
                                                    </span>
                                                    <span className="text-xs text-[var(--muted)]">{expandedKPI === kpi.id ? '▲' : '▼'}</span>
                                                </div>
                                            </div>

                                            {/* Expanded details */}
                                            {expandedKPI === kpi.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="mt-3 pt-3 border-t border-[var(--border)] space-y-2"
                                                >
                                                    <div className="text-sm text-[var(--muted)]">{kpi.explanation}</div>
                                                    <div className="text-xs">
                                                        <span className="font-medium">Formula:</span> <code className="bg-[var(--background)] px-1.5 py-0.5 rounded">{kpi.formulaExpression}</code>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {kpi.matchedColumns.map((col, i) => (
                                                            <span key={i} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">{col}</span>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Empty state */}
            {!discovery && !loading && !error && (
                <div className="p-8 text-center">
                    <div className="text-4xl mb-3">📊</div>
                    <p className="text-[var(--muted)] mb-4">Click "Discover KPIs" to analyze your data</p>
                </div>
            )}
        </div>
    );
}
