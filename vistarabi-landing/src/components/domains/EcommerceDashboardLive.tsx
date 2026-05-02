'use client';

import React, { useMemo, useState } from 'react';
import { useRealData } from '@/lib/hooks/use-real-data';
import type { EcommerceRecord } from '@/lib/demo/data-loaders';
import type { EcommerceKPIs } from '@/lib/demo/ecommerce-processor';

interface DataInspectionState {
  isOpen: boolean;
  selectedKPI: string | null;
  filterText: string;
  sortColumn: string | null;
  sortDesc: boolean;
}

export function EcommerceDashboardLive() {
  const { ecommerce, isLiveMode } = useRealData();
  const [inspection, setInspection] = useState<DataInspectionState>({
    isOpen: false,
    selectedKPI: null,
    filterText: '',
    sortColumn: null,
    sortDesc: false,
  });

  const filteredData = useMemo(() => {
    if (!ecommerce.data) return [];

    let filtered = ecommerce.data;

    // Apply category filter
    if (inspection.filterText) {
      filtered = filtered.filter(
        (row) =>
          row.category?.toLowerCase().includes(inspection.filterText.toLowerCase()) ||
          row.order_id?.toLowerCase().includes(inspection.filterText.toLowerCase())
      );
    }

    // Apply sorting
    if (inspection.sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[inspection.sortColumn as keyof EcommerceRecord];
        const bVal = b[inspection.sortColumn as keyof EcommerceRecord];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return inspection.sortDesc ? bVal - aVal : aVal - bVal;
        }

        return inspection.sortDesc
          ? String(bVal).localeCompare(String(aVal))
          : String(aVal).localeCompare(String(bVal));
      });
    }

    return filtered;
  }, [ecommerce.data, inspection.filterText, inspection.sortColumn, inspection.sortDesc]);

  if (ecommerce.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="text-center">
          <p className="text-slate-400">Loading real E-Commerce data...</p>
        </div>
      </div>
    );
  }

  if (ecommerce.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="text-center">
          <p className="text-red-400">Error loading data: {ecommerce.error}</p>
        </div>
      </div>
    );
  }

  const kpis = ecommerce.kpis;
  if (!kpis) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">E-Commerce Analytics Dashboard</h1>
            <p className="text-slate-400">
              {isLiveMode ? '🔴 LIVE DATA' : 'Demo Mode'} • {ecommerce.data?.length || 0} transactions
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      {/* Data Quality Alert */}
      {ecommerce.quality && ecommerce.quality.issues.length > 0 && (
        <div className="mb-6 bg-amber-900/30 border border-amber-500/30 rounded-lg p-4">
          <h3 className="text-amber-400 font-semibold mb-2">Data Quality Notice</h3>
          <ul className="text-amber-300/70 text-sm space-y-1">
            {ecommerce.quality.issues.slice(0, 3).map((issue, i) => (
              <li key={i}>• {issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[
          {
            title: 'Total Revenue',
            value: `$${(kpis.totalRevenue / 1000).toFixed(1)}K`,
            unit: `${kpis.totalOrders} orders`,
            color: 'from-green-500 to-green-600',
            kpiName: 'totalRevenue',
          },
          {
            title: 'Average Order Value',
            value: `$${kpis.averageOrderValue.toFixed(2)}`,
            unit: 'per order',
            color: 'from-blue-500 to-blue-600',
            kpiName: 'aov',
          },
          {
            title: 'Conversion Rate',
            value: `${kpis.conversionRate.toFixed(2)}%`,
            unit: 'sessions → orders',
            color: 'from-purple-500 to-purple-600',
            kpiName: 'conversionRate',
          },
          {
            title: 'Cart Abandonment',
            value: `${kpis.cartAbandonmentRate.toFixed(1)}%`,
            unit: 'of sessions',
            color: 'from-red-500 to-red-600',
            kpiName: 'cartAbandonment',
          },
          {
            title: 'Customer LTV',
            value: `$${kpis.customerLifetimeValue.toFixed(2)}`,
            unit: 'per customer',
            color: 'from-amber-500 to-amber-600',
            kpiName: 'ltv',
          },
          {
            title: 'Profit Margin',
            value: `${kpis.profitMargin.toFixed(1)}%`,
            unit: 'of revenue',
            color: 'from-indigo-500 to-indigo-600',
            kpiName: 'profitMargin',
          },
        ].map((kpi) => (
          <div
            key={kpi.title}
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 cursor-pointer transition-all"
            onClick={() =>
              setInspection({
                ...inspection,
                isOpen: true,
                selectedKPI: kpi.kpiName,
              })
            }
          >
            <p className="text-slate-400 text-sm font-medium">{kpi.title}</p>
            <p className={`text-3xl font-bold mt-2 bg-gradient-to-r ${kpi.color} bg-clip-text text-transparent`}>
              {kpi.value}
            </p>
            <p className="text-slate-500 text-sm mt-2">{kpi.unit}</p>
            <p className="text-slate-600 text-xs mt-3 hover:text-slate-500">Click to inspect source data →</p>
          </div>
        ))}
      </div>

      {/* Top Categories */}
      {kpis.topCategories.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-bold mb-4">Top Categories by Revenue</h3>
            <div className="space-y-3">
              {kpis.topCategories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-slate-300">{cat.category}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400 text-sm">${cat.revenue.toFixed(2)}</span>
                    <div className="w-32 bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                        style={{
                          width: `${(cat.revenue / kpis.totalRevenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Quality Summary */}
          {ecommerce.quality && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-bold mb-4">Data Quality Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Records</span>
                  <span className="text-slate-300">{ecommerce.quality.totalRows}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Valid Records</span>
                  <span className="text-green-400">{ecommerce.quality.validRows}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Null Values</span>
                  <span className="text-amber-400">{Object.values(ecommerce.quality.nullValues).reduce((a, b) => a + b, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duplicates</span>
                  <span className="text-red-400">{ecommerce.quality.duplicates}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Inspection Modal */}
      {inspection.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-white font-bold text-lg">Data Inspection: {inspection.selectedKPI}</h2>
              <button
                onClick={() => setInspection({ ...inspection, isOpen: false })}
                className="text-slate-400 hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            {/* Filter and Sort Controls */}
            <div className="mb-4 flex gap-4">
              <input
                type="text"
                placeholder="Filter by category or order ID..."
                value={inspection.filterText}
                onChange={(e) => setInspection({ ...inspection, filterText: e.target.value })}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500"
              />
              <select
                value={inspection.sortColumn || ''}
                onChange={(e) => setInspection({ ...inspection, sortColumn: e.target.value || null })}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Sort by...</option>
                <option value="revenue">Revenue</option>
                <option value="date">Date</option>
                <option value="category">Category</option>
              </select>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-4 text-slate-300">Date</th>
                    <th className="text-left py-2 px-4 text-slate-300">Order ID</th>
                    <th className="text-left py-2 px-4 text-slate-300">Customer</th>
                    <th className="text-left py-2 px-4 text-slate-300">Category</th>
                    <th className="text-right py-2 px-4 text-slate-300">Revenue</th>
                    <th className="text-right py-2 px-4 text-slate-300">COGS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 px-4 text-slate-400">{row.date}</td>
                      <td className="py-2 px-4 text-slate-300">{row.order_id}</td>
                      <td className="py-2 px-4 text-slate-400">{row.customer_id}</td>
                      <td className="py-2 px-4 text-slate-400">{row.category}</td>
                      <td className="py-2 px-4 text-right text-green-400">${row.revenue.toFixed(2)}</td>
                      <td className="py-2 px-4 text-right text-slate-400">${row.cogs.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-slate-400 text-sm mt-4">Showing {filteredData.length} records</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
