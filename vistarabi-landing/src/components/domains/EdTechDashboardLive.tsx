'use client';

import React, { useEffect, useState } from 'react';
import type { EdTechKPIs } from '@/lib/demo/edtech-processor';

interface EdTechData { kpis: EdTechKPIs; count: number }

export function EdTechDashboardLive() {
  const [data, setData] = useState<EdTechData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data/edtech')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load')))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center">
      <div className="text-center"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading EdTech data...</p></div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <p className="text-red-400">Error: {error || 'No data'}</p>
    </div>
  );

  const { kpis } = data;

  const statCards = [
    { label: 'Total Enrollments', value: kpis.totalEnrollments.toLocaleString(), sub: 'All-time students', color: 'from-indigo-500 to-indigo-600' },
    { label: 'Total Revenue', value: `₹${(kpis.totalRevenue / 100000).toFixed(2)}L`, sub: 'Course fees collected', color: 'from-green-500 to-green-600' },
    { label: 'Completion Rate', value: `${kpis.completionRate}%`, sub: 'Students finishing courses', color: kpis.completionRate >= 60 ? 'from-emerald-500 to-emerald-600' : 'from-amber-500 to-amber-600' },
    { label: 'Avg Score', value: `${kpis.avgScore}/100`, sub: 'Assessment average', color: 'from-blue-500 to-blue-600' },
    { label: 'Certificate Rate', value: `${kpis.certificateRate}%`, sub: 'Students certified', color: 'from-purple-500 to-purple-600' },
    { label: 'Avg Time Spent', value: `${kpis.avgTimeSpent}h`, sub: 'Per student per course', color: 'from-cyan-500 to-cyan-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">EdTech Analytics Dashboard</h1>
          <p className="text-slate-400">🔴 LIVE DATA • {data.count.toLocaleString()} enrollments</p>
        </div>
        <div className="text-right text-sm text-slate-500">Updated: {new Date().toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map(c => (
          <div key={c.label} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-indigo-500/40 transition-all">
            <p className="text-slate-400 text-sm font-medium">{c.label}</p>
            <p className={`text-3xl font-bold mt-2 bg-gradient-to-r ${c.color} bg-clip-text text-transparent`}>{c.value}</p>
            <p className="text-slate-500 text-sm mt-2">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Enrollments by Subject</h3>
          <div className="space-y-3">
            {Object.entries(kpis.subjectDistribution).sort((a,b)=>b[1]-a[1]).map(([sub, count]) => {
              const pct = ((count / kpis.totalEnrollments) * 100).toFixed(1);
              return (
                <div key={sub} className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm w-32">{sub}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-slate-400 text-sm w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Revenue by Subject</h3>
          <div className="space-y-3">
            {Object.entries(kpis.revenueBySubject).sort((a,b)=>b[1]-a[1]).map(([sub, rev]) => (
              <div key={sub} className="flex justify-between py-1 border-b border-slate-700/50">
                <span className="text-slate-300 text-sm">{sub}</span>
                <span className="text-green-400 font-semibold text-sm">₹{rev.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Avg Score by Subject</h3>
          <div className="space-y-3">
            {Object.entries(kpis.avgScoreBySubject).sort((a,b)=>b[1]-a[1]).map(([sub, score]) => {
              const pct = score;
              return (
                <div key={sub} className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm w-32">{sub}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div className={`h-2 rounded-full ${score >= 75 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-sm w-10 text-right font-medium ${score >= 75 ? 'text-green-400' : 'text-amber-400'}`}>{score}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Dropout Reasons</h3>
          <div className="space-y-3">
            {Object.entries(kpis.dropoutReasons).filter(([k]) => k).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([reason, count]) => (
              <div key={reason} className="flex justify-between py-1 border-b border-slate-700/50">
                <span className="text-slate-400 text-sm">{reason}</span>
                <span className="text-red-400 text-sm">{count}</span>
              </div>
            ))}
            <div className="pt-2 text-slate-500 text-xs">Avg course fee: ₹{kpis.avgPayment.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
