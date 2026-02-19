'use client';

// Module 5A — KPI Card Back Face
// Shows AI-generated explanation, formula, data source, business definition

import type { KPIExplanationData } from './types';

interface KPICardBackProps {
    kpiName: string;
    explanation?: KPIExplanationData;
    formula: string;
    onFlipBack: () => void;
}

export function KPICardBack({ kpiName, explanation, formula, onFlipBack }: KPICardBackProps) {
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

            {explanation ? (
                <div className="space-y-2 text-xs flex-1 overflow-y-auto">
                    <div>
                        <div className="text-slate-400 font-medium mb-0.5">Business Definition</div>
                        <div className="text-slate-200">{explanation.businessDefinition}</div>
                    </div>
                    <div>
                        <div className="text-slate-400 font-medium mb-0.5">Explanation</div>
                        <div className="text-slate-200">{explanation.explanation}</div>
                    </div>
                    <div>
                        <div className="text-slate-400 font-medium mb-0.5">Formula</div>
                        <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded text-[11px]">
                            {explanation.formulaSummary}
                        </code>
                    </div>
                    <div>
                        <div className="text-slate-400 font-medium mb-0.5">Data Source</div>
                        <div className="text-slate-300">{explanation.dataSourceRef}</div>
                    </div>
                    {explanation.recommendation && (
                        <div className="bg-blue-500/10 rounded-lg p-2 mt-1">
                            <div className="text-blue-400 font-medium mb-0.5">💡 Recommendation</div>
                            <div className="text-slate-300">{explanation.recommendation}</div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center">
                    <div className="text-slate-500 text-xs">
                        <div className="mb-1">No AI explanation available</div>
                        <code className="text-blue-300 text-[11px]">{formula}</code>
                    </div>
                </div>
            )}
        </div>
    );
}
