'use client';

import React, { useMemo } from 'react';

interface ManufacturingMetrics {
  oee: number;
  yieldRate: number;
  defectRate: number;
  downtime: number;
}

export function ManufacturingDashboard() {
  const metrics: ManufacturingMetrics = useMemo(() => ({
    oee: 78.4,
    yieldRate: 96.2,
    defectRate: 2.1,
    downtime: 4.8,
  }), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Manufacturing Analytics Dashboard</h1>
        <p className="text-slate-400">Production efficiency and quality metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'OEE', value: `${metrics.oee}%`, unit: 'equipment effectiveness', color: 'from-blue-500 to-blue-600' },
          { title: 'Yield Rate', value: `${metrics.yieldRate}%`, unit: 'good units', color: 'from-green-500 to-green-600' },
          { title: 'Defect Rate', value: `${metrics.defectRate}%`, unit: 'defective units', color: 'from-red-500 to-red-600' },
          { title: 'Downtime', value: `${metrics.downtime}%`, unit: 'unplanned', color: 'from-amber-500 to-amber-600' },
          { title: 'Lines Running', value: '24', unit: 'production lines', color: 'from-indigo-500 to-indigo-600' },
          { title: 'Output', value: '125K', unit: 'units/day', color: 'from-purple-500 to-purple-600' },
        ].map((kpi) => (
          <div key={kpi.title} className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <p className="text-slate-400 text-sm font-medium">{kpi.title}</p>
            <p className={`text-3xl font-bold mt-2 bg-gradient-to-r ${kpi.color} bg-clip-text text-transparent`}>
              {kpi.value}
            </p>
            <p className="text-slate-500 text-sm mt-2">{kpi.unit}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
