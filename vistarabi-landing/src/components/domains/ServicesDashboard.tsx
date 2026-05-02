'use client';

import React, { useMemo } from 'react';

interface ServicesMetrics {
  utilization: number;
  margin: number;
  retention: number;
  revenue: number;
}

export function ServicesDashboard() {
  const metrics: ServicesMetrics = useMemo(() => ({
    utilization: 78.5,
    margin: 42.3,
    retention: 86.7,
    revenue: 450000,
  }), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Services Analytics Dashboard</h1>
        <p className="text-slate-400">Utilization, profitability, and client metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Billable Util.', value: `${metrics.utilization}%`, unit: 'hours billed', color: 'from-blue-500 to-blue-600' },
          { title: 'Project Margin', value: `${metrics.margin}%`, unit: 'profit/project', color: 'from-green-500 to-green-600' },
          { title: 'Client Retention', value: `${metrics.retention}%`, unit: 'repeat clients', color: 'from-purple-500 to-purple-600' },
          { title: 'Revenue', value: `$${(metrics.revenue / 1000).toFixed(0)}K`, unit: 'last quarter', color: 'from-amber-500 to-amber-600' },
          { title: 'Active Projects', value: '34', unit: 'ongoing', color: 'from-indigo-500 to-indigo-600' },
          { title: 'Team Size', value: '87', unit: 'employees', color: 'from-red-500 to-red-600' },
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
