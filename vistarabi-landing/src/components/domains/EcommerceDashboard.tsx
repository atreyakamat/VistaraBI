'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, DollarSign, TrendingUp, Users, Package, BarChart3 } from 'lucide-react';

function MiniLineChart({ data, color, height = 48 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 200;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 8) - 4}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1 h-12">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all hover:opacity-80" style={{ height: `${(v / max) * 100}%`, background: color }} />
      ))}
    </div>
  );
}

function FunnelChart({ stages }: { stages: { name: string; value: number; pct: string }[] }) {
  const max = stages[0].value;
  return (
    <div className="space-y-2">
      {stages.map((s, i) => (
        <div key={s.name} className="flex items-center gap-3">
          <span className="text-xs text-slate-400 w-28 shrink-0 text-right">{s.name}</span>
          <div className="flex-1 h-7 bg-slate-700/40 rounded-lg overflow-hidden">
            <div
              className="h-full rounded-lg transition-all"
              style={{
                width: `${(s.value / max) * 100}%`,
                background: `linear-gradient(90deg, #22c55e ${100 - i * 20}%, #16a34a)`,
                opacity: 1 - i * 0.15,
              }}
            />
          </div>
          <span className="text-xs font-mono text-slate-300 w-16 text-right">{s.pct}</span>
        </div>
      ))}
    </div>
  );
}

export function EcommerceDashboard() {
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const revenueData = [680, 720, 750, 810, 780, 920, 850, 890, 870, 910, 940, 985];
  const aovData = [128, 131, 135, 138, 142, 155, 148, 145, 149, 151, 153, 158];
  const ordersData = [5300, 5500, 5550, 5870, 5490, 5935, 5740, 6140, 5840, 6020, 6140, 6230];

  const kpis = [
    { title: 'Revenue', value: '$985K', change: '+12.6%', positive: true, icon: DollarSign, subtitle: 'Last 30 days' },
    { title: 'AOV', value: '$158', change: '+3.3%', positive: true, icon: ShoppingCart, subtitle: 'Avg Order Value' },
    { title: 'Conversion', value: '3.2%', change: '+0.4%', positive: true, icon: TrendingUp, subtitle: 'Visitor to Buyer' },
    { title: 'Cart Abandon', value: '64.8%', change: '-3.4%', positive: true, icon: Package, subtitle: 'Abandonment Rate' },
    { title: 'LTV', value: '$1,380', change: '+8.2%', positive: true, icon: Users, subtitle: 'Customer Lifetime' },
    { title: 'Orders', value: '6,230', change: '+6.5%', positive: true, icon: BarChart3, subtitle: 'Monthly Orders' },
  ];

  const funnelStages = [
    { name: 'Visitors', value: 194800, pct: '100%' },
    { name: 'Product Views', value: 87660, pct: '45.0%' },
    { name: 'Add to Cart', value: 25220, pct: '12.9%' },
    { name: 'Checkout', value: 8870, pct: '4.6%' },
    { name: 'Purchase', value: 6230, pct: '3.2%' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-green-950">
      <header className="border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/demo" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" /> Back to Demos
            </Link>
            <span className="text-slate-700">|</span>
            <h1 className="text-lg font-bold text-white">E-Commerce Analytics</h1>
          </div>
          <span className="text-xs text-slate-500 font-mono">Demo Data &middot; Live Simulation</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.title} className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-5 hover:border-green-500/30 transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 group-hover:bg-green-500/20 transition-colors">
                  <kpi.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-slate-500 mt-1">{kpi.subtitle}</p>
              <span className={`text-xs font-bold mt-2 inline-block ${kpi.positive ? 'text-emerald-400' : 'text-red-400'}`}>{kpi.change}</span>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Revenue Trend</h3>
            <p className="text-xs text-slate-500 mb-4">12-month rolling, in thousands</p>
            <MiniLineChart data={revenueData} color="#22c55e" height={120} />
            <div className="flex justify-between mt-3 text-[10px] text-slate-600">
              {months.map(m => <span key={m}>{m}</span>)}
            </div>
          </div>

          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Conversion Funnel</h3>
            <p className="text-xs text-slate-500 mb-4">Visitor-to-purchase pipeline</p>
            <FunnelChart stages={funnelStages} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">AOV Trend</h3>
            <p className="text-xs text-slate-500 mb-4">Average Order Value ($)</p>
            <MiniLineChart data={aovData} color="#f59e0b" height={120} />
            <div className="flex justify-between mt-3 text-[10px] text-slate-600">
              {months.map(m => <span key={m}>{m}</span>)}
            </div>
          </div>

          <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Monthly Orders</h3>
            <p className="text-xs text-slate-500 mb-4">Total transactions</p>
            <MiniBarChart data={ordersData} color="#6366f1" />
            <div className="flex justify-between mt-3 text-[10px] text-slate-600">
              {months.map(m => <span key={m}>{m}</span>)}
            </div>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Top Products by Revenue</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Product</th>
                  <th className="text-right py-2 px-3">Revenue</th>
                  <th className="text-right py-2 px-3">Units Sold</th>
                  <th className="text-right py-2 px-3">Margin</th>
                  <th className="text-right py-2 px-3">Growth</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  { product: 'Premium Headphones', revenue: '$142K', units: '980', margin: '42%', growth: '+18%' },
                  { product: 'Smart Watch Pro', revenue: '$128K', units: '640', margin: '38%', growth: '+24%' },
                  { product: 'Wireless Earbuds', revenue: '$96K', units: '2,400', margin: '55%', growth: '+12%' },
                  { product: 'Laptop Stand', revenue: '$84K', units: '1,680', margin: '62%', growth: '+8%' },
                  { product: 'USB-C Hub', revenue: '$72K', units: '3,600', margin: '48%', growth: '+15%' },
                ].map(row => (
                  <tr key={row.product} className="border-t border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 px-3 font-medium text-white">{row.product}</td>
                    <td className="py-3 px-3 text-right font-mono">{row.revenue}</td>
                    <td className="py-3 px-3 text-right">{row.units}</td>
                    <td className="py-3 px-3 text-right text-emerald-400">{row.margin}</td>
                    <td className="py-3 px-3 text-right text-green-400">{row.growth}</td>
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
