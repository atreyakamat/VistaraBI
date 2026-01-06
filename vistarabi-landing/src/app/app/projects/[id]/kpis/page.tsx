'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface DiscoveredKPI {
    kpiId: string;
    kpiName: string;
    confidence: number;
    explanation: string;
    matchedColumns: string[];
    formulaExpression: string;
    category: string;
    isComputable: boolean;
    isDerived?: boolean;
}

interface ApprovedKPI {
    kpiId: string;
    kpiName: string;
    formula: string;
    category: string;
    matchedColumns: string[];
    confidence: number;
}

const CATEGORY_ICONS: Record<string, string> = {
    revenue: '💰', volume: '📊', conversion: '🎯', customer: '👥',
    retention: '🔄', engagement: '🔥', growth: '📈', profitability: '💎',
    operations: '⚙️', efficiency: '⚡', quality: '✅', performance: '🏆',
    cost: '💵', risk: '⚠️', liquidity: '💧', marketing: '📣', product: '📦',
    derived: '🔮',
};

export default function KPIWorkspacePage() {
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<any>(null);
    const [discoveredKPIs, setDiscoveredKPIs] = useState<DiscoveredKPI[]>([]);
    const [aiKPIs, setAiKPIs] = useState<DiscoveredKPI[]>([]);
    const [blueprint, setBlueprint] = useState<{ kpis: ApprovedKPI[]; isLocked: boolean; version: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiRequested, setAiRequested] = useState(false);
    const [adding, setAdding] = useState<string | null>(null);
    const [finalizing, setFinalizing] = useState(false);
    const [activeTab, setActiveTab] = useState<'columns' | 'ai' | 'blueprint'>('columns');

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [projRes, bpRes] = await Promise.all([
                fetch(`/api/projects/${projectId}`),
                fetch(`/api/projects/${projectId}/kpi-blueprint`),
            ]);

            if (projRes.ok) setProject(await projRes.json());
            if (bpRes.ok) {
                const data = await bpRes.json();
                setBlueprint(data.blueprint);
            }

            // First try to get existing discovery
            const kpiGetRes = await fetch(`/api/projects/${projectId}/kpis`);
            if (kpiGetRes.ok) {
                const data = await kpiGetRes.json();
                if (data.discovery?.computableKPIs?.length > 0) {
                    setDiscoveredKPIs(data.discovery.computableKPIs);
                    console.log('[KPI Page] Loaded existing discovery:', data.discovery.computableKPIs.length);
                } else {
                    // No existing discovery - trigger it now
                    console.log('[KPI Page] No existing discovery, triggering...');
                    const kpiPostRes = await fetch(`/api/projects/${projectId}/kpis`, { method: 'POST' });
                    if (kpiPostRes.ok) {
                        const postData = await kpiPostRes.json();
                        setDiscoveredKPIs(postData.discovery?.computableKPIs || []);
                        console.log('[KPI Page] Discovery complete:', postData.discovery?.computableKPIs?.length || 0);
                    } else {
                        const err = await kpiPostRes.json();
                        console.error('[KPI Page] Discovery failed:', err);
                    }
                }
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const requestAIKPIs = async () => {
        setAiLoading(true);
        setAiRequested(true);
        try {
            // First run discovery to find derived and invented KPIs
            const discoveryRes = await fetch(`/api/projects/${projectId}/ai-kpi-discovery`, { method: 'POST' });
            const discoveryData = await discoveryRes.json();

            if (discoveryData.proposals && discoveryData.proposals.length > 0) {
                // Convert proposals to DiscoveredKPI format
                const aiProposals = discoveryData.proposals.map((p: any) => ({
                    kpiId: p.id,
                    kpiName: p.kpiName,
                    confidence: p.confidenceScore,
                    explanation: p.whyItMatters || p.description,
                    matchedColumns: p.contributingColumns || [],
                    formulaExpression: p.formula,
                    category: p.category,
                    isComputable: true,
                    isDerived: p.isDerived,
                    sourceType: p.sourceType,
                    businessMeaning: p.businessMeaning,
                }));
                setAiKPIs(aiProposals);
            } else {
                // Fallback to simple AI KPI generation
                const res = await fetch(`/api/projects/${projectId}/ai-kpis`, { method: 'POST' });
                const data = await res.json();
                if (data.aiKpis) {
                    setAiKPIs(data.aiKpis);
                }
            }
        } catch (err) {
            console.error('AI KPI error:', err);
        } finally {
            setAiLoading(false);
        }
    };

    const toggleKPI = async (kpi: DiscoveredKPI) => {
        if (blueprint?.isLocked) return;

        const isSelected = isInBlueprint(kpi.kpiId);
        setAdding(kpi.kpiId);

        try {
            if (isSelected) {
                const res = await fetch(`/api/projects/${projectId}/kpi-blueprint?kpiId=${kpi.kpiId}`, { method: 'DELETE' });
                if (res.ok) setBlueprint((await res.json()).blueprint);
            } else {
                const res = await fetch(`/api/projects/${projectId}/kpi-blueprint`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        kpi: {
                            kpiId: kpi.kpiId,
                            kpiName: kpi.kpiName,
                            formula: kpi.formulaExpression,
                            category: kpi.category,
                            matchedColumns: kpi.matchedColumns,
                            confidence: kpi.confidence,
                        },
                    }),
                });
                if (res.ok) setBlueprint((await res.json()).blueprint);
            }
        } catch (err) {
            console.error('Toggle error:', err);
        } finally {
            setAdding(null);
        }
    };

    const finalize = async () => {
        if (!confirm('Finalize and lock this KPI Blueprint? This cannot be undone.')) return;
        setFinalizing(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/kpi-blueprint/finalize`, { method: 'POST' });
            if (res.ok) {
                setBlueprint((await res.json()).blueprint);
                alert('Blueprint finalized!');
            }
        } catch (err) {
            console.error('Finalize error:', err);
        } finally {
            setFinalizing(false);
        }
    };

    const isInBlueprint = (kpiId: string) => blueprint?.kpis?.some(k => k.kpiId === kpiId) || false;

    const renderKPICard = (kpi: DiscoveredKPI) => {
        const selected = isInBlueprint(kpi.kpiId);
        const isLoading = adding === kpi.kpiId;

        return (
            <motion.div
                key={kpi.kpiId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selected
                    ? 'bg-green-50 border-green-400 shadow-md'
                    : 'bg-[var(--surface)] border-[var(--border)] hover:border-purple-300'
                    } ${blueprint?.isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={() => !blueprint?.isLocked && !isLoading && toggleKPI(kpi)}
            >
                <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}>
                        {isLoading ? (
                            <span className="animate-spin text-white text-xs">⟳</span>
                        ) : selected ? (
                            <span className="text-white text-sm">✓</span>
                        ) : null}
                    </div>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xl">{CATEGORY_ICONS[kpi.category] || '📊'}</span>
                            <span className="font-semibold">{kpi.kpiName}</span>

                            {selected && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                    ✓ Selected
                                </span>
                            )}
                            {kpi.isDerived && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                    🔮 Derived
                                </span>
                            )}
                            {(kpi as any).sourceType === 'AI_INVENTED' && (
                                <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 text-xs rounded-full font-medium">
                                    ✨ AI Invented
                                </span>
                            )}
                            {(kpi as any).sourceType === 'LIBRARY_DERIVED' && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                                    📚 Library
                                </span>
                            )}
                        </div>

                        <p className="text-sm text-[var(--muted)] mt-1">{kpi.explanation}</p>

                        {(kpi as any).businessMeaning && (
                            <p className="text-xs text-purple-600 mt-1 italic">
                                💡 {(kpi as any).businessMeaning}
                            </p>
                        )}

                        <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                            <code className="text-xs text-gray-600">{kpi.formulaExpression}</code>
                        </div>

                        {kpi.matchedColumns && kpi.matchedColumns.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {kpi.matchedColumns.map((col, idx) => (
                                    <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                        {col}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="text-center">
                    <div className="text-5xl mb-4 animate-bounce">📊</div>
                    <p className="text-lg font-medium">Loading your data columns...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[var(--surface)]/90 backdrop-blur-xl border-b border-[var(--border)]">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href={`/app/projects/${projectId}`} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                                ← Back
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent">
                                    KPI Blueprint
                                </h1>
                                <p className="text-sm text-[var(--muted)]">{project?.name}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm text-[var(--muted)]">
                                {blueprint?.kpis?.length || 0} selected
                            </span>
                            {blueprint && !blueprint.isLocked && blueprint.kpis?.length > 0 && (
                                <button onClick={finalize} disabled={finalizing}
                                    className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg disabled:opacity-50">
                                    {finalizing ? '🔒 Finalizing...' : '🔒 Finalize'}
                                </button>
                            )}
                            {blueprint?.isLocked && (
                                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-medium">✅ Locked</span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="flex gap-2 mb-6 p-1.5 bg-[var(--surface)] rounded-2xl w-fit border border-[var(--border)]">
                    <button onClick={() => setActiveTab('columns')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'columns' ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white' : 'text-[var(--muted)]'}`}>
                        📋 Your Data Columns ({discoveredKPIs.length})
                    </button>
                    <button onClick={() => setActiveTab('ai')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'ai' ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white' : 'text-[var(--muted)]'}`}>
                        🔮 AI Suggestions {aiKPIs.length > 0 && `(${aiKPIs.length})`}
                    </button>
                    <button onClick={() => setActiveTab('blueprint')}
                        className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'blueprint' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'text-[var(--muted)]'}`}>
                        ✅ Blueprint ({blueprint?.kpis?.length || 0})
                    </button>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'columns' && (
                        <motion.div key="columns" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <div className="mb-4">
                                <h2 className="text-lg font-bold">Your Data Columns</h2>
                                <p className="text-sm text-[var(--muted)]">These are the columns from your imported files. Select which ones to use as KPIs.</p>
                            </div>
                            <div className="grid gap-3">
                                {discoveredKPIs.length === 0 ? (
                                    <div className="text-center py-12 bg-[var(--surface)] rounded-2xl border border-dashed border-[var(--border)]">
                                        <div className="text-4xl mb-3">📁</div>
                                        <p className="font-medium mb-2">No columns found</p>
                                        <p className="text-sm text-[var(--muted)] mb-4">Upload data files and set a domain first.</p>
                                        <Link
                                            href={`/app/projects/${projectId}`}
                                            className="inline-block px-4 py-2 bg-purple-500 text-white rounded-lg text-sm"
                                        >
                                            ← Go to Project
                                        </Link>
                                    </div>
                                ) : (
                                    discoveredKPIs.map(kpi => renderKPICard(kpi))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'ai' && (
                        <motion.div key="ai" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <div className="mb-4">
                                <h2 className="text-lg font-bold">AI-Derived KPIs</h2>
                                <p className="text-sm text-[var(--muted)]">Let Ollama AI suggest derived KPIs by analyzing your data.</p>
                            </div>

                            {!aiRequested ? (
                                <div className="text-center py-12 bg-[var(--surface)] rounded-2xl border border-dashed border-[var(--border)]">
                                    <div className="text-4xl mb-4">🔮</div>
                                    <p className="text-[var(--muted)] mb-4">Click below to generate AI-derived KPIs from your data</p>
                                    <button onClick={requestAIKPIs}
                                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl">
                                        ✨ Generate AI KPIs
                                    </button>
                                </div>
                            ) : aiLoading ? (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-4 animate-pulse">🔮</div>
                                    <p className="text-[var(--muted)]">Ollama is analyzing your data...</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {aiKPIs.length === 0 ? (
                                        <div className="text-center py-12 text-[var(--muted)]">
                                            <p>No AI suggestions available. Try again later.</p>
                                        </div>
                                    ) : (
                                        aiKPIs.map(kpi => renderKPICard(kpi))
                                    )}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'blueprint' && (
                        <motion.div key="blueprint" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                            <div className="mb-4">
                                <h2 className="text-lg font-bold">Your KPI Blueprint</h2>
                                <p className="text-sm text-[var(--muted)]">Selected KPIs that will power your analytics.</p>
                            </div>
                            {!blueprint || blueprint.kpis?.length === 0 ? (
                                <div className="text-center py-12 bg-[var(--surface)] rounded-2xl border border-dashed border-[var(--border)]">
                                    <div className="text-4xl mb-3">📋</div>
                                    <p className="text-[var(--muted)]">No KPIs selected. Select from the other tabs.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {blueprint.kpis.map(kpi => {
                                        const fullKpi = [...discoveredKPIs, ...aiKPIs].find(k => k.kpiId === kpi.kpiId) || {
                                            kpiId: kpi.kpiId, kpiName: kpi.kpiName, confidence: kpi.confidence,
                                            explanation: `Formula: ${kpi.formula}`, matchedColumns: kpi.matchedColumns,
                                            formulaExpression: kpi.formula, category: kpi.category, isComputable: true,
                                        };
                                        return renderKPICard(fullKpi);
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
