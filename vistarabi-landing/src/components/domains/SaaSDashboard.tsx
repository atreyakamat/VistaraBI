'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Users, DollarSign, BarChart3, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, Tooltip } from 'recharts';

function MiniLineChart({ data, color, height = 48 }: { data: number[]; color: string; height?: number }) {
  const chartData = data.map((val, i) => ({ index: i, value: val }));
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '12px', padding: '4px 8px' }} 
            itemStyle={{ color: '#fff', padding: 0 }} 
            labelStyle={{ display: 'none' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((val, i) => ({ index: i, value: val }));
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 48 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <Bar dataKey="value" fill={color} isAnimationActive={false} radius={[2, 2, 0, 0]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '12px', padding: '4px 8px' }} 
            itemStyle={{ color: '#fff', padding: 0 }} 
            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
            labelStyle={{ display: 'none' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SaaSDashboard() {
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const mrrData = [95, 102, 108, 112, 118, 120, 125, 130, 136, 142, 148, 155];
  const churnData = [4.2, 3.9, 3.8, 3.5, 3.4, 3.3, 3.2, 3.1, 3.0, 2.9, 2.8, 2.7];
  const cacData = [920, 890, 870, 860, 850, 840, 835, 830, 825, 820, 815, 810];
  const newCustomers = [45, 52, 48, 61, 55, 68, 72, 65, 78, 82, 75, 88];

  const kpis = [
    { title: 'MRR', value: '$155K', change: '+8.3%', positive: true, icon: DollarSign, subtitle: 'Monthly Recurring Revenue' },
    { title: 'ARR', value: '$1.86M', change: '+12.4%', positive: true, icon: TrendingUp, subtitle: 'Annual Run Rate' },
    { title: 'Churn Rate', value: '2.7%', change: '-0.5%', positive: true, icon: RefreshCw, subtitle: 'Monthly Logo Churn' },
    { title: 'NRR', value: '118.5%', change: '+2.1%', positive: true, icon: BarChart3, subtitle: 'Net Revenue Retention' },
    { title: 'CAC', value: '$810', change: '-4.7%', positive: true, icon: Users, subtitle: 'Customer Acq. Cost' },
    { title: 'LTV:CAC', value: '8.5x', change: '+0.6x', positive: true, icon: TrendingUp, subtitle: 'Lifetime Value Ratio' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/demo" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Demos
            </Link>
            <span className="text-slate-700">|</span>
            <h1 className="text-lg font-bold text-white">SaaS Analytics</h1>
          </div>
          <span className="text-xs text-slate-500 font-mono">Demo Data &middot; Live Simulation</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.title} className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-5 hover:border-purple-500/30 transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                  <kpi.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-1">{kpi.subtitle}</p>
              <span className={`text-xs font-bold mt-2 inline-block ${kpi.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                {kpi.change}
              </span>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* MRR Trend */}
          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">MRR Growth Trend</h3>
                <p className="text-xs text-slate-500 mt-1">12-month rolling, in thousands</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">+63%</span>
            </div>
            <div className="mt-2">
              <MiniLineChart data={mrrData} color="#a855f7" height={120} />
            </div>
            <div className="flex justify-between mt-3 text-[10px] text-slate-600">
              {months.map(m => <span key={m}>{m}</span>)}
            </div>
          </div>

          {/* Churn Trend */}
          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Churn Rate Trend</h3>
                <p className="text-xs text-slate-500 mt-1">Monthly logo churn %</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Improving</span>
            </div>
            <div className="mt-2">
              <MiniLineChart data={churnData} color="#f59e0b" height={120} />
            </div>
            <div className="flex justify-between mt-3 text-[10px] text-slate-600">
              {months.map(m => <span key={m}>{m}</span>)}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* New Customers */}
          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">New Customers</h3>
                <p className="text-xs text-slate-500 mt-1">Monthly sign-ups</p>
              </div>
            </div>
            <MiniBarChart data={newCustomers} color="#6366f1" />
            <div className="flex justify-between mt-3 text-[10px] text-slate-600">
              {months.map(m => <span key={m}>{m}</span>)}
            </div>
          </div>

          {/* CAC Trend */}
          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">CAC Reduction</h3>
                <p className="text-xs text-slate-500 mt-1">Customer Acquisition Cost ($)</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">-12%</span>
            </div>
            <MiniLineChart data={cacData} color="#22d3ee" height={120} />
            <div className="flex justify-between mt-3 text-[10px] text-slate-600">
              {months.map(m => <span key={m}>{m}</span>)}
            </div>
          </div>
        </div>

        {/* Cohort Table */}
        <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Revenue Cohort Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Cohort</th>
                  <th className="text-right py-2 px-3">Customers</th>
                  <th className="text-right py-2 px-3">MRR</th>
                  <th className="text-right py-2 px-3">Retention</th>
                  <th className="text-right py-2 px-3">Expansion</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  { cohort: 'Q1 2025', customers: 180, mrr: '$42K', retention: '94%', expansion: '+18%' },
                  { cohort: 'Q2 2025', customers: 210, mrr: '$51K', retention: '92%', expansion: '+15%' },
                  { cohort: 'Q3 2025', customers: 245, mrr: '$58K', retention: '95%', expansion: '+22%' },
                  { cohort: 'Q4 2025', customers: 290, mrr: '$72K', retention: '96%', expansion: '+25%' },
                  { cohort: 'Q1 2026', customers: 340, mrr: '$88K', retention: '97%', expansion: '+28%' },
                ].map((row) => (
                  <tr key={row.cohort} className="border-t border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 px-3 font-medium text-white">{row.cohort}</td>
                    <td className="py-3 px-3 text-right">{row.customers}</td>
                    <td className="py-3 px-3 text-right font-mono">{row.mrr}</td>
                    <td className="py-3 px-3 text-right text-emerald-400">{row.retention}</td>
                    <td className="py-3 px-3 text-right text-purple-400">{row.expansion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
