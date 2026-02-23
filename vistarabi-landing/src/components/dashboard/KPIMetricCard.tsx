'use client';

// Module 5C — KPI Metric Card (Glassmorphism Redesign)
// Glass-card with large typography, Material Symbols trend arrows, sparkline, double-click flip

import { useState, useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import { KPICardBack } from './KPICardBack';
import type { KPICardData, KPIExplanationData } from './types';

// Register Chart.js components once
if (typeof window !== 'undefined') {
    Chart.register(...registerables);
}

interface KPIMetricCardProps {
    data: KPICardData;
    explanation?: KPIExplanationData;
}

export function KPIMetricCard({ data, explanation }: KPIMetricCardProps) {
    const [flipped, setFlipped] = useState(false);
    const sparkRef = useRef<HTMLCanvasElement>(null);

    // Format value
    const formatValue = (val: number): string => {
        if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
        if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
        if (val % 1 !== 0 && Math.abs(val) < 100) return `${val.toFixed(2)}%`;
        return val.toFixed(0);
    };

    // Trend config with Material Symbols
    const trendConfig = {
        up: { icon: 'trending_up', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)', label: '+' },
        down: { icon: 'trending_down', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', label: '' },
        flat: { icon: 'trending_flat', color: '#6B7280', bg: 'rgba(107, 114, 128, 0.1)', label: '' },
    };
    const trend = trendConfig[data.trend || 'flat'];

    // Severity config
    const severityConfig = {
        critical: { dot: '#DC2626', glow: '0 0 0 3px rgba(220,38,38,0.15)', label: 'Critical' },
        warning: { dot: '#D97706', glow: '0 0 0 3px rgba(217,119,6,0.12)', label: 'Warning' },
        normal: { dot: '', glow: '', label: '' },
    };
    const severity = severityConfig[data.anomalySeverity || 'normal'];

    // Render sparkline with Chart.js
    useEffect(() => {
        if (!sparkRef.current || data.dataPoints.length < 2) return;

        const ctx = sparkRef.current.getContext('2d');
        if (!ctx) return;

        const accentColor = data.colorAccent || '#135bec';

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dataPoints.map(d => d.label),
                datasets: [{
                    data: data.dataPoints.map(d => d.value),
                    borderColor: accentColor,
                    borderWidth: 2.5,
                    fill: {
                        target: 'origin',
                        above: accentColor + '20',
                    },
                    pointRadius: 0,
                    tension: 0.4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: { display: false },
                },
                animation: { duration: 0 },
            },
        });

        return () => chart.destroy();
    }, [data.dataPoints, data.colorAccent]);

    // Insight icon mapping
    const insightIcons: Record<string, string> = {
        up: 'info',
        down: 'smart_toy',
        flat: 'bolt',
    };

    return (
        <div
            className={`card-flip-container ${data.anomalySeverity === 'critical' ? 'anomaly-critical' : data.anomalySeverity === 'warning' ? 'anomaly-warning' : ''}`}
            onDoubleClick={() => setFlipped(!flipped)}
            title="Double-click for AI explanation"
        >
            <div className={`card-flip-inner ${flipped ? 'flipped' : ''}`}
                style={{ minHeight: '100px' }}
            >
                {/* Front Face — Glass Card */}
                <div
                    className="card-flip-front kpi-card"
                    style={severity.glow ? { boxShadow: severity.glow } : undefined}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            {/* Severity badge + KPI name */}
                            <div className="flex items-center gap-1.5">
                                {data.anomalySeverity && data.anomalySeverity !== 'normal' && (
                                    <span
                                        className="severity-dot"
                                        style={{ background: severity.dot }}
                                        title={`${severity.label}: ${data.anomalyReason || 'Anomaly detected'}`}
                                    />
                                )}
                                <p className="kpi-card-title">
                                    {data.kpiName.replace(/_/g, ' ')}
                                </p>
                            </div>
                            {/* Primary Value */}
                            <h3 className="kpi-card-value">
                                {formatValue(data.currentValue)}
                            </h3>
                        </div>

                        {/* Trend Badge */}
                        {data.trendPercent !== undefined && (
                            <div
                                className={`kpi-trend-badge ${data.trend || 'flat'}`}
                            >
                                <span className="material-symbols-outlined text-xs">{trend.icon}</span>
                                {trend.label}{Math.abs(data.trendPercent).toFixed(1)}%
                            </div>
                        )}
                    </div>

                    {/* Sparkline Area */}
                    <div className="kpi-sparkline-area">
                        {data.dataPoints.length >= 2 ? (
                            <canvas ref={sparkRef} className="w-full h-full" />
                        ) : (
                            /* Mini bar chart fallback for non-time-series */
                            <div className="flex items-end h-full gap-2">
                                {data.dataPoints.map((dp, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 rounded-t-lg transition-all"
                                        style={{
                                            height: `${Math.max(10, (dp.value / Math.max(...data.dataPoints.map(d => d.value), 1)) * 100)}%`,
                                            background: i === data.dataPoints.length - 1
                                                ? (data.colorAccent || '#135bec')
                                                : (data.colorAccent || '#135bec') + '20',
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* AI Insight Line */}
                    <div className="kpi-insight-line">
                        <span className="material-symbols-outlined text-sm">
                            {insightIcons[data.trend || 'flat']}
                        </span>
                        <span className="truncate">
                            {data.insightSummary || (data.trendPercent !== undefined
                                ? `${data.trend === 'up' ? 'Outperforming' : data.trend === 'down' ? 'Below' : 'On track with'} previous period`
                                : 'AI analysis pending...'
                            )}
                        </span>
                    </div>
                </div>

                {/* Back Face */}
                <div className="card-flip-back">
                    <KPICardBack
                        kpiName={data.kpiName}
                        explanation={explanation}
                        formula={data.formula}
                        onFlipBack={() => setFlipped(false)}
                        lineageExplanation={data.lineageExplanation}
                        trendSummary={data.trendSummary}
                        anomalySeverity={data.anomalySeverity}
                        anomalyReason={data.anomalyReason}
                        changeAttribution={data.changeAttribution}
                        lastUpdated={data.lastUpdated}
                    />
                </div>
            </div>
        </div>
    );
}
