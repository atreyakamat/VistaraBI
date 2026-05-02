'use client';

import React, { useMemo } from 'react';

interface FinanceMetrics {
  netMargin: number;
  roi: number;
  debtToEquity: number;
  revenue: number;
}

export function FinanceDashboard() {
  const metrics: FinanceMetrics = useMemo(() => ({
    netMargin: 18.5,
    roi: 24.3,
    debtToEquity: 1.2,
    revenue: 2850000,
  }), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Finance Analytics Dashboard</h1>
        <p className="text-slate-400">Profitability and investment returns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Net Margin', value: `${metrics.netMargin}%`, unit: 'profitability', color: 'from-green-500 to-green-600' },
          { title: 'ROI', value: `${metrics.roi}%`, unit: 'return', color: 'from-blue-500 to-blue-600' },
          { title: 'Debt-to-Equity', value: metrics.debtToEquity, unit: 'ratio', color: 'from-purple-500 to-purple-600' },
          { title: 'Annual Revenue', value: `$${(metrics.revenue / 1000000).toFixed(1)}M`, unit: 'TTM', color: 'from-amber-500 to-amber-600' },
          { title: 'Cash Flow', value: '$156K', unit: 'operating', color: 'from-indigo-500 to-indigo-600' },
          { title: 'Assets', value: '$4.2M', unit: 'total', color: 'from-red-500 to-red-600' },
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
