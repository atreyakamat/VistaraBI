'use client';

// Module 5A — Chart.js Chart Wrapper
// Renders Chart.js charts: line, bar, horizontal_bar, pie, doughnut, area, radar, scatter, bubble

import { useRef, useEffect } from 'react';
import { Chart, registerables } from 'chart.js';

if (typeof window !== 'undefined') {
    Chart.register(...registerables);
}

interface ChartJSChartProps {
    chartType: string;
    labels: string[];
    dataValues: number[];
    colorAccent?: string;
    disableAnimation?: boolean;
}

const CHART_COLORS = [
    '#2563EB', '#7C3AED', '#EC4899', '#F59E0B', '#10B981',
    '#06B6D4', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6',
];

export function ChartJSChart({
    chartType, labels, dataValues, colorAccent, disableAnimation,
}: ChartJSChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Destroy previous chart
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const primary = colorAccent || CHART_COLORS[0];
        const config = buildChartConfig(chartType, labels, dataValues, primary, disableAnimation);

        chartRef.current = new Chart(ctx, config);

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [chartType, labels, dataValues, colorAccent, disableAnimation]);

    return <canvas ref={canvasRef} />;
}

function buildChartConfig(
    chartType: string,
    labels: string[],
    data: number[],
    primary: string,
    disableAnimation?: boolean
): any {
    const baseOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        animation: disableAnimation ? false : { duration: 600 },
        plugins: {
            legend: {
                display: ['pie', 'doughnut', 'radar'].includes(chartType),
                position: 'bottom' as const,
                labels: { font: { size: 11 }, padding: 12 },
            },
            tooltip: {
                backgroundColor: '#0F172A',
                titleFont: { size: 12 },
                bodyFont: { size: 11 },
                padding: 10,
                cornerRadius: 8,
            },
        },
        scales: undefined as any,
    };

    // Add scales for non-radial charts
    if (!['pie', 'doughnut', 'radar'].includes(chartType)) {
        baseOptions.scales = {
            x: {
                grid: { display: false },
                ticks: { font: { size: 10 }, maxTicksLimit: 8 },
            },
            y: {
                grid: { color: '#F1F5F9' },
                ticks: { font: { size: 10 } },
                beginAtZero: true,
            },
        };

        if (chartType === 'horizontal_bar') {
            baseOptions.indexAxis = 'y';
        }
    }

    // Build dataset based on chart type
    let type: any = chartType;
    let dataset: any;

    switch (chartType) {
        case 'line':
            type = 'line';
            dataset = {
                data,
                borderColor: primary,
                backgroundColor: primary + '15',
                borderWidth: 2,
                fill: false,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 5,
            };
            break;

        case 'area':
            type = 'line';
            dataset = {
                data,
                borderColor: primary,
                backgroundColor: primary + '25',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 2,
            };
            break;

        case 'bar':
        case 'horizontal_bar':
            type = 'bar';
            dataset = {
                data,
                backgroundColor: data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + 'CC'),
                borderColor: data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                borderWidth: 1,
                borderRadius: 4,
            };
            break;

        case 'pie':
            type = 'pie';
            dataset = {
                data,
                backgroundColor: data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + 'CC'),
                borderColor: '#fff',
                borderWidth: 2,
            };
            break;

        case 'doughnut':
            type = 'doughnut';
            dataset = {
                data,
                backgroundColor: data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length] + 'CC'),
                borderColor: '#fff',
                borderWidth: 2,
                cutout: '55%',
            };
            break;

        case 'radar':
            type = 'radar';
            dataset = {
                data,
                borderColor: primary,
                backgroundColor: primary + '25',
                borderWidth: 2,
                pointRadius: 3,
            };
            baseOptions.scales = {
                r: {
                    ticks: { font: { size: 10 } },
                    grid: { color: '#E2E8F0' },
                },
            };
            break;

        case 'scatter':
            type = 'scatter';
            dataset = {
                data: data.map((v, i) => ({ x: i, y: v })),
                backgroundColor: primary + '80',
                borderColor: primary,
                pointRadius: 4,
            };
            break;

        case 'bubble':
            type = 'bubble';
            dataset = {
                data: data.map((v, i) => ({ x: i, y: v, r: Math.max(3, Math.min(15, v / 100)) })),
                backgroundColor: primary + '60',
                borderColor: primary,
            };
            break;

        default:
            type = 'bar';
            dataset = {
                data,
                backgroundColor: primary + 'CC',
                borderColor: primary,
                borderWidth: 1,
                borderRadius: 4,
            };
    }

    return {
        type,
        data: {
            labels,
            datasets: [{ label: '', ...dataset }],
        },
        options: baseOptions,
    };
}
