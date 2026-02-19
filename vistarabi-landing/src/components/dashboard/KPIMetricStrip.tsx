'use client';

// Module 5A — Horizontal KPI Metric Strip
// Renders all KPI cards in a scrollable strip

import { KPIMetricCard } from './KPIMetricCard';
import type { KPICardData, KPIExplanationData } from './types';

interface KPIMetricStripProps {
    kpis: KPICardData[];
    explanations: Record<string, KPIExplanationData>;
}

export function KPIMetricStrip({ kpis, explanations }: KPIMetricStripProps) {
    if (kpis.length === 0) return null;

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Key Metrics
                </h2>
                <span className="text-[10px] text-gray-400">
                    Double-click any card for AI insight
                </span>
            </div>
            <div className="metric-strip">
                {kpis.map((kpi) => (
                    <div key={kpi.kpiId} className="min-w-[220px] max-w-[260px] flex-shrink-0">
                        <KPIMetricCard
                            data={kpi}
                            explanation={explanations[kpi.kpiId]}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
