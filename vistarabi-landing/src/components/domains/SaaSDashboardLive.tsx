'use client';

import React, { useEffect, useState } from 'react';
import type { SaaSKPIs } from '@/lib/demo/saas-processor';

interface SaaSData { kpis: SaaSKPIs; count: number }

export function SaaSDashboardLive() {
  const [data, setData] = useState<SaaSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data/saas')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load')))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
      <div className="text-center"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading SaaS data...</p></div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <p className="text-red-400">Error: {error || 'No data'}</p>
    </div>
  );

  const { kpis } = data;

  const statCards = [
    { label: 'Total MRR', value: `₹${(kpis.totalMRR / 1000).toFixed(1)}K`, sub: 'Monthly Recurring Revenue', color: 'from-purple-500 to-purple-600' },
    { label: 'ARR', value: `₹${(kpis.totalARR / 100000).toFixed(2)}L`, sub: 'Annual Recurring Revenue', color: 'from-violet-500 to-violet-600' },
    { label: 'Churn Rate', value: `${kpis.churnRate}%`, sub: 'Customer attrition', color: kpis.churnRate > 10 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600' },
    { label: 'LTV:CAC Ratio', value: `${kpis.ltvCacRatio}x`, sub: 'Payback efficiency', color: kpis.ltvCacRatio >= 3 ? 'from-emerald-500 to-emerald-600' : 'from-amber-500 to-amber-600' },
    { label: 'Trial → Paid', value: `${kpis.trialConversionRate}%`, sub: 'Conversion rate', color: 'from-blue-500 to-blue-600' },
    { label: 'Net Rev. Retention', value: `${kpis.netRevenueRetention}%`, sub: 'NRR', color: kpis.netRevenueRetention >= 100 ? 'from-emerald-500 to-emerald-600' : 'from-amber-500 to-amber-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">SaaS Analytics Dashboard</h1>
          <p className="text-slate-400">🔴 LIVE DATA • {data.count.toLocaleString()} subscriptions</p>
        </div>
        <div className="text-right text-sm text-slate-500">Updated: {new Date().toLocaleString()}</div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map(c => (
          <div key={c.label} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all">
            <p className="text-slate-400 text-sm font-medium">{c.label}</p>
            <p className={`text-3xl font-bold mt-2 bg-gradient-to-r ${c.color} bg-clip-text text-transparent`}>{c.value}</p>
            <p className="text-slate-500 text-sm mt-2">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Plan Distribution + MRR by Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Customer Distribution by Plan</h3>
          <div className="space-y-3">
            {Object.entries(kpis.planDistribution).sort((a,b)=>b[1]-a[1]).map(([plan, count]) => {
              const pct = ((count / kpis.totalCustomers) * 100).toFixed(1);
              return (
                <div key={plan} className="flex items-center gap-4">
                  <span className="text-slate-300 w-28 text-sm">{plan}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-slate-400 text-sm w-16 text-right">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">MRR by Plan</h3>
          <div className="space-y-3">
            {Object.entries(kpis.mrrByPlan).sort((a,b)=>b[1]-a[1]).map(([plan, mrr]) => (
              <div key={plan} className="flex justify-between items-center py-1 border-b border-slate-700/50">
                <span className="text-slate-300 text-sm">{plan}</span>
                <span className="text-purple-400 font-semibold">₹{mrr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Acquisition + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Acquisition Channels</h3>
          <div className="space-y-3">
            {Object.entries(kpis.channelDistribution).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([ch, count]) => {
              const pct = ((count / kpis.totalCustomers) * 100).toFixed(1);
              return (
                <div key={ch} className="flex items-center gap-4">
                  <span className="text-slate-300 w-24 text-sm">{ch}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-slate-400 text-sm w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Unit Economics</h3>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Average CAC', value: `₹${kpis.avgCAC.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
              { label: 'Average LTV', value: `₹${kpis.avgLTV.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` },
              { label: 'Average Seats/Account', value: kpis.avgSeats },
              { label: 'Total Customers', value: kpis.totalCustomers.toLocaleString() },
              { label: 'Churned Customers', value: kpis.churned.toLocaleString() },
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
