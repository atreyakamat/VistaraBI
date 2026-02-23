'use client';

// Module 5C — KPI Metric Card with Sparkline + Anomaly Badge + Double-Click Flip

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
        if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
        if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
        return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
    };

    // Trend arrow & color
    const trendConfig = {
        up: { arrow: '↑', color: '#10B981', bg: '#ECFDF5' },
        down: { arrow: '↓', color: '#EF4444', bg: '#FEF2F2' },
        flat: { arrow: '→', color: '#6B7280', bg: '#F3F4F6' },
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

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dataPoints.map(d => d.label),
                datasets: [{
                    data: data.dataPoints.map(d => d.value),
                    borderColor: data.colorAccent || '#2563EB',
                    borderWidth: 1.5,
                    fill: {
                        target: 'origin',
                        above: (data.colorAccent || '#2563EB') + '15',
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

    return (
        <div
            className={`card-flip-container ${data.anomalySeverity === 'critical' ? 'anomaly-critical' : data.anomalySeverity === 'warning' ? 'anomaly-warning' : ''}`}
            onDoubleClick={() => setFlipped(!flipped)}
            title="Double-click for AI explanation"
        >
            <div className={`card-flip-inner ${flipped ? 'flipped' : ''}`}
                style={{ minHeight: '100px' }}
            >
                {/* Front Face */}
                <div
                    className="card-flip-front bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
                    style={severity.glow ? { boxShadow: severity.glow } : undefined}
                >
                    <div className="flex items-start justify-between mb-2">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                {/* Severity badge */}
                                {data.anomalySeverity && data.anomalySeverity !== 'normal' && (
                                    <span
                                        className="severity-dot"
                                        style={{ background: severity.dot }}
                                        title={`${severity.label}: ${data.anomalyReason || 'Anomaly detected'}`}
                                    />
                                )}
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
                                    {data.kpiName.replace(/_/g, ' ')}
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-gray-900 mt-1">
                                {formatValue(data.currentValue)}
                            </div>
                        </div>
                        {/* Sparkline */}
                        {data.dataPoints.length >= 2 && (
                            <div className="sparkline-container flex-shrink-0">
                                <canvas ref={sparkRef} />
                            </div>
                        )}
                    </div>

                    {/* Trend / Comparison */}
                    <div className="flex items-center gap-2 mt-1">
                        {data.trendPercent !== undefined && (
                            <span
                                className="text-xs font-semibold px-1.5 py-0.5 rounded"
                                style={{ color: trend.color, background: trend.bg }}
                            >
                                {trend.arrow} {Math.abs(data.trendPercent).toFixed(1)}%
                            </span>
                        )}
                        {data.previousValue !== undefined && (
                            <span className="text-[10px] text-gray-400">
                                vs {formatValue(data.previousValue)} prev
                            </span>
                        )}
                    </div>

                    {/* Insight summary line */}
                    {data.insightSummary && (
                        <div className="text-[10px] text-gray-400 mt-2 truncate insight-fade-in">
                            💡 {data.insightSummary}
                        </div>
                    )}
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
