'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TimeSeriesPoint } from './types';

interface TimeSeriesChartProps {
    data: TimeSeriesPoint[];
    title: string;
    dataKey?: string;
}

export function TimeSeriesChart({ data, title, dataKey = 'value' }: TimeSeriesChartProps) {
    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-4">
                {title.replace(/_/g, ' ').toUpperCase()}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="date"
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
                    <Line
                        type="monotone"
                        dataKey={dataKey}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
