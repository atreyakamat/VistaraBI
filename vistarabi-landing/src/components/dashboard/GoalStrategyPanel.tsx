'use client';

// Module 7 — Goal Strategy Panel (Full Implementation)
// Premium intelligence panel for the Goal Strategy Engine.
// Features: goal input, 5-stage pipeline progress, strategy canvas with
// decomposition, ranked actions with collapsible scenario tabs, and location breakdown.

import { useState, useRef, useEffect, useCallback } from 'react';

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
    MEDIUM: { cls: 'goal-loc-tier--medium', label: '→ Avg' },
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

// ─── Scenario Tabs ────────────────────────────────────────────────────────────

function ScenarioTabs({ scenarios }: { scenarios: BudgetScenario[] }) {
    const map = Object.fromEntries(scenarios.map(s => [s.level, s]));
    const [active, setActive] = useState<BudgetScenario['level']>('LEAN');
    const cur = map[active];

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
                    <div className="goal-scenario-meta">
                        <span><span className="material-symbols-outlined text-[10px]">payments</span>{cur.estimatedCost}</span>
                        <span><span className="material-symbols-outlined text-[10px]">schedule</span>{cur.timeline}</span>
                        {cur.expectedKpiLift && (
                            <span className="goal-lift-badge">
                                <span className="material-symbols-outlined text-[10px]">trending_up</span>
                                {cur.expectedKpiLift}
                            </span>
                        )}
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

function ActionCard({ action, index }: { action: ActionWithScenarios; index: number }) {
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
            {expanded && <ScenarioTabs scenarios={action.scenarios} />}
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


function StrategyCanvasView({ canvas, onReset }: { canvas: StrategyCanvas; onReset: () => void; }) {
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
                            <ActionCard key={action.id} action={action} index={i} />
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
            );
}

            // ─── Main Panel ───────────────────────────────────────────────────────────────

            export function GoalStrategyPanel({projectId, isOpen, onClose, initialQuery = ''}: GoalStrategyPanelProps & {initialQuery ?: string}) {
    const [input, setInput] = useState(initialQuery);
            const [loading, setLoading] = useState(false);
            const [stage, setStage] = useState<string | null>(null);
            const [canvas, setCanvas] = useState<StrategyCanvas | null>(null);
            const [error, setError] = useState<string | null>(null);
            const [pastGoals, setPastGoals] = useState<PastGoal[]>([]);
            const [historyOpen, setHistoryOpen] = useState(false);
            const [isDocView, setIsDocView] = useState(false);
            const inputRef = useRef<HTMLTextAreaElement>(null);

    // Focus textarea on open and populate initialQuery if present
    useEffect(() => {
        if (isOpen) {
            if (initialQuery) {
                    setInput(initialQuery);
                // We don't auto-submit here to let the user review it, but we could if we wanted
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

                    const [res] = await Promise.all([
                    fetch(`/api/projects/${projectId}/goals`, {
                        method: 'POST',
                    headers: {'Content-Type': 'application/json' },
                    body: JSON.stringify({rawQuery: q }),
            }),
                    animateStages(),
                    ]);

                    setStage(null);

                    try {
            if (!res.ok) {
                const e = await res.json().catch(() => ({ }));
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
    }, [input, loading, projectId, animateStages]);

                    if (!isOpen) return null;

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
                                <button onClick={onClose} className="ask-ai-close-btn" title="Close">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
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
                                {canvas && !loading && (
                                    <StrategyCanvasView canvas={canvas} onReset={() => { setCanvas(null); setError(null); }} onRefine={() => { }} onViewDoc={() => setIsDocView(true)} />
                                )}

                                {/* Goal History */}
                                {pastGoals.length > 0 && !loading && (
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
