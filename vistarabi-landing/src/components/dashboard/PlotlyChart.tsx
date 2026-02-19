'use client';

// Module 5A — Plotly Chart Wrapper
// Renders advanced Plotly charts: heatmap, treemap, sunburst, waterfall, box_plot, violin

import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues  
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PlotlyChartProps {
    chartType: string;
    labels: string[];
    dataValues: number[];
    colorAccent?: string;
}

export function PlotlyChart({ chartType, labels, dataValues, colorAccent }: PlotlyChartProps) {
    const primary = colorAccent || '#2563EB';
    const { data, layout } = buildPlotlyConfig(chartType, labels, dataValues, primary);

    return (
        <Plot
            data={data}
            layout={{
                ...layout,
                autosize: true,
                margin: { l: 40, r: 20, t: 10, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { family: 'Inter, system-ui, sans-serif', size: 11 },
            }}
            config={{ responsive: true, displayModeBar: false }}
            style={{ width: '100%', height: '100%' }}
        />
    );
}

function buildPlotlyConfig(
    chartType: string,
    labels: string[],
    values: number[],
    primary: string
): { data: any[]; layout: any } {
    switch (chartType) {
        case 'heatmap': {
            // Reshape 1D data into a 2D grid
            const cols = Math.ceil(Math.sqrt(values.length));
            const rows = Math.ceil(values.length / cols);
            const z: number[][] = [];
            for (let r = 0; r < rows; r++) {
                z.push(values.slice(r * cols, (r + 1) * cols));
            }
            return {
                data: [{
                    type: 'heatmap',
                    z,
                    x: labels.slice(0, cols),
                    colorscale: [[0, '#EFF6FF'], [0.5, primary], [1, '#1E3A8A']],
                    showscale: true,
                }],
                layout: {},
            };
        }

        case 'treemap':
            return {
                data: [{
                    type: 'treemap',
                    labels,
                    parents: labels.map(() => ''),
                    values,
                    textinfo: 'label+value',
                    marker: { colorscale: [[0, '#DBEAFE'], [1, primary]] },
                }],
                layout: {},
            };

        case 'sunburst':
            return {
                data: [{
                    type: 'sunburst',
                    labels,
                    parents: labels.map(() => ''),
                    values,
                    marker: { colorscale: 'Blues' },
                }],
                layout: {},
            };

        case 'waterfall':
            return {
                data: [{
                    type: 'waterfall',
                    x: labels,
                    y: values,
                    connector: { line: { color: '#CBD5E1' } },
                    increasing: { marker: { color: '#10B981' } },
                    decreasing: { marker: { color: '#EF4444' } },
                    totals: { marker: { color: primary } },
                }],
                layout: {},
            };

        case 'box_plot':
            return {
                data: [{
                    type: 'box',
                    y: values,
                    name: '',
                    marker: { color: primary },
                    boxpoints: 'outliers',
                }],
                layout: {},
            };

        case 'violin':
            return {
                data: [{
                    type: 'violin',
                    y: values,
                    name: '',
                    box: { visible: true },
                    meanline: { visible: true },
                    fillcolor: primary + '40',
                    line: { color: primary },
                }],
                layout: {},
            };

        default:
            return {
                data: [{
                    type: 'bar',
                    x: labels,
                    y: values,
                    marker: { color: primary },
                }],
                layout: {},
            };
    }
}
