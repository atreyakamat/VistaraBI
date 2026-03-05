'use client';

// Module 5 — Enhanced Plotly Chart Wrapper
// Supports: heatmap, treemap, sunburst, waterfall, box_plot, violin
// All charts are responsive with proper data mapping + modebar for zoom/pan/export

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// Dynamically import Plotly to avoid SSR issues.
// Cast to ComponentType<any> because next/dynamic loses generic PlotParams typing,
// which causes TS2769 overload errors when passing Plotly-specific event handlers.
 
const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (
        <div style={{ width: '100%', height: '100%', background: '#F8FAFC', borderRadius: 8 }} />
    ),
}) as ComponentType<any>;

export interface PlotlyChartProps {
    chartType: string;
    labels: string[];
    dataValues: number[];
    colorAccent?: string;
    kpiName?: string;
    onPointClick?: (label: string, value: number, index: number) => void;
}

const FONT = { family: 'Inter, system-ui, -apple-system, sans-serif', size: 11 };

export function PlotlyChart({ chartType, labels, dataValues, colorAccent, kpiName, onPointClick }: PlotlyChartProps) {
    const primary = colorAccent || '#2563EB';
    const { data, layout } = buildConfig(chartType, labels, dataValues, primary);

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const handleClick = (event: Readonly<{ points: any[] }>) => {
        if (!onPointClick || !event?.points?.length) return;
        const pt = event.points[0];
        const idx: number = pt.pointIndex ?? pt.pointNumber ?? 0;
        const label: string = labels[idx] ?? String(pt.label ?? '');
        const value: number = Number(pt.value ?? pt.y ?? 0);
        onPointClick(label, value, idx);
    };

    const baseLayout: any = {
        ...layout,
        autosize: true,
        margin: { l: 44, r: 20, t: 12, b: 44 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: FONT,
        colorway: [
            '#2563EB', '#7C3AED', '#EC4899', '#F59E0B', '#10B981',
            '#06B6D4', '#EF4444', '#8B5CF6', '#F97316', '#14B8A6',
        ],
        hoverlabel: {
            bgcolor: '#0F172A',
            font: { color: '#F8FAFC', size: 11 },
            bordercolor: primary,
        },
    };

    return (
        <Plot
            data={data}
            layout={baseLayout}
            config={{
                responsive: true,
                displayModeBar: true,
                modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'] as any,
                displaylogo: false,
                toImageButtonOptions: {
                    format: 'png',
                    filename: kpiName ?? 'chart',
                    height: 500,
                    width: 800,
                    scale: 2,
                },
            }}
            style={{ width: '100%', height: '100%' }}
            onClick={handleClick}
        />
    );
}

function buildConfig(
    chartType: string,
    labels: string[],
    values: number[],
    primary: string,
): { data: any[]; layout: any } {
    switch (chartType) {

        // ── Heatmap ────────────────────────────────────────────────────────
        case 'heatmap': {
            const n = values.length;
            const cols = Math.max(2, Math.ceil(Math.sqrt(n)));
            const rows = Math.ceil(n / cols);

            // Pad to full grid
            const padded = [...values, ...Array(rows * cols - n).fill(0)];
            const z: number[][] = [];
            const xLabels: string[] = [];
            const yLabels: string[] = [];

            for (let r = 0; r < rows; r++) {
                const row: number[] = [];
                for (let c = 0; c < cols; c++) {
                    row.push(padded[r * cols + c] ?? 0);
                }
                z.push(row);
                yLabels.push(labels[r * cols] ?? `Row ${r + 1}`);
            }
            for (let c = 0; c < cols; c++) {
                xLabels.push(labels[c] ?? `Col ${c + 1}`);
            }

            return {
                data: [{
                    type: 'heatmap',
                    z,
                    x: xLabels,
                    y: yLabels,
                    colorscale: [
                        [0, '#EFF6FF'],
                        [0.33, '#93C5FD'],
                        [0.66, primary],
                        [1, '#1E3A8A'],
                    ],
                    showscale: true,
                    hoverongaps: false,
                    hovertemplate: '<b>%{x} × %{y}</b><br>Value: %{z:,.2f}<extra></extra>',
                }],
                layout: {
                    xaxis: { tickfont: { size: 10 }, showgrid: false },
                    yaxis: { tickfont: { size: 10 }, showgrid: false },
                },
            };
        }

        // ── Treemap ────────────────────────────────────────────────────────
        case 'treemap': {
            const total = values.reduce((a, b) => a + b, 0);
            return {
                data: [{
                    type: 'treemap',
                    labels,
                    parents: labels.map(() => ''),
                    values,
                    texttemplate: '<b>%{label}</b><br>%{value:,.0f}<br>%{percentRoot:.1%}',
                    hovertemplate: '<b>%{label}</b><br>Value: %{value:,.2f}<br>Share: %{percentRoot:.1%}<extra></extra>',
                    marker: {
                        colorscale: [[0, '#DBEAFE'], [1, primary]],
                        showscale: false,
                        colorbar: { tickfont: { size: 10 } },
                    },
                    tiling: { packing: 'squarify' },
                    pathbar: { visible: false },
                }],
                layout: {},
            };
        }

        // ── Sunburst ────────────────────────────────────────────────────────
        case 'sunburst': {
            return {
                data: [{
                    type: 'sunburst',
                    labels: ['Total', ...labels],
                    parents: ['', ...labels.map(() => 'Total')],
                    values: [values.reduce((a, b) => a + b, 0), ...values],
                    hovertemplate: '<b>%{label}</b><br>%{value:,.2f} (%{percentParent:.1%})<extra></extra>',
                    marker: {
                        colorscale: 'Blues',
                        line: { color: 'white', width: 1.5 },
                    },
                    insidetextorientation: 'radial',
                    leaf: { opacity: 0.85 },
                }],
                layout: {},
            };
        }

        // ── Waterfall ──────────────────────────────────────────────────────
        case 'waterfall': {
            // Auto-compute measure: first and last are totals, rest are relative
            const measure = values.map((_, i) =>
                i === 0 || i === values.length - 1 ? 'total' : 'relative'
            );
            return {
                data: [{
                    type: 'waterfall',
                    x: labels,
                    y: values,
                    measure,
                    text: values.map(v => (v >= 0 ? `+${v.toFixed(0)}` : v.toFixed(0))),
                    textposition: 'outside',
                    textfont: { size: 10 },
                    connector: { line: { color: '#CBD5E1', width: 1, dash: 'dot' } },
                    increasing: { marker: { color: '#10B981', line: { color: '#059669', width: 1 } } },
                    decreasing: { marker: { color: '#EF4444', line: { color: '#DC2626', width: 1 } } },
                    totals: { marker: { color: primary, line: { color: primary, width: 1 } } },
                    hovertemplate: '<b>%{x}</b><br>%{y:,.2f}<extra></extra>',
                }],
                layout: {
                    xaxis: { tickfont: { size: 10 }, showgrid: false },
                    yaxis: { tickfont: { size: 10 }, showgrid: true, gridcolor: '#F1F5F9', zeroline: true },
                },
            };
        }

        // ── Box Plot ────────────────────────────────────────────────────────
        case 'box_plot': {
            // If we have multiple labels, create one box per label group
            // Otherwise one box for all values
            return {
                data: [{
                    type: 'box',
                    y: values,
                    x: labels,
                    name: '',
                    marker: { color: primary, opacity: 0.7, size: 4 },
                    line: { color: primary },
                    fillcolor: primary + '30',
                    boxpoints: 'outliers',
                    jitter: 0.3,
                    pointpos: -1.8,
                    hovertemplate: '<b>%{x}</b><br>%{y:,.2f}<extra></extra>',
                }],
                layout: {
                    yaxis: { tickfont: { size: 10 }, showgrid: true, gridcolor: '#F1F5F9' },
                    xaxis: { tickfont: { size: 10 }, showgrid: false },
                    showlegend: false,
                },
            };
        }

        // ── Violin ──────────────────────────────────────────────────────────
        case 'violin': {
            return {
                data: [{
                    type: 'violin',
                    y: values,
                    name: '',
                    box: { visible: true, fillcolor: '#fff', line: { color: primary, width: 1.5 } },
                    meanline: { visible: true, color: primary, width: 2 },
                    fillcolor: primary + '35',
                    line: { color: primary, width: 1.5 },
                    points: 'outliers',
                    jitter: 0.15,
                    pointpos: -1.5,
                    marker: { color: primary, opacity: 0.6, size: 4 },
                    hovertemplate: '%{y:,.2f}<extra></extra>',
                }],
                layout: {
                    yaxis: { tickfont: { size: 10 }, showgrid: true, gridcolor: '#F1F5F9' },
                    xaxis: { showticklabels: false },
                    showlegend: false,
                },
            };
        }

        // ── Default ──────────────────────────────────────────────────────────
        default: {
            return {
                data: [{
                    type: 'bar',
                    x: labels,
                    y: values,
                    marker: {
                        color: values.map((_, i) => [
                            '#2563EB', '#7C3AED', '#EC4899', '#F59E0B', '#10B981',
                        ][i % 5]),
                        line: { color: '#fff', width: 0.5 },
                    },
                    hovertemplate: '<b>%{x}</b><br>%{y:,.2f}<extra></extra>',
                }],
                layout: {
                    xaxis: { tickfont: { size: 10 }, showgrid: false },
                    yaxis: { tickfont: { size: 10 }, showgrid: true, gridcolor: '#F1F5F9', zeroline: false },
                },
            };
        }
    }
}
