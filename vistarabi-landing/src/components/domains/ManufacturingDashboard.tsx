'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Factory, Gauge, TrendingUp, AlertTriangle, Wrench, BarChart3 } from 'lucide-react';

function Chart({data,color,h=48}:{data:number[];color:string;h?:number}){const mx=Math.max(...data),mn=Math.min(...data),r=mx-mn||1,w=200;const p=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/r)*(h-8)-4}`).join(' ');return<svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{height:h}}><polyline points={p} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
function Bars({data,color}:{data:number[];color:string}){const mx=Math.max(...data);return<div className="flex items-end gap-1 h-12">{data.map((v,i)=><div key={i} className="flex-1 rounded-sm" style={{height:`${(v/mx)*100}%`,background:color}}/>)}</div>;}

export function ManufacturingDashboard(){
  const mo=['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
  const oee=[78,79,80,81,82,80,83,84,85,86,87,88];
  const yield_=[96.2,96.5,96.8,97.0,97.1,96.9,97.3,97.5,97.6,97.8,97.9,98.1];
  const defect=[2.8,2.6,2.5,2.3,2.2,2.4,2.1,2.0,1.9,1.8,1.7,1.6];
  const downtime=[12,11,10.5,10,9.5,11,9,8.5,8,7.5,7,6.5];
  const kpis=[
    {t:'OEE',v:'88%',c:'+3.5%',I:Gauge,s:'Overall Effectiveness'},
    {t:'Yield Rate',v:'98.1%',c:'+0.3%',I:TrendingUp,s:'First Pass Yield'},
    {t:'Defect Rate',v:'1.6%',c:'-0.1%',I:AlertTriangle,s:'Monthly PPM'},
    {t:'Downtime',v:'6.5%',c:'-0.5%',I:Wrench,s:'Unplanned %'},
    {t:'Throughput',v:'12.4K',c:'+4.2%',I:Factory,s:'Units/Day'},
    {t:'MTBF',v:'142 hrs',c:'+8.2%',I:BarChart3,s:'Mean Time Between Failures'},
  ];
  const lines=[{n:'Line A',o:'92%',y:'99.1%',d:'1.2%',t:'3,200'},{n:'Line B',o:'88%',y:'98.4%',d:'1.5%',t:'2,800'},{n:'Line C',o:'86%',y:'97.8%',d:'1.8%',t:'2,600'},{n:'Line D',o:'84%',y:'97.2%',d:'2.0%',t:'2,400'},{n:'Line E',o:'82%',y:'96.5%',d:'2.3%',t:'1,400'}];
  return(
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-red-950">
      <header className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4"><Link href="/demo" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"><ArrowLeft className="w-4 h-4"/> Back to Demos</Link><span className="text-slate-700">|</span><h1 className="text-lg font-bold text-white">Manufacturing Analytics</h1></div>
          <span className="text-xs text-slate-500 font-mono">Demo Data</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map(k=><div key={k.t} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:border-red-500/30 transition-all"><div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 mb-3"><k.I className="w-4 h-4"/></div><p className="text-2xl font-bold text-white">{k.v}</p><p className="text-xs text-slate-500 mt-1">{k.s}</p><span className="text-xs font-bold mt-2 inline-block text-emerald-400">{k.c}</span></div>)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-lg font-bold text-white mb-1">OEE Trend</h3><p className="text-xs text-slate-500 mb-4">Overall Equipment Effectiveness (%)</p><Chart data={oee} color="#ef4444" h={120}/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div></div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-lg font-bold text-white mb-1">Yield Rate</h3><p className="text-xs text-slate-500 mb-4">First pass yield (%)</p><Chart data={yield_} color="#22c55e" h={120}/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div></div>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-lg font-bold text-white mb-1">Defect Rate</h3><p className="text-xs text-slate-500 mb-4">Monthly (%)</p><Chart data={defect} color="#f59e0b" h={120}/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div></div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-lg font-bold text-white mb-1">Downtime</h3><p className="text-xs text-slate-500 mb-4">Unplanned (%)</p><Bars data={downtime} color="#6366f1"/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div></div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Production Line Performance</h3>
          <table className="w-full text-sm"><thead><tr className="text-slate-500 text-xs uppercase tracking-wider"><th className="text-left py-2 px-3">Line</th><th className="text-right py-2 px-3">OEE</th><th className="text-right py-2 px-3">Yield</th><th className="text-right py-2 px-3">Defect</th><th className="text-right py-2 px-3">Output</th></tr></thead>
            <tbody className="text-slate-300">{lines.map(r=><tr key={r.n} className="border-t border-slate-700/50 hover:bg-slate-700/20"><td className="py-3 px-3 font-medium text-white">{r.n}</td><td className="py-3 px-3 text-right text-red-400">{r.o}</td><td className="py-3 px-3 text-right text-emerald-400">{r.y}</td><td className="py-3 px-3 text-right text-amber-400">{r.d}</td><td className="py-3 px-3 text-right font-mono">{r.t}</td></tr>)}</tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
