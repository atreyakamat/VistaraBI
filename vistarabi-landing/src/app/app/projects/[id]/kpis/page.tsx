'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
};

export default function KPIWorkspacePage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<any>(null);
    const [discoveredKPIs, setDiscoveredKPIs] = useState<DiscoveredKPI[]>([]);
    const [blueprint, setBlueprint] = useState<{ kpis: ApprovedKPI[]; isLocked: boolean; version: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState<string | null>(null);
    const [finalizing, setFinalizing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [projRes, kpiRes, bpRes] = await Promise.all([
                fetch(`/api/projects/${projectId}`),
                fetch(`/api/projects/${projectId}/kpis`),
                fetch(`/api/projects/${projectId}/kpi-blueprint`),
            ]);

            if (projRes.ok) setProject(await projRes.json());
            if (kpiRes.ok) {
                const data = await kpiRes.json();
                setDiscoveredKPIs(data.discovery?.computableKPIs || []);
            }
            if (bpRes.ok) {
                const data = await bpRes.json();
                setBlueprint(data.blueprint);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const addKPI = async (kpi: DiscoveredKPI) => {
        setAdding(kpi.kpiId);
        try {
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
            if (res.ok) {
                const data = await res.json();
                setBlueprint(data.blueprint);
            }
        } catch (err) {
            console.error('Add error:', err);
        } finally {
            setAdding(null);
        }
    };

    const removeKPI = async (kpiId: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/kpi-blueprint?kpiId=${kpiId}`, { method: 'DELETE' });
            if (res.ok) {
                const data = await res.json();
                setBlueprint(data.blueprint);
            }
        } catch (err) {
            console.error('Remove error:', err);
        }
    };

    const finalize = async () => {
        if (!confirm('Finalize and lock this KPI Blueprint? This cannot be undone.')) return;
        setFinalizing(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/kpi-blueprint/finalize`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setBlueprint(data.blueprint);
                alert('Blueprint finalized!');
            }
        } catch (err) {
            console.error('Finalize error:', err);
        } finally {
            setFinalizing(false);
        }
    };

    const isInBlueprint = (kpiId: string) => blueprint?.kpis.some(k => k.kpiId === kpiId);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
                <div className="animate-pulse text-center">
                    <div className="text-4xl mb-3">📊</div>
                    <p className="text-[var(--muted)]">Loading KPI Workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[var(--surface)]/80 backdrop-blur-xl border-b border-[var(--border)]">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href={`/app/projects/${projectId}`} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                                ← Back
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold">KPI Blueprint</h1>
                                <p className="text-sm text-[var(--muted)]">{project?.name}</p>
                            </div>
                        </div>
                        {blueprint && !blueprint.isLocked && blueprint.kpis.length > 0 && (
                            <button
                                onClick={finalize}
                                disabled={finalizing}
                                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg disabled:opacity-50"
                            >
                                {finalizing ? '🔒 Finalizing...' : '🔒 Finalize Blueprint'}
                            </button>
                        )}
                        {blueprint?.isLocked && (
                            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl font-medium">
                                ✅ Blueprint Locked (v{blueprint.version})
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* AI Recommendations */}
                    <div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span>🧠</span> AI Recommendations
                            <span className="text-sm font-normal text-[var(--muted)]">({discoveredKPIs.length})</span>
                        </h2>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            {discoveredKPIs.length === 0 ? (
                                <p className="text-[var(--muted)] text-center py-8">No KPIs discovered yet</p>
                            ) : (
                                discoveredKPIs.map(kpi => (
                                    <motion.div
                                        key={kpi.kpiId}
                                        layout
                                        className={`p-4 rounded-xl border ${isInBlueprint(kpi.kpiId) ? 'bg-green-50 border-green-200' : 'bg-[var(--surface)] border-[var(--border)]'}`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{CATEGORY_ICONS[kpi.category] || '📊'}</span>
                                                <div>
                                                    <div className="font-medium">{kpi.kpiName}</div>
                                                    <div className="text-xs text-[var(--muted)]">{kpi.confidence}% confidence</div>
                                                </div>
                                            </div>
                                            {!blueprint?.isLocked && (
                                                isInBlueprint(kpi.kpiId) ? (
                                                    <button onClick={() => removeKPI(kpi.kpiId)} className="text-red-500 text-sm hover:underline">Remove</button>
                                                ) : (
                                                    <button
                                                        onClick={() => addKPI(kpi)}
                                                        disabled={adding === kpi.kpiId}
                                                        className="px-3 py-1 bg-purple-500 text-white text-sm rounded-lg disabled:opacity-50"
                                                    >
                                                        {adding === kpi.kpiId ? '...' : '+ Add'}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                        <p className="text-sm text-[var(--muted)] mt-2">{kpi.explanation}</p>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Selected Blueprint */}
                    <div>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span>📋</span> Your KPI Blueprint
                            <span className="text-sm font-normal text-[var(--muted)]">({blueprint?.kpis.length || 0})</span>
                        </h2>
                        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 min-h-[300px]">
                            {!blueprint || blueprint.kpis.length === 0 ? (
                                <div className="text-center py-12 text-[var(--muted)]">
                                    <div className="text-4xl mb-3">📋</div>
                                    <p>Add KPIs from the left panel</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <AnimatePresence>
                                        {blueprint.kpis.map(kpi => (
                                            <motion.div
                                                key={kpi.kpiId}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-cyan-50 rounded-lg border border-purple-200"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{CATEGORY_ICONS[kpi.category] || '📊'}</span>
                                                    <span className="font-medium">{kpi.kpiName}</span>
                                                </div>
                                                {!blueprint.isLocked && (
                                                    <button onClick={() => removeKPI(kpi.kpiId)} className="text-red-500 text-xs hover:underline">×</button>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
