'use client';

// Module 7 — Goal Strategy Panel (Full Implementation)
// Premium intelligence panel for the Goal Strategy Engine.
// Features: goal input, 5-stage pipeline progress, strategy canvas with
// decomposition, ranked actions with collapsible scenario tabs, and location breakdown.

import { useState, useRef, useEffect, useCallback } from 'react';
import StrategyCanvas from '@/components/module-8/StrategyCanvas';
import AIChatPanel from '@/components/module-8/AIChatPanel';
import { StrategyCanvasResult } from '@/lib/module-8/types';
import { resolveForecastHistory, type DashboardKpiExecutionItem } from '@/lib/module-8/kpi-history-resolver';
import { AI_MODE_HEADER_KEY } from '@/lib/ai/ai-mode';
import { useAIMode } from '@/lib/ai/use-ai-mode';
import { Target, X, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedGoal {
    targetMetric: string;
    targetValue: string;
    timeframe: string;
    changeDirection: string;
}

interface DecomposedFactor {
    metric: string;
    requiredChange: string;
    description: string;
    weight: number;
}

interface DecomposedGoal {
    primaryMetric: string;
    targetValue: string;
    formula: string;
    factors: DecomposedFactor[];
}

interface BudgetScenario {
    level: 'LEAN' | 'BALANCED' | 'PREMIUM';
    label: string;
    estimatedCost: string;
    executionPlan: string[];
    timeline: string;
    expectedKpiLift: string;
    monitoringMetrics: string[];
}

interface ActionWithScenarios {
    id: string;
    actionName: string;
    description: string;
    confidenceScore: number;
    tier: 'high' | 'medium' | 'low';
    scenarios: BudgetScenario[];
}

interface LocationPlan {
    locationName: string;
    adjustedGoal: string;
    performanceTier: 'HIGH' | 'MEDIUM' | 'LOW';
    tierReason: string;
}

interface StrategyCanvas {
    goal: ParsedGoal;
    decomposed: DecomposedGoal;
    scenarios: ActionWithScenarios[];
    locationSplits: LocationPlan[];
    generatedAt: string;
    pipelineMs: number;
}

interface PastGoal {
    id: string;
    rawQuery: string;
    targetValue: string;
    timeframe: string;
    status: string;
    createdAt: string;
    generatedPlan: StrategyCanvas;
}

export interface GoalStrategyPanelProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
    { key: 'PARSING', label: 'Parsing Goal', icon: 'edit_note' },
    { key: 'MAPPING', label: 'Mapping KPIs', icon: 'hub' },
    { key: 'DECOMPOSING', label: 'Decomposing Factors', icon: 'account_tree' },
    { key: 'GENERATING', label: 'Generating Strategies', icon: 'auto_awesome' },
    { key: 'BUILDING_SCENARIOS', label: 'Building Scenarios', icon: 'layers' },
];

const SCENARIO_ORDER: BudgetScenario['level'][] = ['LEAN', 'BALANCED', 'PREMIUM'];

const EXAMPLE_GOALS = [
    'Increase revenue by 20% this quarter',
    'Reduce churn by 10% next month',
    'Grow MRR by $50k in 90 days',
    'Improve conversion rate by 15%',
];

const TIER_BADGE: Record<string, { cls: string; label: string }> = {
    HIGH: { cls: 'goal-loc-tier--high', label: '↑ High' },
    MEDIUM: { cls: 'goal-loc-tier--medium', label: '↔ Avg' },
    LOW: { cls: 'goal-loc-tier--low', label: '↓ Low' },
};

const TIER_COLORS: Record<string, string> = {
    high: 'goal-confidence-badge--high',
    medium: 'goal-confidence-badge--medium',
    low: 'goal-confidence-badge--low',
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
    try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
    catch { return iso; }
}

function parseLiftPercent(rawLift: string | undefined): number | null {
    if (!rawLift) return null;
    const match = rawLift.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = Number.parseFloat(match[0]);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
}

// ─── Scenario Tabs ────────────────────────────────────────────────────────────

function ScenarioTabs({ 
    scenarios, 
    onSimulate, 
    projectId, 
    actionName, 
    actionDescription 
}: { 
    scenarios: BudgetScenario[]; 
    onSimulate: () => void; 
    projectId: string; 
    actionName: string; 
    actionDescription: string; 
}) {
    const map = Object.fromEntries(scenarios.map(s => [s.level, s]));
    const [active, setActive] = useState<BudgetScenario['level']>('LEAN');
    const [isExecuting, setIsExecuting] = useState(false);
    const cur = map[active];

    const handleExecuteAction = async () => {
        setIsExecuting(true);
        try {
            let system = 'GOOGLE_ADS';
            if (actionName.toLowerCase().includes('stripe') || actionDescription.toLowerCase().includes('stripe') || actionName.toLowerCase().includes('billing')) {
                system = 'STRIPE';
            } else if (actionName.toLowerCase().includes('slack') || actionName.toLowerCase().includes('email') || actionName.toLowerCase().includes('resend')) {
                system = 'RESEND';
            } else if (actionName.toLowerCase().includes('marketing') || actionName.toLowerCase().includes('campaign') || actionName.toLowerCase().includes('ad')) {
                system = 'GOOGLE_ADS';
            }

            const response = await fetch('/api/v1/action/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    actionId: actionName.replace(/\s+/g, '-').toLowerCase(),
                    system,
                    endpoint: '/v1/mutate',
                    payload: {
                        cost: cur.estimatedCost,
                        timeline: cur.timeline,
                        expectedLift: cur.expectedKpiLift,
                    },
                    justification: actionDescription,
                    projectId,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success(`Action Executed: ${data.detailedMessage}`);
            } else {
                toast.error(`Execution failed: ${data.error || 'Unknown error'}`);
            }
        } catch (error: any) {
            console.error('Failed to execute action:', error);
            toast.error(`Execution error: ${error.message}`);
        } finally {
            setIsExecuting(false);
        }
    };

    return (
        <div className="goal-scenario-block">
            <div className="goal-scenario-tabs" role="tablist">
                {SCENARIO_ORDER.filter(l => map[l]).map(level => (
                    <button
                        key={level} role="tab"
                        aria-selected={active === level}
                        className={`goal-scenario-tab${active === level ? ' active' : ''}`}
                        onClick={() => setActive(level)}
                    >
                        {map[level].label || level}
                    </button>
                ))}
            </div>
            {cur && (
                <div className="goal-scenario-body">
                    <div className="goal-scenario-meta flex justify-between items-center">
                        <div className="flex gap-3">
                            <span><span className="material-symbols-outlined text-[10px]">payments</span>{cur.estimatedCost}</span>
                            <span><span className="material-symbols-outlined text-[10px]">schedule</span>{cur.timeline}</span>
                            {cur.expectedKpiLift && (
                                <span className="goal-lift-badge">
                                    <span className="material-symbols-outlined text-[10px]">trending_up</span>
                                    {cur.expectedKpiLift}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={onSimulate}
                                className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 flex items-center gap-1 font-semibold transition-colors"
                            >
                                <span className="material-symbols-outlined text-[14px]">play_circle</span>
                                Simulate
                            </button>
                            <button 
                                onClick={handleExecuteAction}
                                disabled={isExecuting}
                                className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:bg-emerald-800 disabled:opacity-50 flex items-center gap-1.5 font-semibold transition-colors"
                            >
                                <span className="material-symbols-outlined text-[14px]">{isExecuting ? 'sync' : 'bolt'}</span>
                                {isExecuting ? 'Executing...' : 'Execute'}
                            </button>
                        </div>
                    </div>
                    <ol className="goal-scenario-steps">
                        {cur.executionPlan.map((step, i) => (
                            <li key={i} className="goal-scenario-step">
                                <span className="goal-step-num">{i + 1}</span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                    {cur.monitoringMetrics?.length > 0 && (
                        <div className="goal-monitor-row">
                            <span className="goal-monitor-label">Track:</span>
                            {cur.monitoringMetrics.map((m, i) => (
                                <span key={i} className="goal-monitor-badge">{m}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Action Card ──────────────────────────────────────────────────────────────

function ActionCard({ 
    action, 
    index, 
    projectId, 
    onSimulateAction 
}: { 
    action: ActionWithScenarios; 
    index: number; 
    projectId: string; 
    onSimulateAction: (action: ActionWithScenarios) => void; 
}) {
    const [expanded, setExpanded] = useState(index === 0);
    return (
        <div className="goal-action-card">
            <button className="goal-action-header" onClick={() => setExpanded(e => !e)}>
                <span className="goal-action-rank">{index + 1}</span>
                <div className="goal-action-text">
                    <span className="goal-action-name">{action.actionName}</span>
                    <p className="goal-action-desc">{action.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`goal-confidence-badge ${TIER_COLORS[action.tier] ?? TIER_COLORS.medium}`}>
                        {action.confidenceScore}%
                    </span>
                    <span className="material-symbols-outlined text-sm text-slate-400">
                        {expanded ? 'expand_less' : 'expand_more'}
                    </span>
                </div>
            </button>
            {expanded && (
                <ScenarioTabs 
                    scenarios={action.scenarios} 
                    onSimulate={() => onSimulateAction(action)} 
                    projectId={projectId}
                    actionName={action.actionName}
                    actionDescription={action.description}
                />
            )}
        </div>
    );
}

// ─── Pipeline Progress ────────────────────────────────────────────────────────

function PipelineProgress({ activeStage }: { activeStage: string }) {
    const idx = PIPELINE_STAGES.findIndex(s => s.key === activeStage);
    return (
        <div className="goal-pipeline">
            {PIPELINE_STAGES.map((stage, i) => {
                const done = idx > i;
                const active = idx === i;
                return (
                    <div key={stage.key} className={`goal-pipe-step${done ? ' done' : active ? ' active' : ''}`}>
                        <div className="goal-pipe-icon">
                            {done
                                ? <span className="material-symbols-outlined text-xs">check_circle</span>
                                : active
                                    ? <span className="goal-pipe-spinner" />
                                    : <span className="material-symbols-outlined text-xs">{stage.icon}</span>}
                        </div>
                        <span className="goal-pipe-label">{stage.label}</span>
                        {i < PIPELINE_STAGES.length - 1 && (
                            <div className={`goal-pipe-connector${done ? ' done' : ''}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}


// ─── Strategy Document View ───────────────────────────────────────────────────

function StrategyDocView({ canvas, onBack }: { canvas: StrategyCanvas, onBack: () => void }) {
    return (
        <div className="goal-doc-view bg-white p-6 rounded-md text-slate-800 h-full overflow-y-auto absolute inset-0 z-50 print:p-0 print:absolute print:inset-0">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <button onClick={onBack} className="flex items-center text-sm text-slate-500 hover:text-slate-800">
                    <span className="material-symbols-outlined text-sm mr-1">arrow_back</span>
                    Interactive View
                </button>
                <button onClick={() => window.print()} className="flex items-center text-sm bg-violet-600 text-white px-3 py-1.5 rounded hover:bg-violet-700">
                    <span className="material-symbols-outlined text-sm mr-1">print</span>
                    Print / Save PDF
                </button>
            </div>

            <h1 className="text-2xl font-bold mb-2">Strategy Execution Document</h1>
            <p className="text-sm text-slate-500 mb-6">Generated on {new Date(canvas.generatedAt).toLocaleString()}</p>

            <h2 className="text-lg font-bold border-b pb-1 mb-3">1. Executive Goal</h2>
            <p className="mb-6"><strong>Objective:</strong> {canvas.goal.changeDirection} {canvas.goal.targetMetric} by {canvas.goal.targetValue} ({canvas.goal.timeframe})</p>

            <h2 className="text-lg font-bold border-b pb-1 mb-3">2. KPI Decomposition</h2>
            <p className="mb-2 text-sm italic">{canvas.decomposed.formula}</p>
            <ul className="list-disc pl-5 mb-6">
                {canvas.decomposed.factors.map((f, i) => (
                    <li key={i} className="mb-1"><strong>{f.metric} ({f.requiredChange}):</strong> {f.description}</li>
                ))}
            </ul>

            <h2 className="text-lg font-bold border-b pb-1 mb-3">3. Recommended Actions & Scenarios</h2>
            {canvas.scenarios.map((action, i) => (
                <div key={i} className="mb-6">
                    <h3 className="font-semibold text-md">{i + 1}. {action.actionName} (Confidence: {action.confidenceScore}%)</h3>
                    <p className="text-sm text-slate-600 mb-3">{action.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {action.scenarios.map((s, j) => (
                            <div key={j} className="border p-3 rounded bg-slate-50 break-inside-avoid">
                                <h4 className="font-bold text-sm mb-1">{s.label} ({s.estimatedCost})</h4>
                                <p className="text-xs text-slate-500 mb-2">Timeline: {s.timeline} | Lift: {s.expectedKpiLift}</p>
                                <ol className="list-decimal pl-4 text-xs">
                                    {s.executionPlan.map((step, k) => (
                                        <li key={k} className="mb-1">{step}</li>
                                    ))}
                                </ol>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {canvas.locationSplits && canvas.locationSplits.length > 0 && canvas.locationSplits[0].locationName !== 'Global' && (
                <>
                    <h2 className="text-lg font-bold border-b pb-1 mb-3 break-before-page">4. Location Strategy</h2>
                    <div className="grid grid-cols-1 gap-2 mb-6">
                        {canvas.locationSplits.map((loc, i) => (
                            <div key={i} className="border p-3 rounded break-inside-avoid">
                                <strong className="block mb-1">{loc.locationName} - {loc.performanceTier} Tier</strong>
                                <span className="text-sm">Target: {loc.adjustedGoal}</span>
                                <p className="text-xs text-slate-600 mt-1">{loc.tierReason}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Strategy Canvas ──────────────────────────────────────────────────────────


function StrategyCanvasView({ 
    canvas, 
    projectId, 
    onReset, 
    onRefine, 
    onViewDoc, 
    onSimulateAction 
}: { 
    canvas: StrategyCanvas; 
    projectId: string; 
    onReset: () => void; 
    onRefine?: () => void; 
    onViewDoc?: () => void; 
    onSimulateAction: (action: ActionWithScenarios) => void; 
}) {
    const realLocations = canvas.locationSplits?.filter(l => l.locationName !== 'Global') ?? [];

    return (
        <div className="goal-canvas" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", padding: 0 }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
                {/* Goal Pill */}
                <div className="goal-canvas-header">
                    <div className="goal-pill">
                        <span className="material-symbols-outlined text-xs">target</span>
                        <span className="capitalize font-semibold">{canvas.goal.changeDirection}</span>
                        <span className="font-bold">{canvas.goal.targetMetric}</span>
                        <span className="goal-pill-meta">by {canvas.goal.targetValue}</span>
                        {canvas.goal.timeframe !== 'not specified' && (
                            <span className="goal-pill-meta">· {canvas.goal.timeframe}</span>
                        )}
                    </div>
                    {canvas.pipelineMs && (
                        <span className="goal-pill-time">Generated in {(canvas.pipelineMs / 1000).toFixed(1)}s</span>
                    )}
                </div>

                {/* Decomposition */}
                <div className="goal-section">
                    <div className="goal-section-title">
                        <span className="material-symbols-outlined text-sm text-violet-500">account_tree</span>
                        KPI Decomposition
                    </div>
                    <div className="goal-formula">{canvas.decomposed.formula}</div>
                    <ul className="goal-factors">
                        {canvas.decomposed.factors.map((f, i) => (
                            <li key={i} className="goal-factor">
                                <div className="goal-factor-bar-wrap">
                                    <div className="goal-factor-bar" style={{ width: `${Math.round((f.weight ?? 0.5) * 100)}%` }} />
                                </div>
                                <div className="goal-factor-info">
                                    <span className="goal-factor-name">{f.metric}</span>
                                    <span className="goal-factor-change">{f.requiredChange}</span>
                                </div>
                                <p className="goal-factor-desc">{f.description}</p>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Actions */}
                <div className="goal-section">
                    <div className="goal-section-title">
                        <span className="material-symbols-outlined text-sm text-violet-500">auto_awesome</span>
                        Top Recommended Strategies
                    </div>
                    <div className="goal-actions">
                        {canvas.scenarios.map((action, i) => (
                            <ActionCard 
                                key={action.id} 
                                action={action} 
                                index={i} 
                                projectId={projectId} 
                                onSimulateAction={onSimulateAction} 
                            />
                        ))}
                    </div>
                </div>

                {/* Location Breakdown */}
                {realLocations.length > 0 && (
                    <div className="goal-section">
                        <div className="goal-section-title">
                            <span className="material-symbols-outlined text-sm text-violet-500">location_on</span>
                            Location Strategy
                        </div>
                        <div className="goal-locations">
                            {realLocations.map((loc, i) => {
                                const tier = TIER_BADGE[loc.performanceTier] ?? TIER_BADGE.MEDIUM;
                                return (
                                    <div key={i} className="goal-location-row">
                                        <span className={`goal-loc-badge ${tier.cls}`}>{tier.label}</span>
                                        <div className="goal-loc-info">
                                            <span className="goal-loc-name">{loc.locationName}</span>
                                            <span className="goal-loc-goal">{loc.adjustedGoal}</span>
                                            <p className="goal-loc-reason">{loc.tierReason}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <button className="goal-reset-btn" onClick={onReset}>
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    New Goal
                </button>
            </div>
        </div>
    );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function GoalStrategyPanel({
    projectId, isOpen, onClose, initialQuery = '', onSimulationComplete,
    domainName = 'Intelligence Workspace',
    activeKPIs = [],
    askAiMessages = []
}: GoalStrategyPanelProps & { 
    initialQuery?: string; 
    onSimulationComplete?: (ctx: StrategyCanvasResult) => void;
    domainName?: string;
    activeKPIs?: Array<{name: string, category: string}>;
    askAiMessages?: Array<{role: string, text: string}>;
}) {
    const [input, setInput] = useState(initialQuery);
    const [loading, setLoading] = useState(false);
    const { preferLocal, setPreferLocal } = useAIMode();
    const [stage, setStage] = useState<string | null>(null);
    const [canvas, setCanvas] = useState<StrategyCanvas | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pastGoals, setPastGoals] = useState<PastGoal[]>([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [isDocView, setIsDocView] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Simulator State
    const [simulatingAction, setSimulatingAction] = useState<ActionWithScenarios | null>(null);
    const [simulationContext, setSimulationContext] = useState<StrategyCanvasResult | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [realHistory, setRealHistory] = useState<{ date: string, value: number }[]>([]);
    const [chatMessages, setChatMessages] = useState<{ role: string, text: string }[]>([]);
    const [projectSources, setProjectSources] = useState<any[]>([]);

    const handleSimulationComplete = useCallback((data: StrategyCanvasResult) => {
        setSimulationContext(data);
        onSimulationComplete?.(data);
    }, [onSimulationComplete]);

    const handleMessagesChange = useCallback((msgs: { role: string, text: string }[]) => {
        setChatMessages(msgs);
    }, []);

    // Fetch real dashboard data to pass into simulator when opened
    useEffect(() => {
        if (!isOpen || !projectId) return;
        fetch(`/api/projects/${projectId}/dashboard/data`)
            .then(res => res.json())
            .then(d => {
                const executionKpis = Array.isArray(d?.kpis) ? (d.kpis as DashboardKpiExecutionItem[]) : [];
                const targetMetric = canvas?.goal?.targetMetric ?? 'unknown';
                const resolvedHistory = resolveForecastHistory(targetMetric, executionKpis);
                if (resolvedHistory.length > 0) {
                    setRealHistory(resolvedHistory);
                }
            })
            .catch(() => {});
    }, [isOpen, projectId, canvas?.goal?.targetMetric]);

    // Fetch project sources for report metadata
    useEffect(() => {
        if (isOpen && projectId) {
            fetch(`/api/projects/${projectId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.sources) setProjectSources(data.sources);
                })
                .catch(err => console.error("Failed to fetch project sources", err));
        }
    }, [isOpen, projectId]);

    // Focus textarea on open and populate initialQuery if present
    useEffect(() => {
        if (isOpen) {
            if (initialQuery) {
                setInput(initialQuery);
            }
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen, initialQuery]);

    // Load past goals on open
    useEffect(() => {
        if (!isOpen || !projectId) return;
        fetch(`/api/projects/${projectId}/goals`)
            .then(r => r.json())
            .then(d => { if (d.goals) setPastGoals(d.goals); })
            .catch(() => { });
    }, [isOpen, projectId]);

    const animateStages = useCallback(async () => {
        for (const s of PIPELINE_STAGES) {
            setStage(s.key);
            await new Promise(r => setTimeout(r, 650));
        }
    }, []);

    const handleSubmit = useCallback(async (customQuery?: string | React.MouseEvent<HTMLButtonElement>) => {
        const q = typeof customQuery === 'string' ? customQuery.trim() : input.trim();

        if (!q || loading) return;
        setLoading(true);
        setCanvas(null);
        setError(null);
        setStage('PARSING');

        try {
            const [res] = await Promise.all([
                fetch(`/api/projects/${projectId}/goals`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        [AI_MODE_HEADER_KEY]: preferLocal ? 'local' : 'cloud',
                    },
                    body: JSON.stringify({ 
                        rawQuery: q,
                        preferLocal
                    }),
                }),
                animateStages(),
            ]);

            setStage(null);

            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                throw new Error(e.error ?? `Server error ${res.status}`);
            }
            const data = await res.json();
            setCanvas(data.strategyCanvas as StrategyCanvas);
            setPastGoals(prev => [{
                id: data.goalId,
                rawQuery: q,
                targetValue: data.strategyCanvas?.goal?.targetValue ?? '',
                timeframe: data.strategyCanvas?.goal?.timeframe ?? '',
                status: 'ACTIVE',
                createdAt: new Date().toISOString(),
                generatedPlan: data.strategyCanvas,
            }, ...prev].slice(0, 10));
            setInput('');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to generate strategy. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [input, loading, projectId, preferLocal, animateStages]);

    const captureSvgAsPng = async (containerId: string): Promise<string | null> => {
        if (typeof window === 'undefined') return null;
        const container = document.getElementById(containerId);
        if (!container) return null;
        const svgElement = container.querySelector('svg');
        if (!svgElement) return null;

        return new Promise((resolve) => {
            try {
                const svgString = new XMLSerializer().serializeToString(svgElement);
                const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const URL = window.URL || window.webkitURL || window;
                const blobURL = URL.createObjectURL(svgBlob);
                const image = new window.Image();
                image.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = svgElement.clientWidth || 800;
                    canvas.height = svgElement.clientHeight || 450;
                    const context = canvas.getContext('2d');
                    if (context) {
                        context.fillStyle = '#ffffff';
                        context.fillRect(0, 0, canvas.width, canvas.height);
                        context.drawImage(image, 0, 0);
                        resolve(canvas.toDataURL('image/png'));
                    } else {
                        resolve(null);
                    }
                    URL.revokeObjectURL(blobURL);
                };
                image.onerror = () => {
                    URL.revokeObjectURL(blobURL);
                    resolve(null);
                };
                image.src = blobURL;
            } catch (e) {
                console.warn("SVG serialization failed", e);
                resolve(null);
            }
        });
    };

    const handleGenerateReport = async () => {
        if (!simulationContext) return;
        setIsGeneratingReport(true);
    
        try {
          let chartImageBase64 = null;
          let dashboardImageBase64 = null;
          
          try {
            const chartElement = document.getElementById('strategy-canvas-container');
            if (chartElement) {
                // Try SVG capture first to bypass html2canvas oklch issues
                chartImageBase64 = await captureSvgAsPng('strategy-canvas-container');
                
                if (!chartImageBase64) {
                    const canvasEl = await html2canvas(chartElement, { scale: 2 });
                    chartImageBase64 = canvasEl.toDataURL('image/png');
                }
            }
            const dashboardElement = document.getElementById('dashboard-grid-container');
            if (dashboardElement) {
                const dashCanvas = await html2canvas(dashboardElement, { scale: 1.5 });
                dashboardImageBase64 = dashCanvas.toDataURL('image/png');
            }
          } catch (e) {
            console.warn("UI capture failed. Using placeholders where necessary.", e);
            if (!chartImageBase64) {
                chartImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
            }
            dashboardImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
          }
    
          let targetGoalVal = 75000;
          if (canvas) {
              const parsed = parseFloat(canvas.goal.targetValue.replace(/[^0-9.]/g, ''));
              if (!isNaN(parsed)) targetGoalVal = parsed;
          }

          const gap = Math.max(0, targetGoalVal - simulationContext.scenarios.baseline[simulationContext.scenarios.baseline.length - 1].yhat);
    
          const lastUserMsg = [...askAiMessages].reverse().find(m => m.role.toLowerCase() === 'user');
          const lastAssistantMsg = lastUserMsg 
            ? askAiMessages.find((m, i) => i > askAiMessages.indexOf(lastUserMsg) && m.role.toLowerCase() === 'assistant')
            : null;

          const chatHistoryPairs = [];
          for (let i = 0; i < askAiMessages.length; i++) {
              if (askAiMessages[i].role.toLowerCase() === 'user') {
                  const q = askAiMessages[i].text;
                  let ans = "No response recorded.";
                  for (let j = i + 1; j < askAiMessages.length; j++) {
                      if (askAiMessages[j].role.toLowerCase() === 'assistant' || askAiMessages[j].role.toLowerCase() === 'system') {
                          ans = askAiMessages[j].text;
                          break;
                      }
                  }
                  chatHistoryPairs.push({ question: q, answer: ans });
              }
          }

          const payload = {
            chartImage: chartImageBase64,
            dashboardImage: dashboardImageBase64,
            domain: domainName,
            selectedKPIs: activeKPIs,
            uploadedDatasets: projectSources.map(s => ({
                fileName: s.fileName || s.name,
                status: s.status,
                columns: s.columns?.length || 0
            })),
            cleaningSummary: projectSources.length > 0 
                ? `Automatic purification completed across ${projectSources.length} datasets. Data normalized, missing values handled, and semantic roles aligned for ${domainName} domain.`
                : "No datasets detected for summary.",
            actions: canvas?.scenarios?.map(a => ({ title: a.actionName, impact: a.tier })) || [],
            forecastData: {
                kpi: canvas?.goal.targetMetric || 'Primary KPI',
                trend: simulationContext.probabilityOfSuccess > 0.5 ? 'Upward trajectory' : 'Stagnant or downward trajectory',
                confidence: simulationContext.reliabilityScore > 80 ? 'High' : 'Moderate'
            },
            metrics: {
              probability: simulationContext.probabilityOfSuccess,
              reliability: simulationContext.reliabilityScore,
              gap: gap,
              target: targetGoalVal
            },
            chatSummary: chatMessages.length > 0 
                ? chatMessages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')
                : `User selected action: ${simulatingAction?.actionName}. Tested simulated outcomes for achieving ${canvas?.goal.targetMetric}.`,
            globalChatSummary: askAiMessages.length > 0 
                ? askAiMessages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n') 
                : 'No recent exploratory questions logged.',
            module6Question: lastUserMsg?.text || "",
            module6Answer: lastAssistantMsg?.text || "",
            kpiHistory: realHistory,
            forecastScenarios: simulationContext?.scenarios,
            strategyCanvas: canvas,
            module6ChatHistory: chatHistoryPairs
          };
    
          const response = await fetch('/api/v1/report/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
    
          if (!response.ok) throw new Error("Failed to generate report");
    
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'VistaraBI_Executive_Report.pdf';
          a.click();
        } catch (error) {
          console.error("Report generation failed", error);
          alert("Failed to generate Executive Report.");
        } finally {
          setIsGeneratingReport(false);
        }
    };

    if (!isOpen) return null;

    // OVERLAY FOR SIMULATOR
    if (simulatingAction && canvas) {
        let parsedTargetValue = 75000;
        const rawTarget = parseFloat(canvas.goal.targetValue.replace(/[^0-9.]/g, ''));
        if (!isNaN(rawTarget)) parsedTargetValue = rawTarget;

        const balancedScenario = simulatingAction.scenarios.find(s => s.level === 'BALANCED');
        const fallbackScenario = simulatingAction.scenarios[0];
        const scenarioLiftPercent = parseLiftPercent(balancedScenario?.expectedKpiLift)
            ?? parseLiftPercent(fallbackScenario?.expectedKpiLift);
        const actionConfidenceLift = Math.max(1, Math.round(simulatingAction.confidenceScore * 0.3));
        const upliftPercent = scenarioLiftPercent ?? actionConfidenceLift;

        const initialSimulatorContext = {
            goalValue: parsedTargetValue,
            actionName: simulatingAction.actionName,
            kpiHistory: realHistory,
            uplift: upliftPercent
        };

        return (
            <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col font-sans overflow-hidden">
                <div className="h-16 bg-white border-b border-slate-200 px-6 flex justify-between items-center shrink-0 shadow-md z-10 relative">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-sm">
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 leading-tight">Strategic Decision Simulator</h1>
                            <p className="text-xs text-slate-500 font-medium leading-tight">Targeting: {canvas.goal.targetMetric} | Simulating: {simulatingAction.actionName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleGenerateReport}
                            disabled={!simulationContext || isGeneratingReport}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg transition-colors shadow-sm"
                        >
                            <FileText className="w-4 h-4" />
                            {isGeneratingReport ? 'Generating PDF...' : 'Export Executive Report'}
                        </button>
                        <div className="w-px h-8 bg-slate-200 mx-2"></div>
                        <button 
                            onClick={() => { setSimulatingAction(null); setSimulationContext(null); }}
                            className="flex items-center justify-center w-10 h-10 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors"
                            title="Close Simulator"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto p-6 max-w-[2000px] mx-auto w-full">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full min-h-[800px]">
                        <div id="strategy-canvas-container" className="xl:col-span-2 w-full h-full min-h-[700px] bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
                            <StrategyCanvas 
                                initialContext={initialSimulatorContext}
                                onSimulationComplete={handleSimulationComplete} 
                            />
                        </div>
                        <div className="xl:col-span-1 w-full h-full min-h-[500px] bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
                            <AIChatPanel 
                                simulationContext={simulationContext} 
                                onMessagesChange={handleMessagesChange}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="goal-panel-backdrop" onClick={onClose} aria-label="Close Goal Strategy panel" />

            <div className="goal-panel" role="dialog" aria-label="Goal Strategy Engine" aria-modal="true">
                {/* Header */}
                <div className="goal-panel-header">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm text-violet-600">target</span>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-800">Goal Strategy Engine</h2>
                            <p className="text-[10px] text-slate-400">Prescriptive intelligence · Module 7</p>
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
                        <button onClick={onClose} className="ask-ai-close-btn" title="Close">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="goal-panel-body">
                    {/* Input area – always visible unless canvas is showing */}
                    {!canvas && (
                        <div className="goal-input-area">
                            <textarea
                                ref={inputRef}
                                className="goal-input"
                                value={input}
                                onChange={e => { if (e.target.value.length <= 300) setInput(e.target.value); }}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                                placeholder="Describe your business goal…&#10;e.g. Increase revenue by 20% this quarter"
                                disabled={loading}
                                rows={3}
                                maxLength={300}
                                aria-label="Business goal input"
                            />
                            {/* Example chips */}
                            <div className="goal-chips">
                                {EXAMPLE_GOALS.map((ex, i) => (
                                    <button
                                        key={i} className="goal-chip"
                                        onClick={() => setInput(ex)}
                                        disabled={loading}
                                    >{ex}</button>
                                ))}
                            </div>
                            <button
                                className="goal-submit-btn"
                                onClick={() => handleSubmit()}
                                disabled={loading || !input.trim()}
                                aria-label="Generate strategy"
                            >
                                {loading
                                    ? <><span className="goal-btn-spinner" />Analyzing…</>
                                    : <><span className="material-symbols-outlined text-sm">auto_fix_high</span>Generate Strategy</>
                                }
                            </button>
                            {input.length > 250 && (
                                <p className="text-[10px] text-amber-500 mt-1">{300 - input.length} characters remaining</p>
                            )}
                        </div>
                    )}

                    {/* Pipeline Progress */}
                    {loading && stage && <PipelineProgress activeStage={stage} />}

                    {/* Error */}
                    {error && !loading && (
                        <div className="goal-error-card">
                            <span className="material-symbols-outlined text-sm text-rose-500">error</span>
                            <p className="text-sm text-slate-700 flex-1">{error}</p>
                            <button className="ask-ai-retry-btn" onClick={() => handleSubmit()}>Retry</button>
                        </div>
                    )}

                    {/* Strategy Canvas */}
                    {canvas && !loading && !isDocView && (
                        <StrategyCanvasView 
                            canvas={canvas} 
                            projectId={projectId}
                            onReset={() => { setCanvas(null); setError(null); }} 
                            onRefine={() => { }} 
                            onViewDoc={() => setIsDocView(true)} 
                            onSimulateAction={(action) => setSimulatingAction(action)}
                        />
                    )}
                    
                    {canvas && !loading && isDocView && (
                        <StrategyDocView canvas={canvas} onBack={() => setIsDocView(false)} />
                    )}

                    {/* Goal History */}
                    {pastGoals.length > 0 && !loading && !canvas && (
                        <div className="goal-history">
                            <button className="goal-history-toggle" onClick={() => setHistoryOpen(o => !o)}>
                                <span className="material-symbols-outlined text-sm">history</span>
                                Past Goals ({pastGoals.length})
                                <span className="material-symbols-outlined text-sm ml-auto">
                                    {historyOpen ? 'expand_less' : 'expand_more'}
                                </span>
                            </button>
                            {historyOpen && (
                                <ul className="goal-history-list">
                                    {pastGoals.map(g => (
                                        <li
                                            key={g.id} className="goal-history-item"
                                            role="button" tabIndex={0}
                                            onClick={() => { if (g.generatedPlan) { setCanvas(g.generatedPlan); setHistoryOpen(false); } }}
                                            onKeyDown={e => { if (e.key === 'Enter' && g.generatedPlan) { setCanvas(g.generatedPlan); setHistoryOpen(false); } }}
                                        >
                                            <span className="goal-history-query">{g.rawQuery}</span>
                                            <span className="goal-history-date">{fmtDate(g.createdAt)}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
