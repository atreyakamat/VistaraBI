'use client';

import React, { useMemo, useState } from 'react';
import { useRealData } from '@/lib/hooks/use-real-data';
import type { FinanceRecord } from '@/lib/demo/data-loaders';

interface DataInspectionState {
  isOpen: boolean;
  selectedKPI: string | null;
  filterText: string;
  sortColumn: string | null;
  sortDesc: boolean;
}

export function FinanceDashboardLive() {
  const { finance, isLiveMode } = useRealData();
  const [inspection, setInspection] = useState<DataInspectionState>({
    isOpen: false,
    selectedKPI: null,
    filterText: '',
    sortColumn: null,
    sortDesc: false,
  });

  const filteredData = useMemo(() => {
    if (!finance.data) return [];

    let filtered = finance.data;

    // Apply region/employment filter
    if (inspection.filterText) {
      filtered = filtered.filter(
        (row) =>
          row.region?.toLowerCase().includes(inspection.filterText.toLowerCase()) ||
          row.employment_status?.toLowerCase().includes(inspection.filterText.toLowerCase()) ||
          row.user_id?.toLowerCase().includes(inspection.filterText.toLowerCase())
      );
    }

    // Apply sorting
    if (inspection.sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[inspection.sortColumn as keyof FinanceRecord];
        const bVal = b[inspection.sortColumn as keyof FinanceRecord];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return inspection.sortDesc ? bVal - aVal : aVal - bVal;
        }

        return inspection.sortDesc
          ? String(bVal).localeCompare(String(aVal))
          : String(aVal).localeCompare(String(bVal));
      });
    }

    return filtered;
  }, [finance.data, inspection.filterText, inspection.sortColumn, inspection.sortDesc]);

  if (finance.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="text-center">
          <p className="text-slate-400">Loading real Finance data...</p>
        </div>
      </div>
    );
  }

  if (finance.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="text-center">
          <p className="text-red-400">Error loading data: {finance.error}</p>
        </div>
      </div>
    );
  }

  const kpis = finance.kpis;
  if (!kpis) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Finance Analytics Dashboard</h1>
            <p className="text-slate-400">
              {isLiveMode ? '🔴 LIVE DATA' : 'Demo Mode'} • {finance.data?.length || 0} individuals
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
      </div>

      {/* Risk Profile Banner */}
      {kpis.riskProfile && (
        <div
          className={`mb-6 border rounded-lg p-4 ${
            kpis.riskProfile === 'Low Risk'
              ? 'bg-green-900/30 border-green-500/30'
              : kpis.riskProfile === 'Low-Moderate Risk'
              ? 'bg-blue-900/30 border-blue-500/30'
              : kpis.riskProfile === 'Moderate'
              ? 'bg-amber-900/30 border-amber-500/30'
              : 'bg-red-900/30 border-red-500/30'
          }`}
        >
          <h3 className="font-semibold mb-1">Overall Risk Profile: {kpis.riskProfile}</h3>
          <p className="text-sm opacity-75">Based on credit score, debt-to-income ratio, and savings rate</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[
          {
            title: 'Average Monthly Income',
            value: `$${kpis.averageIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
            unit: 'per person',
            color: 'from-green-500 to-green-600',
            kpiName: 'averageIncome',
          },
          {
            title: 'Average Monthly Expenses',
            value: `$${kpis.averageExpenses.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
            unit: 'spending',
            color: 'from-orange-500 to-orange-600',
            kpiName: 'averageExpenses',
          },
          {
            title: 'Savings Rate',
            value: `${kpis.savingsRate.toFixed(1)}%`,
            unit: 'of income saved',
            color: 'from-blue-500 to-blue-600',
            kpiName: 'savingsRate',
          },
          {
            title: 'Debt-to-Income Ratio',
            value: `${kpis.debtToIncomeRatio.toFixed(2)}`,
            unit: 'debt/income',
            color: 'from-red-500 to-red-600',
            kpiName: 'debtToIncome',
          },
          {
            title: 'Average Credit Score',
            value: `${kpis.averageCreditScore}`,
            unit: 'creditworthiness',
            color: 'from-purple-500 to-purple-600',
            kpiName: 'creditScore',
          },
          {
            title: 'Average Savings',
            value: `$${(kpis.averageSavings / 1000).toFixed(1)}K`,
            unit: 'liquid assets',
            color: 'from-cyan-500 to-cyan-600',
            kpiName: 'savingsRate',
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
            <p className="text-slate-600 text-xs mt-3 hover:text-slate-500">Click to inspect source data  to </p>
          </div>
        ))}
      </div>

      {/* Employment & Regional Distribution */}
      {Object.keys(kpis.employmentDistribution).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-bold mb-4">Employment Distribution</h3>
            <div className="space-y-3">
              {Object.entries(kpis.employmentDistribution)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([status, pct], idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-slate-300">{status}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-400 text-sm">{pct}%</span>
                      <div className="w-32 bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Top Regions by Average Income */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-bold mb-4">Top Regions by Average Income</h3>
            <div className="space-y-3">
              {Object.entries(kpis.incomeDistributionByRegion)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([region, income], idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-slate-300">{region}</span>
                    <span className="text-green-400 font-semibold">
                      ${income.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Debt Analysis & Data Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">Debt Analysis</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Individuals with Loans</span>
              <span className="text-slate-300">{kpis.debtAnalysis.totalWithLoans}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Average Loan Amount</span>
              <span className="text-slate-300">
                ${kpis.debtAnalysis.averageLoanAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
            {Object.entries(kpis.debtAnalysis.commonLoanTypes)
              .slice(0, 3)
              .map(([type, count], idx) => (
                <div key={idx} className="flex justify-between pt-2 border-t border-slate-700">
                  <span className="text-slate-400">{type}</span>
                  <span className="text-slate-300">{count} accounts</span>
                </div>
              ))}
          </div>
        </div>

        {/* Data Quality Summary */}
        {finance.quality && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-bold mb-4">Data Quality Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Records</span>
                <span className="text-slate-300">{finance.quality.totalRows}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valid Records</span>
                <span className="text-green-400">{finance.quality.validRows}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Null Values</span>
                <span className="text-amber-400">{Object.values(finance.quality.nullValues).reduce((a, b) => a + b, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Duplicates</span>
                <span className="text-red-400">{finance.quality.duplicates}</span>
              </div>
            </div>
          </div>
        )}
      </div>

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
                placeholder="Filter by region or employment status..."
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
                <option value="monthly_income_usd">Income</option>
                <option value="credit_score">Credit Score</option>
                <option value="age">Age</option>
              </select>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-4 text-slate-300">User ID</th>
                    <th className="text-left py-2 px-4 text-slate-300">Age</th>
                    <th className="text-left py-2 px-4 text-slate-300">Employment</th>
                    <th className="text-left py-2 px-4 text-slate-300">Region</th>
                    <th className="text-right py-2 px-4 text-slate-300">Income</th>
                    <th className="text-right py-2 px-4 text-slate-300">Credit Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 px-4 text-slate-400">{row.user_id}</td>
                      <td className="py-2 px-4 text-slate-400">{row.age}</td>
                      <td className="py-2 px-4 text-slate-300">{row.employment_status}</td>
                      <td className="py-2 px-4 text-slate-400">{row.region}</td>
                      <td className="py-2 px-4 text-right text-green-400">
                        ${row.monthly_income_usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-4 text-right text-blue-400">{row.credit_score}</td>
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
