'use client';

// Module 5 — Filter Bar Component
// Granularity presets, date range quick-picks, active filter pills

import { useState } from 'react';

export interface DashboardFilters {
    granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dateRange: '7d' | '30d' | '90d' | '1y' | 'all';
}

interface FilterBarProps {
    filters: DashboardFilters;
    onChange: (filters: DashboardFilters) => void;
    loading?: boolean;
}

const GRANULARITIES: { value: DashboardFilters['granularity']; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
];

const DATE_PRESETS: { value: DashboardFilters['dateRange']; label: string }[] = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' },
    { value: 'all', label: 'All Time' },
];

export function FilterBar({ filters, onChange, loading }: FilterBarProps) {
    const setGranularity = (g: DashboardFilters['granularity']) =>
        onChange({ ...filters, granularity: g });

    const setDateRange = (d: DashboardFilters['dateRange']) =>
        onChange({ ...filters, dateRange: d });

    return (
        <div className="filter-bar" role="toolbar" aria-label="Dashboard filters">
            {/* ── Granularity ──────────────────────────────────── */}
            <span className="filter-label">Group by</span>
            <div className="filter-group">
                {GRANULARITIES.map(g => (
                    <button
                        key={g.value}
                        className={`filter-preset-btn ${filters.granularity === g.value ? 'active' : ''}`}
                        onClick={() => setGranularity(g.value)}
                        disabled={loading}
                        aria-pressed={filters.granularity === g.value}
                    >
                        {g.label}
                    </button>
                ))}
            </div>

            <div className="filter-divider" />

            {/* ── Date Range ───────────────────────────────────── */}
            <span className="filter-label">Range</span>
            <div className="filter-group">
                {DATE_PRESETS.map(d => (
                    <button
                        key={d.value}
                        className={`filter-preset-btn ${filters.dateRange === d.value ? 'active' : ''}`}
                        onClick={() => setDateRange(d.value)}
                        disabled={loading}
                        aria-pressed={filters.dateRange === d.value}
                    >
                        {d.label}
                    </button>
                ))}
            </div>

            {/* ── Loading indicator ────────────────────────────── */}
            {loading && (
                <span style={{
                    marginLeft: 'auto', fontSize: '11px', color: '#94A3B8',
                    display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                    <LoadingSpinner />
                    Refreshing…
                </span>
            )}
        </div>
    );
}

function LoadingSpinner() {
    return (
        <svg
            width="12" height="12" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            style={{ animation: 'spin 0.8s linear infinite' }}
        >
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
    );
}
