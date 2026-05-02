'use client';

import { useEffect, useState } from 'react';

export default function RetailDashboardLive() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/data/retail');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to load retail data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading Retail Dashboard...</div>;
  if (!data || !data.success) return <div className="p-8 text-center text-red-500">Failed to load data</div>;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Retail Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">🔴 LIVE DATA - {data.recordCount.toLocaleString()} transactions</p>
        </div>
        <div className="text-right">
          <div className="inline-block backdrop-blur-md bg-white/10 border border-white/20 rounded-lg px-6 py-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">Quality Score</p>
            <p className="text-3xl font-bold text-green-500">{data.quality?.score}%</p>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Revenue</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            ${(data.kpis?.totalRevenue / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-gray-500 mt-1">From {data.kpis?.totalTransactions} transactions</p>
        </div>

        {/* Average Transaction Value */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Transaction</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            ${data.kpis?.averageTransactionValue}
          </p>
          <p className="text-xs text-gray-500 mt-1">Per order</p>
        </div>

        {/* Unique Customers */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Unique Customers</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            {(data.kpis?.uniqueCustomers / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-gray-500 mt-1">Active customers</p>
        </div>

        {/* Product Diversity */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Products</p>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
            {data.kpis?.productDiversity}
          </p>
          <p className="text-xs text-gray-500 mt-1">Unique products</p>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Countries */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Markets</h3>
          <div className="space-y-3">
            {data.kpis?.topCountries?.slice(0, 5).map((country: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">{country.country}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{
                        width: `${(country.revenue / (data.kpis?.topCountries[0]?.revenue || 1)) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    ${(country.revenue / 1000).toFixed(1)}K
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Profit Margin</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{data.kpis?.profitMargin}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Items Per Transaction</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{data.kpis?.averageItemsPerTransaction}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Customer Retention</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">{data.kpis?.customerRetention}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Inventory Turnover</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">{data.kpis?.inventoryTurnover}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality */}
      <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Quality Report</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Completeness</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{data.quality?.completeness}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Accuracy</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{data.quality?.accuracy}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Consistency</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{data.quality?.consistency}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Assessment</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">{data.quality?.assessment}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
