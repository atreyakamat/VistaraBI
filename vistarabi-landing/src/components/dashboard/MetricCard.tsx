'use client';

import { KPICardData } from './types';

interface MetricCardProps {
    data: KPICardData;
}

export function MetricCard({ data }: MetricCardProps) {
    const formatValue = (value: number): string => {
        if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
        if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
        return value.toFixed(2);
    };

    const getTrendColor = (direction?: 'up' | 'down' | 'neutral') => {
        if (!direction || direction === 'neutral') return 'text-gray-500';
        return direction === 'up' ? 'text-green-600' : 'text-red-600';
    };

    const getTrendIcon = (direction?: 'up' | 'down' | 'neutral') => {
        if (!direction || direction === 'neutral') return '→';
        return direction === 'up' ? '↑' : '↓';
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
                {data.kpiName.replace(/_/g, ' ').toUpperCase()}
            </h3>
            <div className="flex items-baseline justify-between">
                <p className="text-3xl font-bold text-gray-900">
                    {formatValue(data.value)}
                    {data.unit && <span className="text-sm ml-1 text-gray-500">{data.unit}</span>}
                </p>
                {data.trend && (
                    <div className={`flex items-center text-sm font-medium ${getTrendColor(data.trend.direction)}`}>
                        <span className="mr-1">{getTrendIcon(data.trend.direction)}</span>
                        <span>{data.trend.percentage.toFixed(1)}%</span>
                    </div>
                )}
            </div>
        </div>
    );
}
