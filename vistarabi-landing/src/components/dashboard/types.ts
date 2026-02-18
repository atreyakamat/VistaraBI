// Chart type definitions for Module 5B visualizations
export type ChartDataPoint = {
    label: string;
    value: number;
    [key: string]: string | number;
};

export type TimeSeriesPoint = {
    date: string;
    value: number;
    [key: string]: string | number;
};

export type CategoryData = {
    name: string;
    value: number;
    percentage?: number;
    color?: string;
};

export type KPICardData = {
    kpiId: string;
    kpiName: string;
    value: number;
    unit?: string;
    trend?: {
        direction: 'up' | 'down' | 'neutral';
        percentage: number;
    };
    chartType: 'metric_card' | 'line_chart' | 'bar_chart' | 'pie_chart';
    chartData?: ChartDataPoint[] | TimeSeriesPoint[] | CategoryData[];
};
