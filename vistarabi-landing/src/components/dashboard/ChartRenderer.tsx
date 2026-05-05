'use client';

// Module 5 — Chart Renderer
// Routes to ChartJS or Plotly based on library discriminant, forwards all props
import React from 'react';
import dynamic from 'next/dynamic';

const ChartJSChart = dynamic(() => import('./ChartJSChart').then(mod => mod.ChartJSChart), { ssr: false });
const PlotlyChart = dynamic(() => import('./PlotlyChart').then(mod => mod.PlotlyChart), { ssr: false });

interface ChartRendererProps {
    chartType: string;
    chartLibrary: 'chartjs' | 'plotly';
    labels: string[];
    dataValues: number[];
    colorAccent?: string;
    recordCount: number;
    kpiName?: string;
    onPointClick?: (label: string, value: number, index: number) => void;
}

export const ChartRenderer = React.memo(function ChartRenderer({
    chartType, chartLibrary, labels, dataValues, colorAccent, recordCount, kpiName, onPointClick,
}: ChartRendererProps) {
    const disableAnimation = recordCount > 500;

    if (chartLibrary === 'plotly') {
        return (
            <PlotlyChart
                chartType={chartType}
                labels={labels}
                dataValues={dataValues}
                colorAccent={colorAccent}
                kpiName={kpiName}
                onPointClick={onPointClick}
            />
        );
    }

    return (
        <ChartJSChart
            chartType={chartType}
            labels={labels}
            dataValues={dataValues}
            colorAccent={colorAccent}
            disableAnimation={disableAnimation}
            kpiName={kpiName}
            onPointClick={onPointClick}
        />
    );
});
