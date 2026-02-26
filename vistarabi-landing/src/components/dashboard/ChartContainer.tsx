'use client';

// Module 5 — Enhanced Chart Container
// Per-chart floating filter: each chart has its own date range & granularity
// icon-based chart type switcher, fullscreen, CSV export, rich stats

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChartRenderer } from './ChartRenderer';
import type { KPICardData } from './types';

export interface ChartContainerProps {
    kpi: KPICardData;
    index: number;
    projectId?: string;
    compact?: boolean;
    isSelected?: boolean;
    onToggleSelect?: () => void;
    externalFilter?: { range: DateRange; gran: Granularity; ts: number } | null;
    onDrillDown?: (kpiId: string, label: string, value: number) => void;
}

// ── Chart type groups ─────────────────────────────────────────────────────────
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

// ── Per-chart filter types ────────────────────────────────────────────────────
export type DateRange = '7d' | '30d' | '90d' | '1y' | 'all';
export type Granularity = 'daily' | 'weekly' | 'monthly' | 'quarterly';

const DATE_PRESETS: { value: DateRange; label: string }[] = [
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: '90d', label: '90D' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' },
];

const GRAN_PRESETS: { value: Granularity; label: string }[] = [
    { value: 'daily', label: 'D' },
    { value: 'weekly', label: 'W' },
    { value: 'monthly', label: 'M' },
    { value: 'quarterly', label: 'Q' },
];

function resolveDateRange(range: DateRange): { dateFrom: string; dateTo: string } {
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    const from = new Date(now);
    switch (range) {
        case '7d': from.setDate(now.getDate() - 7); break;
        case '30d': from.setDate(now.getDate() - 30); break;
        case '90d': from.setDate(now.getDate() - 90); break;
        case '1y': from.setFullYear(now.getFullYear() - 1); break;
        case 'all': return { dateFrom: '2000-01-01', dateTo: to };
    }
    return { dateFrom: from.toISOString().split('T')[0], dateTo: to };
}

// ── Range constraint helpers ──────────────────────────────────────────────────
export function getAvailableRanges(kpis: KPICardData[]): DateRange[] {
    let oldestDate = new Date();
    let hasData = false;

    for (const kpi of kpis) {
        if (!kpi.dataPoints || kpi.dataPoints.length === 0) continue;
        for (const pt of kpi.dataPoints) {
            // Attempt to parse label as date to find oldest data point
            const dt = new Date(pt.label);
            if (!isNaN(dt.getTime()) && dt < oldestDate) {
                oldestDate = dt;
                hasData = true;
            }
        }
    }

    if (!hasData) return ['all']; // Default fallback if data is totally empty/unparseable

    const now = new Date();
    const msDiff = now.getTime() - oldestDate.getTime();
    const daysDiff = msDiff / (1000 * 60 * 60 * 24);

    const available: DateRange[] = ['all'];
    if (daysDiff >= 1) available.push('7d'); // At least some recent history makes 7d valid to click
    if (daysDiff >= 7) available.push('30d');
    if (daysDiff >= 30) available.push('90d');
    if (daysDiff >= 90) available.push('1y');

    return available;
}

// ── Stats helpers ─────────────────────────────────────────────────────────────
function computeStats(data: number[]) {
    if (data.length === 0) return null;
    const sum = data.reduce((a, b) => a + b, 0);
    return { sum, avg: sum / data.length, min: Math.min(...data), max: Math.max(...data) };
}

function fmt(v: number): string {
    if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
    if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + 'K';
    return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

// ── CSV export ────────────────────────────────────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────────────────────
export function ChartContainer({ kpi, index, projectId, compact = false, isSelected = false, onToggleSelect, externalFilter, onDrillDown }: ChartContainerProps) {
    // Chart type state
    const [chartType, setChartType] = useState(kpi.chartType || 'bar');
    const [chartLib, setChartLib] = useState<'chartjs' | 'plotly'>(kpi.chartLibrary || 'chartjs');

    // UI state
    const [visible, setVisible] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    // Per-chart filter state (null = use original kpi.dataPoints from page load)
    const [filterOpen, setFilterOpen] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange>('90d');
    const [granularity, setGranularity] = useState<Granularity>('monthly');
    const [isFiltering, setIsFiltering] = useState(false);
    const [filteredData, setFilteredData] = useState<Array<{ label: string; value: number }> | null>(null);
    const [filterActive, setFilterActive] = useState(false); // true once user applied a filter

    const containerRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const filterRef = useRef<HTMLDivElement>(null);

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

    // Close chart-type picker on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
                setPickerOpen(false);
        };
        if (pickerOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [pickerOpen]);

    // Close per-chart filter on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node))
                setFilterOpen(false);
        };
        if (filterOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [filterOpen]);

    // Escape closes fullscreen or filter
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setFullscreen(false); setFilterOpen(false); }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // ── Fetch data for this chart with the selected filter ──────────────────
    const applyFilter = useCallback(async (range: DateRange, gran: Granularity) => {
        if (!projectId) return; // can't fetch without project context
        setIsFiltering(true);
        try {
            const { dateFrom, dateTo } = resolveDateRange(range);
            const params = new URLSearchParams({
                granularity: gran,
                dateFrom,
                dateTo,
                skipCache: 'true',
                skipAI: 'true',
            });
            const res = await fetch(`/api/projects/${projectId}/dashboard/data?${params}`);
            if (!res.ok) throw new Error('fetch failed');
            const data = await res.json();

            // Find this KPI in the response
            const exec = (data.kpis || []).find((k: any) => k.kpiId === kpi.kpiId);
            if (!exec) { setFilteredData([]); return; }

            // Build dataPoints — same logic as page.tsx
            const points: Array<{ label: string; value: number }> = (exec.dataset || []).map((dp: any, i: number) => {
                const rawLabel =
                    dp.date || dp.period || dp.label || dp.category ||
                    dp.name || dp.x || dp.dim || dp.group || null;

                const label = rawLabel && String(rawLabel).trim() && String(rawLabel) !== 'Total'
                    ? String(rawLabel)
                    : `#${i + 1}`;

                const value = typeof dp.value === 'number' ? dp.value
                    : typeof dp.y === 'number' ? dp.y
                        : 0;

                return { label, value: Number(value) || 0 };
            });

            setFilteredData(points);
            setFilterActive(true);
        } catch {
            // silently keep existing data on error
        } finally {
            setIsFiltering(false);
        }
    }, [projectId, kpi.kpiId]);

    // External filter sync
    useEffect(() => {
        if (externalFilter) {
            setDateRange(externalFilter.range);
            setGranularity(externalFilter.gran);
            applyFilter(externalFilter.range, externalFilter.gran);
        }
    }, [externalFilter, applyFilter]);

    const resetFilter = useCallback(() => {
        setFilteredData(null);
        setFilterActive(false);
        setDateRange('90d');
        setGranularity('monthly');
        setFilterOpen(false);
    }, []);

    // ── Derived data ─────────────────────────────────────────────────────────
    const activePoints = filteredData ?? kpi.dataPoints;
    const dataValues = activePoints.map(d => d.value);
    const dataLabels = activePoints.map(d => {
        // Format ISO dates nicely for axis readability
        if (/^\d{4}-\d{2}-\d{2}/.test(d.label)) {
            try {
                const dt = new Date(d.label);
                if (!isNaN(dt.getTime()))
                    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } catch { /**/ }
        }
        return d.label;
    });
    const stats = computeStats(dataValues);
    const currentOpt = CHART_OPTIONS.find(o => o.value === chartType) ?? CHART_OPTIONS[2];
    const isEmpty = activePoints.length === 0;

    const selectType = useCallback((opt: ChartOption) => {
        setChartType(opt.value);
        setChartLib(opt.lib);
        setPickerOpen(false);
    }, []);

    const handleDrillDown = useCallback((label: string, value: number) => {
        onDrillDown?.(kpi.kpiId, label, value);
    }, [kpi.kpiId, onDrillDown]);

    // ── Compact card render ───────────────────────────────────────────────
    if (compact) {
        return (
            <div
                ref={containerRef}
                className={`chart-card-compact chart-entrance ${isSelected ? 'chart-selected' : ''}`}
                style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}
            >
                {/* Selection toggle overlay */}
                {onToggleSelect && (
                    <div className="chart-select-overlay" onClick={onToggleSelect}>
                        <div className={`chart-select-checkbox ${isSelected ? 'selected' : ''}`}>
                            {isSelected && <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" strokeWidth="3" /></svg>}
                        </div>
                    </div>
                )}

                {/* KPI name overlay — appears on hover */}
                <div className="chart-compact-label">
                    <span className="chart-compact-name">{kpi.kpiName.replace(/_/g, ' ')}</span>
                    {filterActive && (
                        <span className="chart-compact-filter-badge">
                            {DATE_PRESETS.find(d => d.value === dateRange)?.label}
                        </span>
                    )}
                </div>

                {/* Filter pill (compact) */}
                <div ref={filterRef} className="chart-filter-pill chart-filter-pill--compact">
                    <button
                        className="chart-filter-trigger"
                        onClick={() => setFilterOpen(o => !o)}
                        title="Filter this chart"
                    >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        {isFiltering && <span className="chart-filter-spinner" />}
                    </button>
                    {filterActive && (
                        <button className="chart-filter-clear" onClick={resetFilter} title="Clear">✕</button>
                    )}
                    {filterOpen && (
                        <div className="chart-filter-panel chart-filter-panel--compact">
                            <div className="chart-filter-section">
                                <span className="chart-filter-section-label">Range</span>
                                <div className="chart-filter-btn-row">
                                    {DATE_PRESETS.map(d => {
                                        const availableRanges = getAvailableRanges([kpi]);
                                        const isAvailable = availableRanges.includes(d.value);

                                        return (
                                            <button key={d.value}
                                                className={`chart-filter-btn ${dateRange === d.value ? 'active' : ''} ${!isAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                onClick={() => isAvailable && setDateRange(d.value)}
                                                disabled={!isAvailable}
                                                title={!isAvailable ? 'Insufficient historical data' : ''}
                                            >
                                                {d.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="chart-filter-divider" />
                            <div className="chart-filter-section">
                                <span className="chart-filter-section-label">Group by</span>
                                <div className="chart-filter-btn-row">
                                    {GRAN_PRESETS.map(g => (
                                        <button key={g.value}
                                            className={`chart-filter-btn ${granularity === g.value ? 'active' : ''}`}
                                            onClick={() => setGranularity(g.value)}>
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="chart-filter-actions">
                                <button className="chart-filter-apply"
                                    onClick={() => { applyFilter(dateRange, granularity); setFilterOpen(false); }}
                                    disabled={isFiltering}>
                                    {isFiltering ? 'Loading…' : 'Apply'}
                                </button>
                                {filterActive && (
                                    <button className="chart-filter-reset" onClick={resetFilter}>Reset</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Mini chart */}
                <div className="chart-compact-body">
                    {visible && !isEmpty ? (
                        <ChartRenderer
                            chartType={chartType}
                            chartLibrary={chartLib}
                            labels={dataLabels}
                            dataValues={dataValues}
                            colorAccent={kpi.colorAccent}
                            recordCount={activePoints.length}
                            kpiName={kpi.kpiName}
                            onPointClick={(label, value) => handleDrillDown(label, value)}
                        />
                    ) : isEmpty ? (
                        <div className="chart-empty-state" style={{ fontSize: '11px' }}>
                            <span className="chart-empty-icon" style={{ fontSize: '24px' }}>📊</span>
                            <p className="chart-empty-text" style={{ fontSize: '11px' }}>No data</p>
                        </div>
                    ) : (
                        <div className="skeleton w-full h-full rounded-lg" />
                    )}
                </div>

                {/* Minimal value footer */}
                <div className="chart-compact-footer">
                    <span className="chart-compact-value">{fmt(kpi.currentValue)}</span>
                    {kpi.trend && (
                        <span className={`chart-compact-trend ${kpi.trend}`}>
                            {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'}
                            {kpi.trendPercent != null ? ` ${Math.abs(kpi.trendPercent).toFixed(1)}%` : ''}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    // ── Full (expanded) card render ──────────────────────────────────────────
    const chartContent = (
        <>
            {visible && !isEmpty ? (
                <ChartRenderer
                    chartType={chartType}
                    chartLibrary={chartLib}
                    labels={dataLabels}
                    dataValues={dataValues}
                    colorAccent={kpi.colorAccent}
                    recordCount={activePoints.length}
                    kpiName={kpi.kpiName}
                    onPointClick={(label, value) => handleDrillDown(label, value)}
                />
            ) : isEmpty ? (
                <div className="chart-empty-state">
                    <span className="chart-empty-icon">📊</span>
                    <p className="chart-empty-text">No data available</p>
                    <p className="chart-empty-sub">
                        {filterActive ? 'No records for the selected range — try a wider window' : 'Data will appear once the dashboard is refreshed'}
                    </p>
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
                className={`chart-container chart-entrance ${isSelected ? 'chart-selected' : ''}`}
                style={{ animationDelay: `${Math.min(index, 5) * 80}ms`, position: 'relative' }}
            >
                {/* Selection toggle overlay */}
                {onToggleSelect && (
                    <div className="chart-select-overlay" onClick={onToggleSelect}>
                        <div className={`chart-select-checkbox ${isSelected ? 'selected' : ''}`}>
                            {isSelected && <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" strokeWidth="3" /></svg>}
                        </div>
                    </div>
                )}

                {/* ── Per-chart floating filter pill ─────────────────────── */}
                <div
                    ref={filterRef}
                    className={`chart-filter-pill ${filterActive ? 'chart-filter-pill--active' : ''}`}
                >
                    <button
                        className="chart-filter-trigger"
                        onClick={() => setFilterOpen(o => !o)}
                        title="Filter this chart"
                        aria-expanded={filterOpen}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        {filterActive ? (
                            <span className="chart-filter-badge">
                                {DATE_PRESETS.find(d => d.value === dateRange)?.label} · {granularity.slice(0, 1).toUpperCase()}
                            </span>
                        ) : (
                            <span>Filter</span>
                        )}
                        {isFiltering && <span className="chart-filter-spinner" />}
                    </button>

                    {filterActive && (
                        <button className="chart-filter-clear" onClick={resetFilter} title="Clear filter">✕</button>
                    )}

                    {/* ── Dropdown panel ─────────────────────────── */}
                    {filterOpen && (
                        <div className="chart-filter-panel">
                            <div className="chart-filter-section">
                                <span className="chart-filter-section-label">Range</span>
                                <div className="chart-filter-btn-row">
                                    {DATE_PRESETS.map(d => (
                                        <button
                                            key={d.value}
                                            className={`chart-filter-btn ${dateRange === d.value ? 'active' : ''}`}
                                            onClick={() => setDateRange(d.value)}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="chart-filter-divider" />

                            <div className="chart-filter-section">
                                <span className="chart-filter-section-label">Group by</span>
                                <div className="chart-filter-btn-row">
                                    {GRAN_PRESETS.map(g => (
                                        <button
                                            key={g.value}
                                            className={`chart-filter-btn ${granularity === g.value ? 'active' : ''}`}
                                            onClick={() => setGranularity(g.value)}
                                        >
                                            {g.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="chart-filter-actions">
                                <button
                                    className="chart-filter-apply"
                                    onClick={() => { applyFilter(dateRange, granularity); setFilterOpen(false); }}
                                    disabled={isFiltering}
                                >
                                    {isFiltering ? 'Loading…' : 'Apply'}
                                </button>
                                {filterActive && (
                                    <button className="chart-filter-reset" onClick={resetFilter}>
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

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
                            onClick={() => exportCSV(kpi.kpiName, activePoints)}
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
                            <span className="chart-stat-label">Pts</span>
                            <span className="chart-stat-value">{activePoints.length.toLocaleString()}</span>
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
                                    onClick={() => exportCSV(kpi.kpiName, activePoints)}
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
                                recordCount={activePoints.length}
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
                                <div className="chart-stat"><span className="chart-stat-label">Data Points</span><span className="chart-stat-value">{activePoints.length.toLocaleString()}</span></div>
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
