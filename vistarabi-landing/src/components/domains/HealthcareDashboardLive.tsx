'use client';

import React, { useEffect, useState } from 'react';
import type { HealthcareKPIs } from '@/lib/demo/healthcare-processor';

interface HealthcareData { kpis: HealthcareKPIs; count: number }

export function HealthcareDashboardLive() {
  const [data, setData] = useState<HealthcareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/data/healthcare')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load')))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-950 to-slate-900 flex items-center justify-center">
      <div className="text-center"><div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading Healthcare data...</p></div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <p className="text-red-400">Error: {error || 'No data'}</p>
    </div>
  );

  const { kpis } = data;

  const statCards = [
    { label: 'Total Visits', value: kpis.totalVisits.toLocaleString(), sub: 'Patient encounters', color: 'from-pink-500 to-pink-600' },
    { label: 'Total Revenue', value: `₹${(kpis.totalRevenue / 10000000).toFixed(2)}Cr`, sub: 'Treatment revenue', color: 'from-green-500 to-green-600' },
    { label: 'Avg Length of Stay', value: `${kpis.avgLengthOfStay} days`, sub: 'Per admission', color: 'from-blue-500 to-blue-600' },
    { label: 'Readmission Rate', value: `${kpis.readmissionRate}%`, sub: '30-day readmission', color: kpis.readmissionRate > 15 ? 'from-red-500 to-red-600' : 'from-emerald-500 to-emerald-600' },
    { label: 'Patient Satisfaction', value: `${kpis.avgPatientSatisfaction}/5.0`, sub: 'Average CSAT score', color: 'from-amber-500 to-amber-600' },
    { label: 'Bed Occupancy', value: `${kpis.avgBedOccupancy}%`, sub: 'Capacity utilisation', color: kpis.avgBedOccupancy > 85 ? 'from-orange-500 to-orange-600' : 'from-teal-500 to-teal-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-950 to-slate-900 p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Healthcare Analytics Dashboard</h1>
          <p className="text-slate-400">🔴 LIVE DATA • {data.count.toLocaleString()} patient visits</p>
        </div>
        <div className="text-right text-sm text-slate-500">Updated: {new Date().toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map(c => (
          <div key={c.label} className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-pink-500/40 transition-all">
            <p className="text-slate-400 text-sm font-medium">{c.label}</p>
            <p className={`text-3xl font-bold mt-2 bg-gradient-to-r ${c.color} bg-clip-text text-transparent`}>{c.value}</p>
            <p className="text-slate-500 text-sm mt-2">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Department Load</h3>
          <div className="space-y-3">
            {Object.entries(kpis.departmentDistribution).sort((a,b)=>b[1]-a[1]).slice(0,7).map(([dept, count]) => {
              const pct = ((count / kpis.totalVisits) * 100).toFixed(1);
              return (
                <div key={dept} className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm w-36">{dept}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-slate-400 text-sm w-12 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Avg Cost by Department</h3>
          <div className="space-y-3">
            {Object.entries(kpis.costByDepartment).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([dept, cost]) => (
              <div key={dept} className="flex justify-between py-1 border-b border-slate-700/50">
                <span className="text-slate-300 text-sm">{dept}</span>
                <span className="text-green-400 font-semibold text-sm">₹{cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Insurance Type Distribution</h3>
          <div className="space-y-3">
            {Object.entries(kpis.insuranceDistribution).sort((a,b)=>b[1]-a[1]).map(([ins, count]) => {
              const pct = ((count / kpis.totalVisits) * 100).toFixed(1);
              return (
                <div key={ins} className="flex items-center gap-3">
                  <span className="text-slate-300 text-sm w-28">{ins}</span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-slate-400 text-sm w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Patient Outcomes</h3>
          <div className="space-y-3">
            {Object.entries(kpis.outcomeDistribution).sort((a,b)=>b[1]-a[1]).map(([outcome, count]) => {
              const pct = ((count / kpis.totalVisits) * 100).toFixed(1);
              const color = outcome === 'Discharged' ? 'text-green-400' : outcome === 'Deceased' ? 'text-red-400' : 'text-amber-400';
              return (
                <div key={outcome} className="flex justify-between py-1 border-b border-slate-700/50">
                  <span className="text-slate-300 text-sm">{outcome}</span>
                  <span className={`${color} font-semibold text-sm`}>{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
