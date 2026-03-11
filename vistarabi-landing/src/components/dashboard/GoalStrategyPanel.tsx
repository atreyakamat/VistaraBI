// src/components/dashboard/GoalStrategyPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import type { StrategyCanvas } from '@/lib/module-7/goal-engine';

interface GoalStrategyPanelProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function GoalStrategyPanel({ projectId, isOpen, onClose }: GoalStrategyPanelProps) {
    const [rawQuery, setRawQuery] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationStep, setGenerationStep] = useState('');
    const [canvas, setCanvas] = useState<StrategyCanvas | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

    // Fetch history on mount or when tab changes
    useEffect(() => {
        if (isOpen && activeTab === 'history') {
            fetch(`/api/projects/${projectId}/goals`)
                .then(res => res.json())
                .then(data => setHistory(data.goals || []));
        }
    }, [projectId, isOpen, activeTab]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rawQuery.trim() || isGenerating) return;

        setIsGenerating(true);
        setCanvas(null);

        const steps = [
            'Parsing Goal...',
            'Mapping to KPIs...',
            'Decomposing Factors...',
            'Generating AI Strategies...',
            'Ranking Recommendations...',
            'Building Execution Scenarios...',
            'Finalizing Strategy Canvas...'
        ];

        // Simulate step transitions for UX
        for (const step of steps) {
            setGenerationStep(step);
            await new Promise(r => setTimeout(r, 600));
        }

        try {
            const res = await fetch(`/api/projects/${projectId}/goals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawQuery })
            });
            const data = await res.json();
            if (data.success) {
                setCanvas(data.strategyCanvas);
                setRawQuery('');
            }
        } catch (err) {
            console.error('Failed to generate strategy:', err);
        } finally {
            setIsGenerating(false);
            setGenerationStep('');
        }
    };

    return (
        <>
            {isOpen && <div className="insight-panel-backdrop" onClick={onClose} />}

            <div className={`insight-panel ${isOpen ? 'open' : ''}`}>
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-blue-400">target</span>
                        <h3 className="text-sm font-bold text-white">Goal Strategy Engine</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700/50">
                    <button 
                        onClick={() => setActiveTab('new')}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'new' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}
                    >
                        New Strategy
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider ${activeTab === 'history' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}
                    >
                        History
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    {activeTab === 'new' ? (
                        <div className="space-y-6">
                            {!canvas && !isGenerating && (
                                <div className="space-y-4">
                                    <p className="text-xs text-slate-400 leading-relaxed">
                                        Define a high-level business goal (e.g., "Increase revenue by 20% this quarter") 
                                        to generate a data-backed execution roadmap.
                                    </p>
                                    <form onSubmit={handleSubmit} className="space-y-3">
                                        <textarea
                                            value={rawQuery}
                                            onChange={(e) => setRawQuery(e.target.value)}
                                            placeholder="What is your primary goal?"
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 min-h-[100px] resize-none"
                                        />
                                        <button 
                                            type="submit"
                                            disabled={!rawQuery.trim()}
                                            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                                        >
                                            <span className="material-symbols-outlined text-sm">auto_fix</span>
                                            Generate Strategy Canvas
                                        </button>
                                    </form>
                                </div>
                            )}

                            {isGenerating && (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-blue-400 animate-pulse">query_stats</span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs font-bold text-white mb-1">{generationStep}</div>
                                        <div className="text-[10px] text-slate-500">AI is analyzing your KPI blueprint...</div>
                                    </div>
                                </div>
                            )}

                            {canvas && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Goal Header */}
                                    <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-3">
                                        <div className="text-[10px] text-blue-400 uppercase font-bold mb-1">Active Target</div>
                                        <div className="text-sm font-bold text-white capitalize">
                                            {canvas.goal.targetMetric} {canvas.goal.targetValue}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1">Timeframe: {canvas.goal.timeframe}</div>
                                    </div>

                                    {/* Factors */}
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">KPI Drivers</div>
                                        {canvas.decomposed.factors.map((f, i) => (
                                            <div key={i} className="flex items-start gap-3 bg-slate-800/30 p-2 rounded-lg border border-slate-700/50">
                                                <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-[10px] font-bold text-blue-400">
                                                    {i + 1}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-slate-200">{f.metric} ({f.requiredChange})</div>
                                                    <div className="text-[10px] text-slate-500">{f.description}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Recommended Actions */}
                                    <div className="space-y-3">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recommended Actions</div>
                                        {canvas.scenarios.map((action, idx) => (
                                            <div key={action.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-bold text-white">{action.actionName}</h4>
                                                    <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                                                        {action.confidenceScore}% match
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-slate-400 leading-relaxed">{action.description}</p>
                                                
                                                {/* Budget Scenarios (Horizontal Scroll) */}
                                                <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                                    {action.scenarios.map(sc => (
                                                        <div key={sc.level} className="min-w-[140px] bg-slate-900/50 p-2 rounded-lg border border-slate-700/30">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-[9px] font-bold text-slate-500">{sc.level}</span>
                                                                <span className="text-[9px] font-bold text-blue-400">{sc.estimatedCost}</span>
                                                            </div>
                                                            <ul className="space-y-1">
                                                                {sc.executionPlan.map((step, si) => (
                                                                    <li key={si} className="text-[8px] text-slate-300 flex items-center gap-1">
                                                                        <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                                                                        {step}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button 
                                        onClick={() => setCanvas(null)}
                                        className="w-full border border-slate-700 hover:bg-slate-800 text-slate-400 text-[10px] font-bold py-2 rounded-lg transition-colors"
                                    >
                                        Create New Goal
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <div className="text-center py-12 text-slate-500 text-xs">No saved strategies found.</div>
                            ) : (
                                history.map(h => (
                                    <div 
                                        key={h.id} 
                                        className="bg-slate-800/30 border border-slate-700/50 p-3 rounded-xl hover:border-blue-500/50 cursor-pointer transition-all"
                                        onClick={() => {
                                            setCanvas(h.generatedPlan);
                                            setActiveTab('new');
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-bold text-blue-400 capitalize">{h.targetMetric}</span>
                                            <span className="text-[9px] text-slate-500">{new Date(h.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-xs font-medium text-white line-clamp-1">{h.rawQuery}</div>
                                        <div className="text-[10px] text-slate-500 mt-1">{h.targetValue} target</div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
