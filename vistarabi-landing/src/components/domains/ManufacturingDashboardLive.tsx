'use client';

import { useEffect, useState } from 'react';

export default function ManufacturingDashboardLive() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/data/manufacturing');
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Failed to load manufacturing data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading Manufacturing Dashboard...</div>;
  if (!data || !data.success) return <div className="p-8 text-center text-red-500">Failed to load data</div>;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Manufacturing Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">🔴 LIVE DATA - {data.recordCount.toLocaleString()} data points</p>
        </div>
        <div className="text-right">
          <div className="inline-block backdrop-blur-md bg-white/10 border border-white/20 rounded-lg px-6 py-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">Quality Score</p>
            <p className="text-3xl font-bold text-green-500">{data.quality?.score}%</p>
          </div>
        </div>
      </div>

      {/* Critical KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Production */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Production</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {(data.kpis?.totalProduction / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-gray-500 mt-1">Units produced</p>
        </div>

        {/* Quality Score */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Quality Score</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            {data.kpis?.qualityScore}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Defect rate: {data.kpis?.defectRate}%</p>
        </div>

        {/* Machine Efficiency */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Machine Efficiency</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {data.kpis?.machineEfficiency}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Operational efficiency</p>
        </div>

        {/* Equipment Uptime */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Equipment Uptime</p>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
            {data.kpis?.uptime}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Downtime: {data.kpis?.downtime}%</p>
        </div>
      </div>

      {/* Cost & Production */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Factory Performance */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Factory Performance</h3>
          <div className="space-y-4">
            {data.kpis?.factoryPerformance?.map((factory: any, idx: number) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 dark:text-gray-300">{factory.factory}</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{factory.efficiency}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ width: `${factory.efficiency}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Analysis */}
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cost Analysis</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Total Cost</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                ${(data.kpis?.productionCost / 1000000).toFixed(2)}M
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Cost Per Unit</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                ${data.kpis?.costPerUnit}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Throughput</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {data.kpis?.throughput} units/hr
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Lead Time</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">
                {data.kpis?.leadTime} days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Products</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.kpis?.topProducts?.map((product: any, idx: number) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="font-semibold text-gray-900 dark:text-white">{product.product}</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">Units: {product.units.toLocaleString()}</p>
                <p className="text-sm text-red-600 dark:text-red-400">Defects: {product.defects}</p>
              </div>
            </div>
          ))}
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
