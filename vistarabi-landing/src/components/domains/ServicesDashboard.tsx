'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Users, TrendingUp, Clock, DollarSign, BarChart3 } from 'lucide-react';

import { ResponsiveContainer, LineChart, Line, BarChart, Bar, Tooltip } from 'recharts';
function Chart({ data, color, h = 48 }: { data: number[]; color: string; h?: number }) {
  const chartData = data.map((val, i) => ({ index: i, value: val }));
  return (
    <div style={{ width: '100%', height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '12px', padding: '4px 8px' }} itemStyle={{ color: '#fff', padding: 0 }} labelStyle={{ display: 'none' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
function Bars({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((val, i) => ({ index: i, value: val }));
  return (
    <div style={{ width: '100%', height: '100%', minHeight: 48 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <Bar dataKey="value" fill={color} isAnimationActive={false} radius={[2, 2, 0, 0]} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', fontSize: '12px', padding: '4px 8px' }} itemStyle={{ color: '#fff', padding: 0 }} cursor={{ fill: 'rgba(255,255,255,0.1)' }} labelStyle={{ display: 'none' }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ServicesDashboard(){
  const mo=['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
  const util=[72,74,75,76,78,75,80,82,83,84,85,87];
  const rev=[420,440,460,480,500,490,520,540,560,580,600,625];
  const margin=[28,29,30,31,32,30,33,34,35,36,37,38];
  const csat=[88,89,88,90,91,90,92,93,93,94,94,95];
  const kpis=[
    {t:'Utilization',v:'87%',c:'+2.4%',I:Clock,s:'Billable Hours %'},
    {t:'Revenue',v:'$625K',c:'+4.2%',I:DollarSign,s:'Monthly Revenue'},
    {t:'Net Margin',v:'38%',c:'+1.0%',I:TrendingUp,s:'Profit Margin'},
    {t:'CSAT Score',v:'95%',c:'+1.1%',I:Users,s:'Client Satisfaction'},
    {t:'Active Projects',v:'42',c:'+3',I:Briefcase,s:'In Progress'},
    {t:'Avg Bill Rate',v:'$185/hr',c:'+5.7%',I:BarChart3,s:'Blended Rate'},
  ];
  const clients=[{n:'Acme Corp',r:'$148K',u:'92%',m:'42%',p:'6'},{n:'TechVenture',r:'$125K',u:'88%',m:'38%',p:'4'},{n:'GlobalFin',r:'$110K',u:'85%',m:'35%',p:'5'},{n:'MedStar',r:'$95K',u:'90%',m:'40%',p:'3'},{n:'EduFirst',r:'$82K',u:'82%',m:'32%',p:'4'}];
  return(
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950">
      <header className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4"><Link href="/demo" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"><ArrowLeft className="w-4 h-4"/> Back to Demos</Link><span className="text-slate-700">|</span><h1 className="text-lg font-bold text-white">Services Analytics</h1></div>
          <span className="text-xs text-slate-500 font-mono">Demo Data</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map(k=><div key={k.t} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:border-amber-500/30 transition-all"><div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 mb-3"><k.I className="w-4 h-4"/></div><p className="text-2xl font-bold text-white">{k.v}</p><p className="text-xs text-slate-500 mt-1">{k.s}</p><span className="text-xs font-bold mt-2 inline-block text-emerald-400">{k.c}</span></div>)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-lg font-bold text-white mb-1">Utilization Rate</h3><p className="text-xs text-slate-500 mb-4">Billable hours (%)</p><Chart data={util} color="#f59e0b" h={120}/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div></div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-lg font-bold text-white mb-1">Revenue Trend</h3><p className="text-xs text-slate-500 mb-4">Monthly ($K)</p><Bars data={rev} color="#6366f1"/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div></div>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-lg font-bold text-white mb-1">Net Margin</h3><p className="text-xs text-slate-500 mb-4">Profit margin (%)</p><Chart data={margin} color="#22c55e" h={120}/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div></div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-lg font-bold text-white mb-1">Client Satisfaction</h3><p className="text-xs text-slate-500 mb-4">CSAT (%)</p><Chart data={csat} color="#ec4899" h={120}/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div></div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Top Clients</h3>
          <table className="w-full text-sm"><thead><tr className="text-slate-500 text-xs uppercase tracking-wider"><th className="text-left py-2 px-3">Client</th><th className="text-right py-2 px-3">Revenue</th><th className="text-right py-2 px-3">Utilization</th><th className="text-right py-2 px-3">Margin</th><th className="text-right py-2 px-3">Projects</th></tr></thead>
            <tbody className="text-slate-300">{clients.map(r=><tr key={r.n} className="border-t border-slate-700/50 hover:bg-slate-700/20"><td className="py-3 px-3 font-medium text-white">{r.n}</td><td className="py-3 px-3 text-right font-mono">{r.r}</td><td className="py-3 px-3 text-right text-amber-400">{r.u}</td><td className="py-3 px-3 text-right text-emerald-400">{r.m}</td><td className="py-3 px-3 text-right">{r.p}</td></tr>)}</tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
