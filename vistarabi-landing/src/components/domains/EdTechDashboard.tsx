'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, GraduationCap, Users, BookOpen, TrendingUp, Award, BarChart3 } from 'lucide-react';

function MiniLineChart({ data, color, height = 48 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data); const min = Math.min(...data); const range = max - min || 1; const w = 200;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 8) - 4}`).join(' ');
  return (<svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}><polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>);
}

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (<div className="flex items-end gap-1 h-12">{data.map((v, i) => (<div key={i} className="flex-1 rounded-sm hover:opacity-80 transition-all" style={{ height: `${(v / max) * 100}%`, background: color }} />))}</div>);
}

export function EdTechDashboard() {
  const months = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
  const enrollmentData = [1200,1350,1480,1550,1620,1700,1850,1920,2100,2280,2400,2580];
  const completionData = [72,74,73,76,78,80,79,82,83,85,84,87];
  const revenueData = [180,195,210,225,240,260,275,290,310,330,350,375];
  const satisfactionData = [4.1,4.2,4.2,4.3,4.4,4.3,4.5,4.5,4.6,4.6,4.7,4.7];

  const kpis = [
    { title: 'Active Learners', value: '2,580', change: '+7.5%', icon: Users, subtitle: 'Monthly Active' },
    { title: 'Completion Rate', value: '87%', change: '+3.5%', icon: Award, subtitle: 'Course Finish Rate' },
    { title: 'Revenue', value: '$375K', change: '+7.1%', icon: TrendingUp, subtitle: 'Monthly Revenue' },
    { title: 'Avg Score', value: '82.4', change: '+2.1', icon: BarChart3, subtitle: 'Assessment Avg' },
    { title: 'Courses', value: '148', change: '+12', icon: BookOpen, subtitle: 'Active Courses' },
    { title: 'NPS', value: '72', change: '+4', icon: GraduationCap, subtitle: 'Net Promoter' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <header className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/demo" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"><ArrowLeft className="w-4 h-4" /> Back to Demos</Link>
            <span className="text-slate-700">|</span>
            <h1 className="text-lg font-bold text-white">EdTech Analytics</h1>
          </div>
          <span className="text-xs text-slate-500 font-mono">Demo Data</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map(kpi => (
            <div key={kpi.title} className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-5 hover:border-indigo-500/30 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3"><kpi.icon className="w-4 h-4" /></div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-1">{kpi.subtitle}</p>
              <span className="text-xs font-bold mt-2 inline-block text-emerald-400">{kpi.change}</span>
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Enrollment Growth</h3>
            <p className="text-xs text-slate-500 mb-4">Monthly active learners</p>
            <MiniLineChart data={enrollmentData} color="#6366f1" height={120} />
            <div className="flex justify-between mt-3 text-[10px] text-slate-600">{months.map(m => <span key={m}>{m}</span>)}</div>
          </div>
          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Completion Rate Trend</h3>
            <p className="text-xs text-slate-500 mb-4">Course finish percentage</p>
            <MiniLineChart data={completionData} color="#22c55e" height={120} />
            <div className="flex justify-between mt-3 text-[10px] text-slate-600">{months.map(m => <span key={m}>{m}</span>)}</div>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Revenue Trend</h3>
            <p className="text-xs text-slate-500 mb-4">Monthly revenue ($K)</p>
            <MiniBarChart data={revenueData} color="#a855f7" />
            <div className="flex justify-between mt-3 text-[10px] text-slate-600">{months.map(m => <span key={m}>{m}</span>)}</div>
          </div>
          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Student Satisfaction</h3>
            <p className="text-xs text-slate-500 mb-4">Average rating (out of 5.0)</p>
            <MiniLineChart data={satisfactionData} color="#f59e0b" height={120} />
            <div className="flex justify-between mt-3 text-[10px] text-slate-600">{months.map(m => <span key={m}>{m}</span>)}</div>
          </div>
        </div>
        <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Top Courses by Enrollment</h3>
          <table className="w-full text-sm"><thead><tr className="text-slate-500 text-xs uppercase tracking-wider"><th className="text-left py-2 px-3">Course</th><th className="text-right py-2 px-3">Enrolled</th><th className="text-right py-2 px-3">Completion</th><th className="text-right py-2 px-3">Avg Score</th><th className="text-right py-2 px-3">Rating</th></tr></thead>
            <tbody className="text-slate-300">
              {[{c:'Data Science Fundamentals',e:'420',comp:'91%',s:'86.2',r:'4.8'},{c:'Machine Learning A-Z',e:'385',comp:'84%',s:'82.5',r:'4.7'},{c:'Full-Stack Web Dev',e:'350',comp:'78%',s:'80.1',r:'4.6'},{c:'Cloud Architecture',e:'290',comp:'89%',s:'84.8',r:'4.7'},{c:'UX Design Mastery',e:'265',comp:'92%',s:'88.4',r:'4.9'}].map(row => (
                <tr key={row.c} className="border-t border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="py-3 px-3 font-medium text-white">{row.c}</td><td className="py-3 px-3 text-right">{row.e}</td><td className="py-3 px-3 text-right text-emerald-400">{row.comp}</td><td className="py-3 px-3 text-right font-mono">{row.s}</td><td className="py-3 px-3 text-right text-amber-400">{row.r}</td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
