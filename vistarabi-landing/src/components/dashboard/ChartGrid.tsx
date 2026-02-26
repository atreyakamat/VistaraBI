'use client';

// Module 5 — Chart Grid
// Responsive grid with per-chart drill-down, compact card view toggle

import { useState } from 'react';
import { ChartContainer } from './ChartContainer';
import type { KPICardData } from './types';
import type { DateRange, Granularity } from './ChartContainer';

interface ChartGridProps {
    kpis: KPICardData[];
    projectId?: string;
    selectedKpis?: Set<string>;
    onToggleSelection?: (kpiId: string) => void;
    externalFilters?: Record<string, { range: DateRange; gran: Granularity; ts: number }>;
    onDrillDown?: (kpiId: string, label: string, value: number) => void;
}

export function ChartGrid({ kpis, projectId, selectedKpis = new Set(), onToggleSelection, externalFilters = {}, onDrillDown }: ChartGridProps) {
    const [compact, setCompact] = useState(false);

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
        <div>
            {/* ── View toggle ───────────────────────────────────────── */}
            <div className="chart-grid-controls">
                <span className="chart-grid-count">{kpis.length} chart{kpis.length !== 1 ? 's' : ''}</span>
                <div className="chart-grid-view-toggle">
                    <button
                        className={`chart-view-btn ${!compact ? 'active' : ''}`}
                        onClick={() => setCompact(false)}
                        title="Detailed view"
                        aria-pressed={!compact}
                    >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="1" y="1" width="6" height="6" rx="1" />
                            <rect x="9" y="1" width="6" height="6" rx="1" />
                            <rect x="1" y="9" width="6" height="6" rx="1" />
                            <rect x="9" y="9" width="6" height="6" rx="1" />
                        </svg>
                        Expanded
                    </button>
                    <button
                        className={`chart-view-btn ${compact ? 'active' : ''}`}
                        onClick={() => setCompact(true)}
                        title="Compact card view"
                        aria-pressed={compact}
                    >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="1" y="1" width="14" height="3" rx="1" />
                            <rect x="1" y="6.5" width="14" height="3" rx="1" />
                            <rect x="1" y="12" width="14" height="3" rx="1" />
                        </svg>
                        Compact
                    </button>
                </div>
            </div>

            {/* ── Grid ─────────────────────────────────────────────── */}
            <div className={compact ? 'chart-grid-compact' : 'dashboard-grid'}>
                {kpis.map((kpi, index) => (
                    <ChartContainer
                        key={kpi.kpiId}
                        kpi={kpi}
                        index={index}
                        projectId={projectId}
                        compact={compact}
                        isSelected={selectedKpis.has(kpi.kpiId)}
                        onToggleSelect={onToggleSelection ? () => onToggleSelection(kpi.kpiId) : undefined}
                        externalFilter={externalFilters[kpi.kpiId] || null}
                        onDrillDown={onDrillDown}
                    />
                ))}
            </div>
        </div>
    );
}
