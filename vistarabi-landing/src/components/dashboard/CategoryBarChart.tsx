'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from './types';

interface CategoryBarChartProps {
    data: ChartDataPoint[];
    title: string;
    dataKey?: string;
}

export function CategoryBarChart({ data, title, dataKey = 'value' }: CategoryBarChartProps) {
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-4">
                {title.replace(/_/g, ' ').toUpperCase()}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                    />
                    <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#9ca3af"
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.375rem'
                        }}
                    />
                    <Bar
                        dataKey={dataKey}
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
