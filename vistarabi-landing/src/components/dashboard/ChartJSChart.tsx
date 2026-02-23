'use client';

// Module 5 — Enhanced Chart.js Chart Wrapper
// Supports: line, area, bar, horizontal_bar, stacked_bar, pie, doughnut, radar, scatter, bubble

import { useRef, useEffect, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';

if (typeof window !== 'undefined') {
    Chart.register(...registerables);
}

export interface ChartJSChartProps {
    chartType: string;
    labels: string[];
    dataValues: number[];
    colorAccent?: string;
    disableAnimation?: boolean;
    kpiName?: string;
    onPointClick?: (label: string, value: number, index: number) => void;
}

// 10-color accessible palette
const PALETTE = [
    '#2563EB', '#7C3AED', '#EC4899', '#F59E0B', '#10B981',
    '#06B6D4', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6',
];

function hexToRgb(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function formatValue(v: number): string {
    if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
    if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(1) + 'K';
    return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function ChartJSChart({
    chartType, labels, dataValues, colorAccent, disableAnimation, kpiName, onPointClick,
}: ChartJSChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    const handleClick = useCallback((event: MouseEvent) => {
        if (!chartRef.current || !onPointClick) return;
        const elements = chartRef.current.getElementsAtEventForMode(
            event, 'nearest', { intersect: true }, false
        );
        if (elements.length > 0) {
            const i = elements[0].index;
            onPointClick(labels[i] ?? '', dataValues[i] ?? 0, i);
        }
    }, [labels, dataValues, onPointClick]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (chartRef.current) {
            chartRef.current.destroy();
            chartRef.current = null;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const primary = colorAccent || PALETTE[0];
        const cfg = buildConfig(chartType, labels, dataValues, primary, ctx, disableAnimation, kpiName);
        chartRef.current = new Chart(ctx, cfg);

        if (onPointClick) canvas.addEventListener('click', handleClick);

        return () => {
            canvas.removeEventListener('click', handleClick);
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [chartType, labels, dataValues, colorAccent, disableAnimation, kpiName, handleClick, onPointClick]);

    return (
        <canvas
            ref={canvasRef}
            role="img"
            aria-label={kpiName ? `${kpiName} chart` : 'Chart'}
            style={{ display: 'block', width: '100%', height: '100%' }}
        />
    );
}

function buildConfig(
    chartType: string,
    labels: string[],
    data: number[],
    primary: string,
    ctx: CanvasRenderingContext2D,
    disableAnimation?: boolean,
    kpiName?: string,
): any {
    const animation = disableAnimation ? false : { duration: 500, easing: 'easeOutQuart' as const };

    // Shared rich tooltip
    const tooltip = {
        backgroundColor: '#0F172A',
        borderColor: primary,
        borderWidth: 1,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
            label: (ctx: any) => {
                const v = ctx.parsed?.y ?? ctx.parsed ?? ctx.raw?.y ?? 0;
                return ` ${formatValue(v)}`;
            },
        },
    };

    const baseOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        animation,
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            legend: {
                display: ['pie', 'doughnut', 'radar'].includes(chartType),
                position: 'bottom' as const,
                labels: { font: { size: 11 }, padding: 14, usePointStyle: true },
            },
            tooltip,
        },
    };

    let type: any;
    let dataset: any;

    switch (chartType) {
        // ── Line ──────────────────────────────────────────────────────
        case 'line': {
            type = 'line';
            const grad = ctx.createLinearGradient(0, 0, 0, 300);
            grad.addColorStop(0, hexToRgb(primary, 0.12));
            grad.addColorStop(1, hexToRgb(primary, 0));
            dataset = {
                data,
                borderColor: primary,
                backgroundColor: grad,
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointRadius: data.length > 60 ? 0 : 3,
                pointHoverRadius: 5,
                pointBackgroundColor: primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
            };
            baseOptions.scales = linearScales();
            break;
        }

        // ── Area ──────────────────────────────────────────────────────
        case 'area': {
            type = 'line';
            const areaGrad = ctx.createLinearGradient(0, 0, 0, 300);
            areaGrad.addColorStop(0, hexToRgb(primary, 0.35));
            areaGrad.addColorStop(1, hexToRgb(primary, 0.03));
            dataset = {
                data,
                borderColor: primary,
                backgroundColor: areaGrad,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: data.length > 60 ? 0 : 2,
                pointHoverRadius: 5,
                pointBackgroundColor: primary,
            };
            baseOptions.scales = linearScales();
            break;
        }

        // ── Bar ───────────────────────────────────────────────────────
        case 'bar': {
            type = 'bar';
            const barColors = data.map((_, i) => hexToRgb(PALETTE[i % PALETTE.length], 0.85));
            const barBorders = data.map((_, i) => PALETTE[i % PALETTE.length]);
            dataset = {
                data,
                backgroundColor: barColors,
                borderColor: barBorders,
                borderWidth: 1,
                borderRadius: 5,
                borderSkipped: false,
            };
            baseOptions.scales = linearScales();
            break;
        }

        // ── Horizontal Bar ────────────────────────────────────────────
        case 'horizontal_bar': {
            type = 'bar';
            dataset = {
                data,
                backgroundColor: data.map((_, i) => hexToRgb(PALETTE[i % PALETTE.length], 0.8)),
                borderColor: data.map((_, i) => PALETTE[i % PALETTE.length]),
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
            };
            baseOptions.indexAxis = 'y';
            baseOptions.scales = {
                x: {
                    grid: { color: '#F1F5F9' },
                    ticks: { font: { size: 10 }, callback: (v: any) => formatValue(v) },
                    beginAtZero: true,
                },
                y: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } },
                },
            };
            break;
        }

        // ── Stacked Bar ───────────────────────────────────────────────
        case 'stacked_bar': {
            type = 'bar';
            // Split data into two conceptual series for visual depth
            const half = Math.ceil(data.length / 2);
            return {
                type,
                data: {
                    labels,
                    datasets: [
                        {
                            label: 'Primary',
                            data: data.slice(0, half).concat(Array(data.length - half).fill(0)),
                            backgroundColor: hexToRgb(primary, 0.8),
                            borderRadius: 4,
                            stack: 'stack0',
                        },
                        {
                            label: 'Secondary',
                            data: Array(half).fill(0).concat(data.slice(half)),
                            backgroundColor: hexToRgb(PALETTE[1], 0.8),
                            borderRadius: 4,
                            stack: 'stack0',
                        },
                    ],
                },
                options: {
                    ...baseOptions,
                    scales: {
                        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                        y: { stacked: true, grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 }, callback: (v: any) => formatValue(v) }, beginAtZero: true },
                    },
                },
            };
        }

        // ── Pie ───────────────────────────────────────────────────────
        case 'pie': {
            type = 'pie';
            dataset = {
                data,
                backgroundColor: data.map((_, i) => hexToRgb(PALETTE[i % PALETTE.length], 0.85)),
                borderColor: '#fff',
                borderWidth: 2,
                hoverOffset: 6,
            };
            baseOptions.plugins.tooltip.callbacks.label = (c: any) => {
                const total = (c.chart.data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((c.raw / total) * 100).toFixed(1) : '0';
                return ` ${c.label}: ${formatValue(c.raw)} (${pct}%)`;
            };
            break;
        }

        // ── Doughnut ──────────────────────────────────────────────────
        case 'doughnut': {
            type = 'doughnut';
            dataset = {
                data,
                backgroundColor: data.map((_, i) => hexToRgb(PALETTE[i % PALETTE.length], 0.85)),
                borderColor: '#fff',
                borderWidth: 2,
                cutout: '60%',
                hoverOffset: 6,
            };
            baseOptions.plugins.tooltip.callbacks.label = (c: any) => {
                const total = (c.chart.data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? ((c.raw / total) * 100).toFixed(1) : '0';
                return ` ${c.label}: ${formatValue(c.raw)} (${pct}%)`;
            };
            // Center text plugin
            baseOptions.plugins.centerText = { text: kpiName ?? '' };
            break;
        }

        // ── Radar ─────────────────────────────────────────────────────
        case 'radar': {
            type = 'radar';
            dataset = {
                data,
                borderColor: primary,
                backgroundColor: hexToRgb(primary, 0.2),
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: primary,
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
                pointHoverRadius: 6,
            };
            baseOptions.scales = {
                r: {
                    ticks: { font: { size: 9 }, backdropColor: 'transparent' },
                    grid: { color: '#E2E8F0' },
                    pointLabels: { font: { size: 10 } },
                },
            };
            break;
        }

        // ── Scatter ───────────────────────────────────────────────────
        case 'scatter': {
            type = 'scatter';
            const maxVal = Math.max(...data, 1);
            dataset = {
                data: data.map((v, i) => ({ x: i + 1, y: v })),
                backgroundColor: data.map((v) => hexToRgb(primary, 0.4 + (v / maxVal) * 0.5)),
                borderColor: primary,
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 7,
            };
            baseOptions.scales = {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    grid: { color: '#F1F5F9' },
                    ticks: { font: { size: 10 } },
                    title: { display: true, text: 'Index', font: { size: 10 } },
                },
                y: {
                    grid: { color: '#F1F5F9' },
                    ticks: { font: { size: 10 }, callback: (v: any) => formatValue(v) },
                    beginAtZero: true,
                },
            };
            baseOptions.plugins.tooltip.callbacks.label = (c: any) =>
                ` (${c.parsed.x}, ${formatValue(c.parsed.y)})`;
            break;
        }

        // ── Bubble ────────────────────────────────────────────────────
        case 'bubble': {
            type = 'bubble';
            const maxV = Math.max(...data, 1);
            dataset = {
                data: data.map((v, i) => ({
                    x: i + 1,
                    y: v,
                    r: Math.max(4, Math.min(20, (v / maxV) * 20)),
                })),
                backgroundColor: data.map((v) => hexToRgb(primary, 0.3 + (v / maxV) * 0.5)),
                borderColor: primary,
                borderWidth: 1,
            };
            baseOptions.scales = {
                x: {
                    type: 'linear',
                    grid: { color: '#F1F5F9' },
                    ticks: { font: { size: 10 } },
                },
                y: {
                    grid: { color: '#F1F5F9' },
                    ticks: { font: { size: 10 }, callback: (v: any) => formatValue(v) },
                    beginAtZero: true,
                },
            };
            baseOptions.plugins.tooltip.callbacks.label = (c: any) =>
                ` Value: ${formatValue(c.raw.y)} (size: ${c.raw.r.toFixed(1)})`;
            break;
        }

        // ── Default: Bar ──────────────────────────────────────────────
        default: {
            type = 'bar';
            dataset = {
                data,
                backgroundColor: hexToRgb(primary, 0.8),
                borderColor: primary,
                borderWidth: 1,
                borderRadius: 4,
            };
            baseOptions.scales = linearScales();
        }
    }

    return {
        type,
        data: {
            labels,
            datasets: [{ label: kpiName ?? '', ...dataset }],
        },
        options: baseOptions,
    };
}

function linearScales() {
    return {
        x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, maxTicksLimit: 10, maxRotation: 30 },
        },
        y: {
            grid: { color: '#F1F5F9', drawBorder: false },
            ticks: {
                font: { size: 10 },
                callback: (v: any) => formatValue(v),
            },
            beginAtZero: true,
        },
    };
}
