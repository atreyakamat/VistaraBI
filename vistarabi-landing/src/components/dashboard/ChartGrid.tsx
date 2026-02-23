'use client';

// Module 5 — Chart Grid (Enhanced)
// Responsive dashboard-grid with drill-down support forwarded to each ChartContainer

import { ChartContainer } from './ChartContainer';
import type { KPICardData } from './types';

interface ChartGridProps {
    kpis: KPICardData[];
    onDrillDown?: (kpiId: string, label: string, value: number) => void;
}

export function ChartGrid({ kpis, onDrillDown }: ChartGridProps) {
    if (kpis.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-5xl mb-4 opacity-30">📊</div>
                <p className="text-sm text-gray-400 font-medium">No chart data available</p>
                <p className="text-xs text-gray-300 mt-1">Refresh the dashboard to generate charts</p>
            </div>
        );
    }

    return (
        <div className="dashboard-grid">
            {kpis.map((kpi, index) => (
                <ChartContainer
                    key={kpi.kpiId}
                    kpi={kpi}
                    index={index}
                    onDrillDown={onDrillDown}
                />
            ))}
        </div>
    );
}
