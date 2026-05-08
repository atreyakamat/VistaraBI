'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, PiggyBank, BarChart3, Wallet } from 'lucide-react';

function Chart({data,color,h=48}:{data:number[];color:string;h?:number}){const mx=Math.max(...data),mn=Math.min(...data),r=mx-mn||1,w=200;const p=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/r)*(h-8)-4}`).join(' ');return<svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{height:h}}><polyline points={p} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;}
function Bars({data,color}:{data:number[];color:string}){const mx=Math.max(...data);return<div className="flex items-end gap-1 h-12">{data.map((v,i)=><div key={i} className="flex-1 rounded-sm" style={{height:`${(v/mx)*100}%`,background:color}}/>)}</div>;}

export function FinanceDashboard(){
  const mo=['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
  const netMargin=[18.2,18.5,19.0,19.2,19.5,19.8,20.1,20.4,20.8,21.0,21.3,21.5];
  const roi=[12.5,12.8,13.1,13.4,13.2,13.8,14.0,14.3,14.5,14.8,15.0,15.2];
  const cashFlow=[2.4,2.6,2.8,2.5,3.0,3.2,2.9,3.4,3.6,3.8,4.0,4.2];
  const debtEquity=[0.45,0.44,0.43,0.42,0.41,0.40,0.39,0.38,0.37,0.36,0.35,0.34];
  const kpis=[
    {t:'Net Margin',v:'21.5%',c:'+0.2%',I:TrendingUp,s:'Profit Margin'},
    {t:'ROI',v:'15.2%',c:'+0.2%',I:DollarSign,s:'Return on Investment'},
    {t:'Cash Flow',v:'$4.2M',c:'+5.3%',I:Wallet,s:'Operating CF'},
    {t:'D/E Ratio',v:'0.34',c:'-0.01',I:TrendingDown,s:'Debt-to-Equity'},
    {t:'AUM',v:'$48.6M',c:'+8.4%',I:PiggyBank,s:'Assets Under Mgmt'},
    {t:'Sharpe Ratio',v:'1.82',c:'+0.08',I:BarChart3,s:'Risk-Adj Return'},
  ];
  const portfolios=[{n:'Growth Fund',a:'$18.2M',r:'18.5%',s:'1.92',d:'Low'},{n:'Value Fund',a:'$12.8M',r:'12.4%',s:'1.68',d:'Medium'},{n:'Bond Fund',a:'$8.4M',r:'6.2%',s:'2.15',d:'Very Low'},{n:'Real Estate',a:'$5.8M',r:'14.1%',s:'1.45',d:'Medium'},{n:'Emerging Mkts',a:'$3.4M',r:'22.8%',s:'1.12',d:'High'}];
  return(
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950">
      <header className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4"><Link href="/demo" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"><ArrowLeft className="w-4 h-4"/> Back to Demos</Link><span className="text-slate-700">|</span><h1 className="text-lg font-bold text-white">Finance Analytics</h1></div>
          <span className="text-xs text-slate-500 font-mono">Demo Data</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map(k=><div key={k.t} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 hover:border-cyan-500/30 transition-all"><div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-3"><k.I className="w-4 h-4"/></div><p className="text-2xl font-bold text-white">{k.v}</p><p className="text-xs text-slate-500 mt-1">{k.s}</p><span className="text-xs font-bold mt-2 inline-block text-emerald-400">{k.c}</span></div>)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-lg font-bold text-white mb-1">Net Margin Trend</h3><p className="text-xs text-slate-500 mb-4">Profit margin (%)</p><Chart data={netMargin} color="#06b6d4" h={120}/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div></div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-lg font-bold text-white mb-1">ROI Trend</h3><p className="text-xs text-slate-500 mb-4">Return on Investment (%)</p><Chart data={roi} color="#22c55e" h={120}/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div></div>
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-lg font-bold text-white mb-1">Operating Cash Flow</h3><p className="text-xs text-slate-500 mb-4">Monthly ($M)</p><Bars data={cashFlow} color="#a855f7"/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div></div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"><h3 className="text-lg font-bold text-white mb-1">Debt-to-Equity</h3><p className="text-xs text-slate-500 mb-4">Leverage ratio</p><Chart data={debtEquity} color="#f59e0b" h={120}/><div className="flex justify-between mt-3 text-[10px] text-slate-600">{mo.map(m=><span key={m}>{m}</span>)}</div></div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Portfolio Performance</h3>
          <table className="w-full text-sm"><thead><tr className="text-slate-500 text-xs uppercase tracking-wider"><th className="text-left py-2 px-3">Portfolio</th><th className="text-right py-2 px-3">AUM</th><th className="text-right py-2 px-3">Return</th><th className="text-right py-2 px-3">Sharpe</th><th className="text-right py-2 px-3">Risk</th></tr></thead>
            <tbody className="text-slate-300">{portfolios.map(r=><tr key={r.n} className="border-t border-slate-700/50 hover:bg-slate-700/20"><td className="py-3 px-3 font-medium text-white">{r.n}</td><td className="py-3 px-3 text-right font-mono">{r.a}</td><td className="py-3 px-3 text-right text-emerald-400">{r.r}</td><td className="py-3 px-3 text-right text-cyan-400">{r.s}</td><td className="py-3 px-3 text-right text-amber-400">{r.d}</td></tr>)}</tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
