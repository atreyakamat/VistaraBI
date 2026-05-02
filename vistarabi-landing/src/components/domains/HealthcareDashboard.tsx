'use client';

import React, { useMemo } from 'react';

interface HealthcareMetrics {
  satisfaction: number;
  readmission: number;
  waitTime: number;
  occupancy: number;
}

export function HealthcareDashboard() {
  const metrics: HealthcareMetrics = useMemo(() => ({
    satisfaction: 4.6,
    readmission: 8.3,
    waitTime: 24,
    occupancy: 82.5,
  }), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Healthcare Analytics Dashboard</h1>
        <p className="text-slate-400">Patient outcomes and operational metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Patient Satisfaction', value: `${metrics.satisfaction}/5`, unit: 'stars', color: 'from-green-500 to-green-600' },
          { title: 'Readmission Rate', value: `${metrics.readmission}%`, unit: '30-day', color: 'from-red-500 to-red-600' },
          { title: 'Avg Wait Time', value: `${metrics.waitTime}m`, unit: 'minutes', color: 'from-amber-500 to-amber-600' },
          { title: 'Bed Occupancy', value: `${metrics.occupancy}%`, unit: 'capacity used', color: 'from-blue-500 to-blue-600' },
          { title: 'Patient Census', value: '847', unit: 'current patients', color: 'from-indigo-500 to-indigo-600' },
          { title: 'Staff Utilization', value: '76.2%', unit: 'productive', color: 'from-purple-500 to-purple-600' },
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
