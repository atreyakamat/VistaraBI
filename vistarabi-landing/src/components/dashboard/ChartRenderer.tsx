'use client';

// Module 5A — Chart Renderer
// Routes to ChartJS or Plotly based on chart library discriminant

import { ChartJSChart } from './ChartJSChart';
import { PlotlyChart } from './PlotlyChart';

interface ChartRendererProps {
    chartType: string;
    chartLibrary: 'chartjs' | 'plotly';
    labels: string[];
    dataValues: number[];
    colorAccent?: string;
    recordCount: number;
}

/**
 * Renders the appropriate chart based on library selection.
 * Disables animations for >500 datapoints.
 */
export function ChartRenderer({
    chartType, chartLibrary, labels, dataValues, colorAccent, recordCount,
}: ChartRendererProps) {
    const disableAnimation = recordCount > 500;

    if (chartLibrary === 'plotly') {
        return (
            <PlotlyChart
                chartType={chartType}
                labels={labels}
                dataValues={dataValues}
                colorAccent={colorAccent}
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
        />
    );
}
