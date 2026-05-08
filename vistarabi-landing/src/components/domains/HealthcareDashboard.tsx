'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, HeartPulse, Users, Clock, TrendingUp, Activity, Stethoscope } from 'lucide-react';

function Chart({ data, color, h = 48 }: { data: number[]; color: string; h?: number }) {
  const mx = Math.max(...data), mn = Math.min(...data), r = mx - mn || 1, w = 200;
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h-((v-mn)/r)*(h-8)-4}`).join(' ');
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{height:h}}><polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function Bars({ data, color }: { data: number[]; color: string }) {
  const mx = Math.max(...data);
  return <div className="flex items-end gap-1 h-12">{data.map((v,i)=><div key={i} className="flex-1 rounded-sm" style={{height:`${(v/mx)*100}%`,background:color}}/>)}</div>;
}

export function HealthcareDashboard() {
  const mo = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
  const pv = [2800,2950,3100,3200,3350,3100,3400,3550,3700,3850,3900,4050];
  const sat = [82,83,84,85,84,86,87,88,89,88,90,91];
  const wt = [42,40,38,37,36,35,34,33,32,31,30,28];
  const rd = [8.5,8.2,8.0,7.8,7.6,7.5,7.3,7.1,7.0,6.8,6.7,6.5];
  const kpis = [
    {t:'Patient Volume',v:'4,050',c:'+3.8%',I:Users,s:'Monthly Visits'},
    {t:'Satisfaction',v:'91%',c:'+2.0%',I:HeartPulse,s:'Patient Score'},
    {t:'Avg Wait Time',v:'28 min',c:'-6.7%',I:Clock,s:'ER Average'},
    {t:'Readmission',v:'6.5%',c:'-0.2%',I:Activity,s:'30-Day Rate'},
    {t:'Bed Occupancy',v:'82%',c:'+1.2%',I:Stethoscope,s:'Utilization'},
    {t:'Revenue/Bed',v:'$4.2K',c:'+5.1%',I:TrendingUp,s:'Daily Average'},
  ];
  const depts = [
    {d:'Emergency',p:'1,200',w:'18 min',s:'88%',r:'4.2%'},
    {d:'Cardiology',p:'680',w:'25 min',s:'94%',r:'5.8%'},
    {d:'Orthopedics',p:'520',w:'30 min',s:'92%',r:'3.1%'},
    {d:'Pediatrics',p:'450',w:'15 min',s:'96%',r:'2.4%'},
    {d:'Oncology',p:'380',w:'22 min',s:'90%',r:'7.5%'},
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-pink-950">
      <header className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/demo" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"><ArrowLeft className="w-4 h-4"/> Back to Demos</Link>
            <span className="text-slate-700">|</span><h1 className="text-lg font-bold text-white">Healthcare Analytics</h1>
          </div>
          <span className="text-xs text-slate-500 font-mono">Demo Data</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map(k=>(
            <div key={k.t} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:border-pink-500/30 transition-all">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 mb-3"><k.I className="w-4 h-4"/></div>
              <p className="text-2xl font-bold text-white">{k.v}</p>
              <p className="text-xs text-slate-500 mt-1">{k.s}</p>
              <span className="text-xs font-bold mt-2 inline-block text-emerald-400">{k.c}</span>
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Patient Volume</h3><p className="text-xs text-slate-500 mb-4">Monthly visits</p>
            <Bars data={pv} color="#ec4899"/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Patient Satisfaction</h3><p className="text-xs text-slate-500 mb-4">Score trend (%)</p>
            <Chart data={sat} color="#22c55e" h={120}/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div>
          </div>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Wait Time Reduction</h3><p className="text-xs text-slate-500 mb-4">ER average (min)</p>
            <Chart data={wt} color="#f59e0b" h={120}/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Readmission Rate</h3><p className="text-xs text-slate-500 mb-4">30-day (%)</p>
            <Chart data={rd} color="#6366f1" h={120}/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div>
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Department Performance</h3>
          <table className="w-full text-sm"><thead><tr className="text-slate-500 text-xs uppercase tracking-wider"><th className="text-left py-2 px-3">Department</th><th className="text-right py-2 px-3">Patients</th><th className="text-right py-2 px-3">Wait</th><th className="text-right py-2 px-3">Satisfaction</th><th className="text-right py-2 px-3">Readmit</th></tr></thead>
            <tbody className="text-slate-300">{depts.map(r=>(
              <tr key={r.d} className="border-t border-slate-700/50 hover:bg-slate-700/20"><td className="py-3 px-3 font-medium text-white">{r.d}</td><td className="py-3 px-3 text-right">{r.p}</td><td className="py-3 px-3 text-right text-amber-400">{r.w}</td><td className="py-3 px-3 text-right text-emerald-400">{r.s}</td><td className="py-3 px-3 text-right text-pink-400">{r.r}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
