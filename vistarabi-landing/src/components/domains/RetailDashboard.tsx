'use client';

import React, { useMemo } from 'react';
import { getRetailDemoSummary, type RetailKPIMetrics } from '@/lib/demo/retail-demo-data';

interface KPICard {
  title: string;
  value: string | number;
  unit: string;
  trend?: number;
  category: string;
  color: string;
}

export function RetailDashboard() {
  const demoData = useMemo(() => getRetailDemoSummary(), []);

  const kpiCards: KPICard[] = useMemo(() => [
    {
      title: 'Sales Per Sq Ft',
      value: demoData.chainMetrics.chainwideSalesPerSqft,
      unit: '$/sqft',
      category: 'Efficiency',
      color: 'from-blue-500 to-blue-600',
      trend: 12.5,
    },
    {
      title: 'Inventory Turnover',
      value: demoData.chainMetrics.chainwideInventoryTurnover,
      unit: 'times/year',
      category: 'Efficiency',
      color: 'from-green-500 to-green-600',
      trend: 8.2,
    },
    {
      title: 'Total Foot Traffic',
      value: demoData.chainMetrics.totalFootTraffic.toLocaleString(),
      unit: 'visitors (90 days)',
      category: 'Growth',
      color: 'from-purple-500 to-purple-600',
      trend: 5.3,
    },
    {
      title: 'Gross Margin',
      value: demoData.chainMetrics.chainwideGrossMargin,
      unit: '%',
      category: 'Revenue',
      color: 'from-amber-500 to-amber-600',
      trend: 3.1,
    },
    {
      title: 'Total Revenue',
      value: `$${(demoData.chainMetrics.totalRevenue / 1000).toFixed(1)}K`,
      unit: '(90 days)',
      category: 'Revenue',
      color: 'from-red-500 to-red-600',
      trend: 15.8,
    },
    {
      title: 'Active Stores',
      value: demoData.chainMetrics.totalStores,
      unit: 'stores',
      category: 'Operations',
      color: 'from-indigo-500 to-indigo-600',
      trend: 0,
    },
  ], [demoData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Retail Analytics Dashboard</h1>
        <p className="text-slate-400">Chain-wide performance metrics (Last 90 days)</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.title}
            className="group relative overflow-hidden rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all duration-300 hover:shadow-lg"
          >
            {/* Glassmorphism background */}
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity" />
            
            {/* Content */}
            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-slate-400 text-sm font-medium">{kpi.title}</p>
                  <p className={`text-3xl font-bold mt-2 bg-gradient-to-r ${kpi.color} bg-clip-text text-transparent`}>
                    {kpi.value}
                  </p>
                </div>
                {kpi.trend !== undefined && kpi.trend !== 0 && (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-semibold ${
                    kpi.trend >= 0
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {kpi.trend >= 0 ? '↑' : '↓'} {Math.abs(kpi.trend)}%
                  </div>
                )}
              </div>
              <p className="text-slate-500 text-sm">{kpi.unit}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Store Performance Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Store Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Store Name</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold">Sales/Sqft</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold">Inv. Turnover</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold">Foot Traffic</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold">Gross Margin</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold">Total Sales</th>
              </tr>
            </thead>
            <tbody>
              {demoData.storeMetrics.map((store: RetailKPIMetrics, idx: number) => (
                <tr
                  key={store.storeId}
                  className={`border-b border-slate-700 hover:bg-slate-700/50 transition-colors ${
                    idx % 2 === 0 ? 'bg-slate-800/50' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-white font-medium">{store.storeName}</td>
                  <td className="py-3 px-4 text-right text-blue-400">${store.salesPerSqft}</td>
                  <td className="py-3 px-4 text-right text-green-400">{store.inventoryTurnover}x</td>
                  <td className="py-3 px-4 text-right text-purple-400">{store.footTraffic.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-amber-400">{store.grossMargin.toFixed(2)}%</td>
                  <td className="py-3 px-4 text-right text-red-400">${store.totalSales.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart/Visualization Placeholder */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Sales Trend (90 days)</h3>
          <div className="h-48 bg-slate-700/50 rounded-lg flex items-center justify-center">
            <p className="text-slate-500">📊 Sales trend visualization</p>
          </div>
        </div>

        {/* Store Comparison */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Store Comparison</h3>
          <div className="h-48 bg-slate-700/50 rounded-lg flex items-center justify-center">
            <p className="text-slate-500">📈 Store performance comparison</p>
          </div>
        </div>
      </div>

      {/* Data Info */}
      <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
        <p className="text-slate-400 text-sm">
          Demo data generated for 5 stores with 90 days of historical data. 
          This represents simulated retail operations for demonstration purposes.
        </p>
      </div>
    </div>
  );
}
