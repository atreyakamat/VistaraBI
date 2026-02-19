'use client';

// Module 5A — 2×2 Chart Grid
// Renders 4 charts per viewport in a structured grid layout

import { ChartContainer } from './ChartContainer';
import type { KPICardData } from './types';

interface ChartGridProps {
    kpis: KPICardData[];
}

/**
 * Renders KPIs in a 2×2 grid layout.
 * Only shows 4 charts per "page" — use sections for overflow.
 */
export function ChartGrid({ kpis }: ChartGridProps) {
    if (kpis.length === 0) {
        return (
            <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📊</div>
                <div className="text-sm">No chart data available</div>
            </div>
        );
    }

    return (
        <div className="dashboard-grid">
            {kpis.map((kpi, index) => (
                <ChartContainer key={kpi.kpiId} kpi={kpi} index={index} />
            ))}
        </div>
    );
}
