'use client';

import React, { useMemo } from 'react';

interface EdTechMetrics {
  enrollment: number;
  completion: number;
  avgScore: number;
  retention: number;
  activeStudents: number;
}

export function EdTechDashboard() {
  const metrics: EdTechMetrics = useMemo(() => ({
    enrollment: 87.5,
    completion: 76.3,
    avgScore: 82.4,
    retention: 91.2,
    activeStudents: 12450,
  }), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">EdTech Analytics Dashboard</h1>
        <p className="text-slate-400">Student engagement and learning outcomes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Enrollment Rate', value: `${metrics.enrollment}%`, unit: 'applicants to enrolled', color: 'from-blue-500 to-blue-600' },
          { title: 'Completion Rate', value: `${metrics.completion}%`, unit: 'finish courses', color: 'from-green-500 to-green-600' },
          { title: 'Avg Score', value: `${metrics.avgScore}/100`, unit: 'student performance', color: 'from-purple-500 to-purple-600' },
          { title: 'Retention', value: `${metrics.retention}%`, unit: 'return rate', color: 'from-amber-500 to-amber-600' },
          { title: 'Active Students', value: metrics.activeStudents.toLocaleString(), unit: 'current enrolled', color: 'from-indigo-500 to-indigo-600' },
          { title: 'Courses', value: '347', unit: 'total offerings', color: 'from-red-500 to-red-600' },
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
