'use client';

import React, { useMemo } from 'react';

interface EcommerceMetrics {
  revenue: number;
  aov: number;
  conversionRate: number;
  cartAbandonment: number;
  ltv: number;
}

export function EcommerceDashboard() {
  const metrics: EcommerceMetrics = useMemo(() => ({
    revenue: 850000,
    aov: 145.50,
    conversionRate: 2.8,
    cartAbandonment: 68.2,
    ltv: 1250,
  }), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">E-Commerce Analytics Dashboard</h1>
        <p className="text-slate-400">Sales, conversion, and customer metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Revenue', value: `$${(metrics.revenue / 1000).toFixed(0)}K`, unit: 'last 30 days', color: 'from-green-500 to-green-600' },
          { title: 'AOV', value: `$${metrics.aov}`, unit: 'avg order', color: 'from-blue-500 to-blue-600' },
          { title: 'Conversion', value: `${metrics.conversionRate}%`, unit: 'visitors→buyers', color: 'from-purple-500 to-purple-600' },
          { title: 'Cart Abandon', value: `${metrics.cartAbandonment}%`, unit: 'lost sales', color: 'from-red-500 to-red-600' },
          { title: 'Customer LTV', value: `$${metrics.ltv}`, unit: 'lifetime value', color: 'from-amber-500 to-amber-600' },
          { title: 'Transactions', value: '5,847', unit: 'orders', color: 'from-indigo-500 to-indigo-600' },
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
