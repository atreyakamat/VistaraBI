'use client';

import React, { useEffect, useState } from 'react';
import type { ServicesKPIs } from '@/lib/demo/services-processor';

interface ServicesData { kpis: ServicesKPIs; count: number }

export function ServicesDashboardLive() {
  const [data, setData] = useState<ServicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data/services')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load')))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 flex items-center justify-center">
      <div className="text-center"><div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading Services data...</p></div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <p className="text-red-400">Error: {error || 'No data'}</p>
    </div>
  );

  const { kpis } = data;

  const statCards = [
    { label: 'Total Revenue', value: `₹${(kpis.totalRevenue / 10000000).toFixed(2)}Cr`, sub: 'Billable revenue', color: 'from-amber-500 to-amber-600' },
    { label: 'Net Profit', value: `₹${(kpis.netProfit / 10000000).toFixed(2)}Cr`, sub: 'After costs', color: kpis.netProfit > 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600' },
    { label: 'Avg Margin', value: `${kpis.avgMarginPct.toFixed(1)}%`, sub: 'Gross margin', color: kpis.avgMarginPct >= 40 ? 'from-emerald-500 to-emerald-600' : 'from-amber-500 to-amber-600' },
    { label: 'Utilisation Rate', value: `${kpis.utilizationRate}%`, sub: 'Billable hours ratio', color: kpis.utilizationRate >= 75 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600' },
    { label: 'Avg Hourly Rate', value: `₹${kpis.avgHourlyRate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: 'Per billable hour', color: 'from-purple-500 to-purple-600' },
    { label: 'Client Satisfaction', value: `${kpis.avgClientSatisfaction}/5.0`, sub: 'CSAT score', color: kpis.avgClientSatisfaction >= 4 ? 'from-teal-500 to-teal-600' : 'from-amber-500 to-amber-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Services Analytics Dashboard</h1>
          <p className="text-slate-400">🔴 LIVE DATA • {data.count.toLocaleString()} projects</p>
        </div>
        <div className="text-right text-sm text-slate-500">Updated: {new Date().toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map(c => (
          <div key={c.label} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-amber-500/40 transition-all">
            <p className="text-slate-400 text-sm font-medium">{c.label}</p>
            <p className={`text-3xl font-bold mt-2 bg-gradient-to-r ${c.color} bg-clip-text text-transparent`}>{c.value}</p>
            <p className="text-slate-500 text-sm mt-2">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Revenue by Service Type</h3>
          <div className="space-y-3">
            {Object.entries(kpis.revenueByServiceType).sort((a,b)=>b[1]-a[1]).map(([type, rev]) => {
              const pct = ((rev / kpis.totalRevenue) * 100).toFixed(1);
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm w-28">{type}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-amber-500 to-yellow-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-amber-400 text-sm w-16 text-right">₹{(rev/100000).toFixed(1)}L</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Revenue by Industry Vertical</h3>
          <div className="space-y-3">
            {Object.entries(kpis.revenueByVertical).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([vert, rev]) => (
              <div key={vert} className="flex justify-between py-1 border-b border-slate-700/50">
                <span className="text-slate-300 text-sm">{vert}</span>
                <span className="text-green-400 font-semibold text-sm">₹{(rev/100000).toFixed(2)}L</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Project Status</h3>
          <div className="space-y-3">
            {Object.entries(kpis.statusDistribution).sort((a,b)=>b[1]-a[1]).map(([status, count]) => {
              const pct = ((count / kpis.totalProjects) * 100).toFixed(1);
              const color = status === 'Completed' ? 'text-green-400' : status === 'Cancelled' ? 'text-red-400' : status === 'On Hold' ? 'text-amber-400' : 'text-blue-400';
              return (
                <div key={status} className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-300 text-sm">{status}</span>
                  <span className={`${color} text-sm font-medium`}>{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Operations Summary</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Total Projects', value: kpis.totalProjects.toLocaleString() },
              { label: 'Completed Projects', value: kpis.completedProjects.toLocaleString() },
              { label: 'On-Time Rate', value: `${kpis.onTimeRate}%` },
              { label: 'Avg Billable Hrs/Project', value: `${kpis.avgBillableHours}h` },
              { label: 'Total Cost', value: `₹${(kpis.totalCost/10000000).toFixed(2)}Cr` },
            ].map(row => (
              <div key={row.label} className="flex justify-between py-1 border-b border-slate-700/50">
                <span className="text-slate-400">{row.label}</span>
                <span className="text-slate-200 font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
