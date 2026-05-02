'use client';

import React, { useMemo } from 'react';

interface SaaSMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  cac: number;
  nrr: number;
}

export function SaaSDashboard() {
  const metrics: SaaSMetrics = useMemo(() => ({
    mrr: 125000,
    arr: 1500000,
    churnRate: 3.2,
    cac: 850,
    nrr: 118.5,
  }), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">SaaS Analytics Dashboard</h1>
        <p className="text-slate-400">Revenue, retention, and growth metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'MRR', value: `$${(metrics.mrr / 1000).toFixed(0)}K`, unit: '/month', color: 'from-blue-500 to-blue-600' },
          { title: 'ARR', value: `$${(metrics.arr / 1000000).toFixed(1)}M`, unit: '/year', color: 'from-green-500 to-green-600' },
          { title: 'Churn Rate', value: metrics.churnRate, unit: '%', color: 'from-red-500 to-red-600' },
          { title: 'CAC', value: `$${metrics.cac}`, unit: 'cost/customer', color: 'from-amber-500 to-amber-600' },
          { title: 'NRR', value: `${metrics.nrr}%`, unit: 'retained', color: 'from-purple-500 to-purple-600' },
          { title: 'LTV:CAC', value: '8.5x', unit: 'ratio', color: 'from-indigo-500 to-indigo-600' },
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
