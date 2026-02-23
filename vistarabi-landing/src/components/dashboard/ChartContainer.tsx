'use client';

// Module 5 — Enhanced Chart Container
// Icon-based chart type switcher, fullscreen, CSV export, rich stats, empty/loading states

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChartRenderer } from './ChartRenderer';
import type { KPICardData } from './types';

interface ChartContainerProps {
    kpi: KPICardData;
    index: number;
    onDrillDown?: (kpiId: string, label: string, value: number) => void;
}

// ── Chart type groups ────────────────────────────────────────────────────────
interface ChartOption {
    value: string;
    label: string;
    icon: string;
    lib: 'chartjs' | 'plotly';
    group: 'trend' | 'compare' | 'composition' | 'advanced';
}

const CHART_OPTIONS: ChartOption[] = [
    // Trend
    { value: 'line', label: 'Line', icon: '📈', lib: 'chartjs', group: 'trend' },
    { value: 'area', label: 'Area', icon: '📉', lib: 'chartjs', group: 'trend' },
    // Compare
    { value: 'bar', label: 'Bar', icon: '📊', lib: 'chartjs', group: 'compare' },
    { value: 'horizontal_bar', label: 'H-Bar', icon: '🔲', lib: 'chartjs', group: 'compare' },
    { value: 'stacked_bar', label: 'Stacked', icon: '🏗️', lib: 'chartjs', group: 'compare' },
    { value: 'waterfall', label: 'Waterfall', icon: '🌊', lib: 'plotly', group: 'compare' },
    // Composition
    { value: 'pie', label: 'Pie', icon: '🥧', lib: 'chartjs', group: 'composition' },
    { value: 'doughnut', label: 'Donut', icon: '🍩', lib: 'chartjs', group: 'composition' },
    { value: 'treemap', label: 'Treemap', icon: '🗺️', lib: 'plotly', group: 'composition' },
    { value: 'sunburst', label: 'Sunburst', icon: '☀️', lib: 'plotly', group: 'composition' },
    // Advanced
    { value: 'scatter', label: 'Scatter', icon: '🔵', lib: 'chartjs', group: 'advanced' },
    { value: 'bubble', label: 'Bubble', icon: '🫧', lib: 'chartjs', group: 'advanced' },
    { value: 'radar', label: 'Radar', icon: '🕸️', lib: 'chartjs', group: 'advanced' },
    { value: 'heatmap', label: 'Heatmap', icon: '🌡️', lib: 'plotly', group: 'advanced' },
    { value: 'box_plot', label: 'Box', icon: '📦', lib: 'plotly', group: 'advanced' },
    { value: 'violin', label: 'Violin', icon: '🎻', lib: 'plotly', group: 'advanced' },
];

const GROUP_LABELS: Record<string, string> = {
    trend: 'Trend',
    compare: 'Compare',
    composition: 'Composition',
    advanced: 'Advanced',
};

// ── Stats helpers ────────────────────────────────────────────────────────────
function computeStats(data: number[]) {
    if (data.length === 0) return null;
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / data.length;
    const min = Math.min(...data);
    const max = Math.max(...data);
    return { sum, avg, min, max };
}

function fmt(v: number): string {
    if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
    if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + 'K';
    return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

// ── CSV export ───────────────────────────────────────────────────────────────
function exportCSV(kpiName: string, dataPoints: KPICardData['dataPoints']) {
    const rows = ['Label,Value', ...dataPoints.map(d => `"${d.label}",${d.value}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kpiName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Main Component ───────────────────────────────────────────────────────────
export function ChartContainer({ kpi, index, onDrillDown }: ChartContainerProps) {
    const [chartType, setChartType] = useState(kpi.chartType || 'bar');
    const [chartLib, setChartLib] = useState<'chartjs' | 'plotly'>(kpi.chartLibrary || 'chartjs');
    const [visible, setVisible] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Lazy-load via IntersectionObserver
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold: 0.05 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    // Close picker on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setPickerOpen(false);
            }
        };
        if (pickerOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [pickerOpen]);

    // Escape to close fullscreen
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
        if (fullscreen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [fullscreen]);

    const selectType = useCallback((opt: ChartOption) => {
        setChartType(opt.value);
        setChartLib(opt.lib);
        setPickerOpen(false);
    }, []);

    const handleDrillDown = useCallback((label: string, value: number) => {
        onDrillDown?.(kpi.kpiId, label, value);
    }, [kpi.kpiId, onDrillDown]);

    const dataValues = kpi.dataPoints.map(d => d.value);
    const dataLabels = kpi.dataPoints.map(d => d.label);
    const stats = computeStats(dataValues);
    const currentOpt = CHART_OPTIONS.find(o => o.value === chartType) ?? CHART_OPTIONS[2];
    const isEmpty = kpi.dataPoints.length === 0;

    const chartContent = (
        <>
            {visible && !isEmpty ? (
                <ChartRenderer
                    chartType={chartType}
                    chartLibrary={chartLib}
                    labels={dataLabels}
                    dataValues={dataValues}
                    colorAccent={kpi.colorAccent}
                    recordCount={kpi.dataPoints.length}
                    kpiName={kpi.kpiName}
                    onPointClick={(label, value) => handleDrillDown(label, value)}
                />
            ) : isEmpty ? (
                <div className="chart-empty-state">
                    <span className="chart-empty-icon">📊</span>
                    <p className="chart-empty-text">No data available</p>
                    <p className="chart-empty-sub">Data will appear once the dashboard is refreshed</p>
                </div>
            ) : (
                <div className="skeleton w-full h-full rounded-lg" />
            )}
        </>
    );

    return (
        <>
            <div
                ref={containerRef}
                className="chart-container chart-entrance"
                style={{ animationDelay: `${Math.min(index, 5) * 80}ms` }}
            >
                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="chart-header">
                    <div className="chart-header-left">
                        <h3 className="chart-title">{kpi.kpiName.replace(/_/g, ' ')}</h3>
                        <p className="chart-formula">{kpi.formula}</p>
                    </div>
                    <div className="chart-toolbar">
                        {/* Chart type picker trigger */}
                        <div className="chart-picker-wrapper" ref={pickerRef}>
                            <button
                                className="chart-tool-btn chart-type-btn"
                                onClick={() => setPickerOpen(p => !p)}
                                title="Change chart type"
                            >
                                <span>{currentOpt.icon}</span>
                                <span className="chart-type-label">{currentOpt.label}</span>
                                <ChevronDown size={12} />
                            </button>

                            {pickerOpen && (
                                <div className="chart-picker-dropdown">
                                    {Object.keys(GROUP_LABELS).map(group => {
                                        const opts = CHART_OPTIONS.filter(o => o.group === group);
                                        return (
                                            <div key={group} className="chart-picker-group">
                                                <p className="chart-picker-group-label">{GROUP_LABELS[group]}</p>
                                                <div className="chart-picker-grid">
                                                    {opts.map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            className={`chart-picker-item ${chartType === opt.value ? 'active' : ''}`}
                                                            onClick={() => selectType(opt)}
                                                            title={opt.label}
                                                        >
                                                            <span className="text-base">{opt.icon}</span>
                                                            <span className="chart-picker-item-label">{opt.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Export CSV */}
                        <button
                            className="chart-tool-btn"
                            onClick={() => exportCSV(kpi.kpiName, kpi.dataPoints)}
                            title="Export CSV"
                        >
                            ⬇️
                        </button>

                        {/* Fullscreen */}
                        <button
                            className="chart-tool-btn"
                            onClick={() => setFullscreen(true)}
                            title="Expand chart"
                        >
                            ⛶
                        </button>
                    </div>
                </div>

                {/* ── Chart Area ─────────────────────────────────────────── */}
                <div className="chart-body">
                    {chartContent}
                </div>

                {/* ── Stats Footer ───────────────────────────────────────── */}
                {stats && (
                    <div className="chart-stats-bar">
                        <div className="chart-stat">
                            <span className="chart-stat-label">Min</span>
                            <span className="chart-stat-value">{fmt(stats.min)}</span>
                        </div>
                        <div className="chart-stat-divider" />
                        <div className="chart-stat">
                            <span className="chart-stat-label">Avg</span>
                            <span className="chart-stat-value">{fmt(stats.avg)}</span>
                        </div>
                        <div className="chart-stat-divider" />
                        <div className="chart-stat">
                            <span className="chart-stat-label">Max</span>
                            <span className="chart-stat-value">{fmt(stats.max)}</span>
                        </div>
                        <div className="chart-stat-divider" />
                        <div className="chart-stat">
                            <span className="chart-stat-label">Total</span>
                            <span className="chart-stat-value chart-stat-total">{fmt(stats.sum)}</span>
                        </div>
                        <div style={{ flex: 1 }} />
                        <div className="chart-stat">
                            <span className="chart-stat-label">Points</span>
                            <span className="chart-stat-value">{kpi.dataPoints.length.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Fullscreen Modal ─────────────────────────────────────── */}
            {fullscreen && (
                <div className="chart-fullscreen-overlay" onClick={() => setFullscreen(false)}>
                    <div className="chart-fullscreen-container" onClick={e => e.stopPropagation()}>
                        <div className="chart-fullscreen-header">
                            <div>
                                <h2 className="chart-fullscreen-title">{kpi.kpiName.replace(/_/g, ' ')}</h2>
                                <p className="chart-fullscreen-formula">{kpi.formula}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    className="chart-tool-btn"
                                    onClick={() => exportCSV(kpi.kpiName, kpi.dataPoints)}
                                >
                                    ⬇️ Export
                                </button>
                                <button className="chart-fullscreen-close" onClick={() => setFullscreen(false)}>
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="chart-fullscreen-body">
                            <ChartRenderer
                                chartType={chartType}
                                chartLibrary={chartLib}
                                labels={dataLabels}
                                dataValues={dataValues}
                                colorAccent={kpi.colorAccent}
                                recordCount={kpi.dataPoints.length}
                                kpiName={kpi.kpiName}
                            />
                        </div>
                        {stats && (
                            <div className="chart-stats-bar chart-fullscreen-stats">
                                <div className="chart-stat"><span className="chart-stat-label">Min</span><span className="chart-stat-value">{fmt(stats.min)}</span></div>
                                <div className="chart-stat-divider" />
                                <div className="chart-stat"><span className="chart-stat-label">Average</span><span className="chart-stat-value">{fmt(stats.avg)}</span></div>
                                <div className="chart-stat-divider" />
                                <div className="chart-stat"><span className="chart-stat-label">Max</span><span className="chart-stat-value">{fmt(stats.max)}</span></div>
                                <div className="chart-stat-divider" />
                                <div className="chart-stat"><span className="chart-stat-label">Total</span><span className="chart-stat-value chart-stat-total">{fmt(stats.sum)}</span></div>
                                <div className="chart-stat-divider" />
                                <div className="chart-stat"><span className="chart-stat-label">Data Points</span><span className="chart-stat-value">{kpi.dataPoints.length.toLocaleString()}</span></div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

// Tiny SVG chevron
function ChevronDown({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4,6 8,10 12,6" />
        </svg>
    );
}
