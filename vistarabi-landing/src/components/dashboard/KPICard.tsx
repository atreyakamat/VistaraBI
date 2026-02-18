'use client';

import { KPICardData } from './types';
import { MetricCard } from './MetricCard';
import { TimeSeriesChart } from './TimeSeriesChart';
import { CategoryBarChart } from './CategoryBarChart';
import { CategoryPieChart } from './CategoryPieChart';

interface KPICardProps {
    data: KPICardData;
}

export function KPICard({ data }: KPICardProps) {
    switch (data.chartType) {
        case 'metric_card':
            return <MetricCard data={data} />;

        case 'line_chart':
            return (
                <TimeSeriesChart
                    data={data.chartData as any[] || []}
                    title={data.kpiName}
                />
            );

        case 'bar_chart':
            return (
                <CategoryBarChart
                    data={data.chartData as any[] || []}
                    title={data.kpiName}
                />
            );

        case 'pie_chart':
            return (
                <CategoryPieChart
                    data={data.chartData as any[] || []}
                    title={data.kpiName}
                />
            );

        default:
            return <MetricCard data={data} />;
    }
}
