"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
    Target, 
    ArrowLeft, 
    Zap, 
    Sparkles, 
    CheckCircle2, 
    Lock, 
    ChevronRight, 
    Info, 
    AlertTriangle,
    Check,
    Loader2,
    BarChart3
} from "lucide-react";
import { api } from "@/lib/api/client";
import { useAIMode } from "@/lib/ai/use-ai-mode";
import { KPISkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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
    supportStatus?: string;
    aggregations?: { function: string; column: string }[];
}

interface ApprovedKPI {
    id: string;
    name: string;
    aggregations: { function: string; column: string }[];
    sourceTable: string;
    groupBy: string | null;
    lineage: any;
    category?: string;
}

const CATEGORY_ICONS: Record<string, any> = {
    revenue: "💰", volume: "📊", conversion: "🎯", customer: "👥",
    retention: "🔄", engagement: "🔥", growth: "📈", profitability: "💎",
    operations: "⚙️", efficiency: "⚡", quality: "✅", performance: "🏆",
    cost: "💵", risk: "⚠️", liquidity: "💧", marketing: "📣", product: "📦",
    derived: "🔮",
};

export default function KPIWorkspacePage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<any>(null);
    const [discoveredKPIs, setDiscoveredKPIs] = useState<DiscoveredKPI[]>([]);
    const [aiKPIs, setAiKPIs] = useState<DiscoveredKPI[]>([]);
    const [blueprint, setBlueprint] = useState<{ kpis: ApprovedKPI[]; isLocked: boolean; version: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const { preferLocal, setPreferLocal } = useAIMode();
    const [aiRequested, setAiRequested] = useState(false);
    const [adding, setAdding] = useState<string | null>(null);
    const [finalizing, setFinalizing] = useState(false);
    const [activeTab, setActiveTab] = useState<"domain" | "ai" | "blueprint">("domain");
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, [projectId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [projRes, bpRes] = await Promise.all([
                api.get(`/api/projects/${projectId}`),
                api.get<{ blueprint: any }>(`/api/projects/${projectId}/kpi-blueprint`),
            ]);

            if (projRes.data) setProject(projRes.data);
            if (bpRes.data) setBlueprint(bpRes.data.blueprint);

            // Fetch existing discovery or trigger it
            const kpiRes = await api.get<{ discovery: { computableKPIs: DiscoveredKPI[] } }>(`/api/projects/${projectId}/kpis`);
            if (kpiRes.data?.discovery?.computableKPIs?.length) {
                setDiscoveredKPIs(kpiRes.data.discovery.computableKPIs);
            } else {
                const kpiPostRes = await api.post<{ discovery: { computableKPIs: DiscoveredKPI[] } }>(`/api/projects/${projectId}/kpis`);
                if (kpiPostRes.data) {
                    setDiscoveredKPIs(kpiPostRes.data.discovery?.computableKPIs || []);
                }
            }
        } catch (err) {
            console.error("Fetch error:", err);
            toast.error('Failed to load project data. Please refresh.');
        } finally {
            setLoading(false);
        }
    };

    const requestAIKPIs = async () => {
        setAiLoading(true);
        setAiRequested(true);
        try {
            const discoveryRes = await api.post<{ proposals: any[] }>(`/api/projects/${projectId}/ai-kpi-discovery`, {
                preferLocal
            });
            
            if (discoveryRes.data?.proposals?.length) {
                const aiProposals = discoveryRes.data.proposals.map((p) => ({
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
                const res = await api.post<{ aiKpis: DiscoveredKPI[] }>(`/api/projects/${projectId}/ai-kpis`);
                if (res.data) {
                    setAiKPIs(res.data.aiKpis);
                }
            }
        } catch (err) {
            console.error("AI KPI error:", err);
            toast.error('AI synthesis failed. Please try again.');
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
                const res = await api.delete<{ blueprint: any }>(`/api/projects/${projectId}/kpi-blueprint?kpiId=${kpi.kpiId}`);
                if (res.data) setBlueprint(res.data.blueprint);
            } else {
                const res = await api.post<{ blueprint: any }>(`/api/projects/${projectId}/kpi-blueprint`, {
                    kpi: {
                        id: kpi.kpiId,
                        name: kpi.kpiName,
                        description: kpi.explanation,
                        aggregations: kpi.aggregations || kpi.matchedColumns.map(c => ({ function: "SUM", column: c })),
                        sourceTable: "merged_data",
                        groupBy: null,
                        lineage: {
                            tables: ["merged_data"],
                            joins: [],
                            formula: kpi.formulaExpression
                        },
                        category: kpi.category
                    },
                });
                if (res.data) setBlueprint(res.data.blueprint);
            }
        } catch (err) {
            console.error("Toggle error:", err);
            toast.error('Failed to update blueprint. Please try again.');
        } finally {
            setAdding(null);
        }
    };

    const finalize = async () => {
        setShowFinalizeModal(false);
        setFinalizing(true);
        try {
            const res = await api.post<{ blueprint: any }>(`/api/projects/${projectId}/kpi-blueprint/finalize`);
            if (res.data) {
                setBlueprint(res.data.blueprint);
                toast.success('Blueprint locked! Your KPI measurement schema is now active.');
            }
        } catch (err) {
            console.error("Finalize error:", err);
            toast.error('Finalization failed. Please try again.');
        } finally {
            setFinalizing(false);
        }
    };

    const isInBlueprint = (kpiId: string) => blueprint?.kpis?.some(k => k.id === kpiId) || false;

    const renderKPICard = (kpi: DiscoveredKPI) => {
        const selected = isInBlueprint(kpi.kpiId);
        const isLoading = adding === kpi.kpiId;

        return (
            <motion.div
                key={kpi.kpiId}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => !blueprint?.isLocked && !isLoading && toggleKPI(kpi)}
                className={`group relative p-6 rounded-3xl border-2 transition-all overflow-hidden ${
                    selected
                        ? "bg-gradient-to-br from-[var(--accent)]/5 to-[var(--accent)]/10 border-[var(--accent)]/50 shadow-xl shadow-[var(--accent)]/5"
                        : "bg-[var(--card)] border-[var(--border)] hover:border-[var(--accent)]/30 hover:bg-[var(--background)]"
                } ${blueprint?.isLocked ? "opacity-75" : "cursor-pointer active:scale-[0.99]"}`}
            >
                <div className="flex items-start gap-6">
                    {/* Status Icon */}
                    <div className={`mt-1 w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                        selected 
                            ? "bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20" 
                            : "bg-[var(--background)] text-[var(--muted)] border border-[var(--border)] group-hover:border-[var(--accent)]/30"
                    }`}>
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : selected ? (
                            <Check className="w-6 h-6" />
                        ) : (
                            <span className="text-lg">{CATEGORY_ICONS[kpi.category] || "📊"}</span>
                        )}
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h4 className={`text-xl font-bold tracking-tight transition-colors ${selected ? "text-[var(--accent)]" : "text-[var(--foreground)]"}`}>
                                    {kpi.kpiName}
                                </h4>
                                <div className="flex gap-2">
                                    {kpi.supportStatus === "FULLY_SUPPORTED" && (
                                        <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                            Supported
                                        </div>
                                    )}
                                    {kpi.isDerived && (
                                        <div className="px-2 py-0.5 bg-purple-500/10 text-purple-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                            Derived
                                        </div>
                                    )}
                                    {(kpi as any).sourceType === 'AI_INVENTED' && (
                                        <div className="px-2 py-0.5 bg-cyan-500/10 text-cyan-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                            AI Suggestion
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                                <span>{kpi.category}</span>
                                <ChevronRight className="w-3 h-3" />
                                <span>{Math.round(kpi.confidence)}% Confidence</span>
                            </div>
                        </div>

                        <p className="text-[var(--muted)] text-sm leading-relaxed max-w-2xl">
                            {kpi.explanation}
                        </p>

                        {(kpi as any).businessMeaning && (
                            <div className="flex items-start gap-2 text-xs font-medium text-purple-600 bg-purple-50 p-3 rounded-xl">
                                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>{(kpi as any).businessMeaning}</p>
                            </div>
                        )}

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                            <div className="flex flex-wrap gap-2">
                                {kpi.matchedColumns.map((col, index) => (
                                    <span key={`${col}-${index}`} className="px-2.5 py-1 bg-[var(--background)] border border-[var(--border)] text-[var(--muted)] text-[10px] font-bold rounded-lg uppercase tracking-wider">
                                        {col}
                                    </span>
                                ))}
                            </div>
                            <code className="px-3 py-1 bg-black/5 rounded-lg text-xs font-mono text-[var(--muted)]">
                                {kpi.formulaExpression}
                            </code>
                        </div>
                    </div>
                </div>

                {/* Selected Overlay Gradient */}
                {selected && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[var(--accent)]/10 to-transparent -translate-y-1/2 translate-x-1/2 rounded-full blur-2xl" />
                )}
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-[var(--background)] flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-[60] border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link 
                            href={`/app/projects/${projectId}`}
                            className="p-2 -ml-2 rounded-xl hover:bg-[var(--border)]/40 transition-colors text-[var(--muted)] hover:text-[var(--foreground)]"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="h-6 w-px bg-[var(--border)]" />
                        <div className="flex flex-col">
                            <h1 className="text-sm font-bold text-[var(--foreground)] leading-none">
                                KPI Blueprint Engine
                            </h1>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider">
                                    {project?.name || "Loading Project"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setPreferLocal(!preferLocal)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
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
                        <div className="hidden md:flex items-center gap-2 text-sm font-bold">
                            <Target className="w-4 h-4 text-[var(--accent)]" />
                            <span className="text-[var(--foreground)]">{blueprint?.kpis?.length || 0}</span>
                            <span className="text-[var(--muted)]">Active KPIs</span>
                        </div>

                        <div className="h-6 w-px bg-[var(--border)] mx-1" />

                        {blueprint?.isLocked ? (
                            <Link 
                                href={`/app/projects/${projectId}/dashboard`}
                                className="px-4 py-2 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white text-xs font-bold rounded-xl shadow-lg shadow-[var(--accent)]/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
                            >
                                <BarChart3 className="w-4 h-4" />
                                Open Dashboard
                            </Link>
                        ) : (
                            <button
                                onClick={() => setShowFinalizeModal(true)}
                                disabled={finalizing || !blueprint?.kpis?.length}
                                className="px-4 py-2 bg-[var(--foreground)] text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center gap-2 hover:bg-[var(--foreground)]/90 transition-all active:scale-95"
                            >
                                <Lock className="w-4 h-4" />
                                {finalizing ? "Finalizing..." : "Finalize Blueprint"}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <KPISkeleton />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-12"
                        >
                            {/* Blueprint Summary */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="space-y-2">
                                    <h2 className="text-4xl font-bold tracking-tight text-[var(--foreground)]">Strategic Intelligence</h2>
                                    <p className="text-lg text-[var(--muted)] max-w-2xl">
                                        VistaraBI has inferred these KPIs based on your data architecture and domain logic. Select the ones you want to measure.
                                    </p>
                                </div>
                                
                                {blueprint?.isLocked && (
                                    <div className="px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-emerald-700">Blueprint Locked</div>
                                            <div className="text-xs text-emerald-600 font-medium">Measurement schema is active</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Workspace Navigation */}
                            <div className="space-y-8">
                                <div className="flex border-b border-[var(--border)]">
                                    <div className="flex gap-10">
                                        {[
                                            { id: 'domain', label: 'Domain Core', count: discoveredKPIs.length, icon: Target },
                                            { id: 'ai', label: 'AI Synthesis', count: aiKPIs.length, icon: Sparkles },
                                            { id: 'blueprint', label: 'Active Blueprint', count: blueprint?.kpis?.length || 0, icon: CheckCircle2 }
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all relative flex items-center gap-2 ${
                                                    activeTab === tab.id
                                                        ? "text-[var(--accent)]"
                                                        : "text-[var(--muted)] hover:text-[var(--foreground)]"
                                                }`}
                                            >
                                                <tab.icon className="w-4 h-4" />
                                                {tab.label}
                                                <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-md ${
                                                    activeTab === tab.id ? "bg-[var(--accent)] text-white" : "bg-[var(--border)] text-[var(--muted)]"
                                                }`}>
                                                    {tab.count}
                                                </span>
                                                {activeTab === tab.id && (
                                                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent)] rounded-full" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="min-h-[500px]">
                                    {activeTab === 'domain' && (
                                        <div className="space-y-10">
                                            {discoveredKPIs.length === 0 ? (
                                                <div className="py-20 text-center bg-[var(--card)] rounded-3xl border-2 border-dashed border-[var(--border)] space-y-4">
                                                    <Target className="w-12 h-12 mx-auto text-[var(--muted)] opacity-20" />
                                                    <p className="text-[var(--muted)] font-medium">No domain KPIs discovered. Try re-detecting the domain.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {['FULLY_SUPPORTED', 'PARTIALLY_SUPPORTED', 'UNSUPPORTED'].map((status) => {
                                                        const kpis = discoveredKPIs.filter(k => k.supportStatus === status);
                                                        if (kpis.length === 0) return null;
                                                        
                                                        return (
                                                            <div key={status} className="space-y-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`w-2 h-2 rounded-full ${
                                                                        status === 'FULLY_SUPPORTED' ? "bg-emerald-500" :
                                                                        status === 'PARTIALLY_SUPPORTED' ? "bg-yellow-500" : "bg-red-500"
                                                                    }`} />
                                                                    <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--foreground)]">
                                                                        {status.replace('_', ' ')}
                                                                    </h3>
                                                                </div>
                                                                <div className="grid gap-4">
                                                                    {kpis.map(kpi => renderKPICard(kpi))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'ai' && (
                                        <div className="space-y-8">
                                            {!aiRequested ? (
                                                <div className="py-24 text-center bg-gradient-to-br from-[var(--card)] to-[var(--background)] rounded-[40px] border-2 border-dashed border-[var(--border)] space-y-8 shadow-sm">
                                                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 to-cyan-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-purple-500/20 animate-pulse-glow">
                                                        <Sparkles className="w-12 h-12" />
                                                    </div>
                                                    <div className="space-y-2 max-w-lg mx-auto">
                                                        <h3 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">AI Synthesis</h3>
                                                        <p className="text-[var(--muted)]">
                                                            Let Ollama analyze cross-column relationships to synthesize unique business metrics tailored specifically to your dataset.
                                                        </p>
                                                    </div>
                                                    <button 
                                                        onClick={requestAIKPIs}
                                                        className="px-10 py-5 bg-[var(--foreground)] text-white font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"
                                                    >
                                                        Synthesize Derived KPIs
                                                    </button>
                                                </div>
                                            ) : aiLoading ? (
                                                <div className="py-32 text-center space-y-6">
                                                    <div className="relative w-20 h-20 mx-auto">
                                                        <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" />
                                                        <div className="relative bg-white border-2 border-purple-500 rounded-2xl p-4 animate-bounce">
                                                            <Sparkles className="w-10 h-10 text-purple-600" />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p className="text-xl font-bold text-[var(--foreground)]">Deep Semantic Analysis</p>
                                                        <p className="text-[var(--muted)] animate-pulse">Analyzing column distributions and identifying latent patterns...</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid gap-4">
                                                    {aiKPIs.length === 0 ? (
                                                        <p className="text-center py-20 text-[var(--muted)]">No AI suggestions generated for this dataset.</p>
                                                    ) : (
                                                        aiKPIs.map(kpi => renderKPICard(kpi))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'blueprint' && (
                                        <div className="space-y-6">
                                            {!blueprint || blueprint.kpis?.length === 0 ? (
                                                <div className="py-20 text-center bg-[var(--card)] rounded-3xl border border-[var(--border)] space-y-4">
                                                    <BarChart3 className="w-12 h-12 mx-auto text-[var(--muted)] opacity-20" />
                                                    <p className="text-[var(--muted)] font-medium">Your blueprint is currently empty.</p>
                                                </div>
                                            ) : (
                                                <div className="grid gap-4">
                                                    {blueprint.kpis.map(kpi => {
                                                        const fullKpi = [...discoveredKPIs, ...aiKPIs].find(k => k.kpiId === kpi.id) || {
                                                            kpiId: kpi.id, kpiName: kpi.name, confidence: 100,
                                                            explanation: `Strategic metric targeting ${kpi.sourceTable}`, 
                                                            matchedColumns: kpi.aggregations.map(a => a.column),
                                                            formulaExpression: kpi.lineage?.formula || 'Custom', 
                                                            category: kpi.category || 'derived', 
                                                            isComputable: true, 
                                                            supportStatus: 'FULLY_SUPPORTED'
                                                        };
                                                        return renderKPICard(fullKpi);
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Sticky Action Bar */}
            {!loading && !blueprint?.isLocked && blueprint && blueprint.kpis.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-6">
                    <motion.div 
                        initial={{ y: 100 }} 
                        animate={{ y: 0 }}
                        className="bg-[var(--foreground)] text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-6"
                    >
                        <div className="flex items-center gap-4 ml-2">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <Zap className="w-5 h-5 text-yellow-400" />
                            </div>
                            <div>
                                <div className="text-sm font-bold">{blueprint.kpis.length} KPIs Selected</div>
                                <div className="text-[10px] font-medium text-white/50 uppercase tracking-wider">Ready for Finalization</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowFinalizeModal(true)}
                            disabled={finalizing}
                            className="bg-white text-[var(--foreground)] px-6 py-3 rounded-2xl font-bold hover:bg-white/90 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                            Lock Blueprint
                        </button>
                    </motion.div>
                </div>
            )}

            {/* ── Finalize Confirmation Modal ── */}
            {showFinalizeModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                                <Lock className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Lock Blueprint?</h3>
                                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                    Finalizing will lock your KPI selection and activate the measurement schema. You won't be able to add or remove KPIs after this step.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowFinalizeModal(false)}
                                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={finalize}
                                disabled={finalizing}
                                className="flex-1 py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                            >
                                {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                Yes, Lock Blueprint
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
