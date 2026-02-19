'use client';

// Module 5A — Chart Container
// Wrapper for each chart box with header, type switcher, export, and hover stats

import { useState, useRef, useEffect } from 'react';
import { ChartRenderer } from './ChartRenderer';
import type { KPICardData } from './types';

interface ChartContainerProps {
    kpi: KPICardData;
    index: number;
}

const CHART_TYPE_OPTIONS = [
    { value: 'line', label: 'Line', lib: 'chartjs' as const },
    { value: 'bar', label: 'Bar', lib: 'chartjs' as const },
    { value: 'area', label: 'Area', lib: 'chartjs' as const },
    { value: 'doughnut', label: 'Doughnut', lib: 'chartjs' as const },
    { value: 'horizontal_bar', label: 'H. Bar', lib: 'chartjs' as const },
    { value: 'pie', label: 'Pie', lib: 'chartjs' as const },
    { value: 'radar', label: 'Radar', lib: 'chartjs' as const },
    { value: 'scatter', label: 'Scatter', lib: 'chartjs' as const },
    { value: 'heatmap', label: 'Heatmap', lib: 'plotly' as const },
    { value: 'treemap', label: 'Treemap', lib: 'plotly' as const },
    { value: 'box_plot', label: 'Box Plot', lib: 'plotly' as const },
    { value: 'waterfall', label: 'Waterfall', lib: 'plotly' as const },
];

export function ChartContainer({ kpi, index }: ChartContainerProps) {
    const [chartType, setChartType] = useState(kpi.chartType);
    const [chartLib, setChartLib] = useState(kpi.chartLibrary);
    const [visible, setVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Lazy loading via IntersectionObserver
    useEffect(() => {
        const ref = containerRef.current;
        if (!ref) return;

        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
            { threshold: 0.1 }
        );
        observer.observe(ref);
        return () => observer.disconnect();
    }, []);

    // Chart type switch
    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const opt = CHART_TYPE_OPTIONS.find(o => o.value === e.target.value);
        if (opt) {
            setChartType(opt.value);
            setChartLib(opt.lib);
        }
    };

    // Hover stats
    const total = kpi.dataPoints.reduce((s, d) => s + d.value, 0);
    const avg = kpi.dataPoints.length > 0 ? total / kpi.dataPoints.length : 0;

    return (
        <div
            ref={containerRef}
            className="chart-container chart-entrance"
            style={{ animationDelay: `${index * 100}ms` }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {kpi.kpiName.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{kpi.formula}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Chart Type Switcher */}
                    <select
                        value={chartType}
                        onChange={handleTypeChange}
                        className="text-[10px] bg-gray-50 border border-gray-200 rounded-md px-1.5 py-1 text-gray-600 cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {CHART_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Chart Area */}
            <div className="p-4" style={{ height: '260px' }}>
                {visible ? (
                    <ChartRenderer
                        chartType={chartType}
                        chartLibrary={chartLib}
                        labels={kpi.dataPoints.map(d => d.label)}
                        dataValues={kpi.dataPoints.map(d => d.value)}
                        colorAccent={kpi.colorAccent}
                        recordCount={kpi.dataPoints.length}
                    />
                ) : (
                    <div className="skeleton w-full h-full" />
                )}
            </div>

            {/* Hover Stats Footer */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-50 text-[10px] text-gray-400">
                <span>Points: {kpi.dataPoints.length}</span>
                <span>Avg: {avg.toFixed(1)}</span>
                <span>Total: {total.toFixed(0)}</span>
            </div>
        </div>
    );
}
