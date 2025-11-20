import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cleaningApi, CleaningReport as Report } from '../services/cleaningApi';

export default function CleaningReportPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (jobId) {
      loadReport(jobId);
    }
  }, [jobId]);

  const loadReport = async (id: string) => {
    console.log('📊 Loading report for job:', id);
    setLoading(true);
    setError(null);
    try {
      console.log('📡 Fetching report from API...');
      const result = await cleaningApi.getReport(id);
      console.log('✅ Report loaded successfully:', result);
      setReport(result);
    } catch (err: any) {
      console.error('❌ Report loading failed:', err);
      console.error('   Response:', err.response?.data);
      console.error('   Message:', err.message);
      setError(err.response?.data?.error || err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-xl shadow-2xl p-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-700 text-lg font-medium">Loading cleaning report...</p>
          <p className="text-gray-500 text-sm mt-2">Analyzing your cleaned data</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-xl shadow-2xl p-10 max-w-md">
          <div className="text-red-600 text-6xl mb-6">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Failed to Load Report</h2>
          <p className="text-gray-600 mb-6 text-base">{error || 'Report not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium shadow-lg transition-all hover:shadow-xl"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const { job, logs } = report;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-white hover:text-blue-100 mb-3 flex items-center font-medium transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Data Cleaning Report</h1>
          <p className="text-blue-100 text-sm">
            Job ID: <span className="font-mono bg-blue-800 px-2 py-1 rounded">{job.id}</span> • Status: <span className="bg-green-400 text-green-900 px-2 py-1 rounded font-medium">{job.status}</span>
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Summary */}
        <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-xl">📊</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Executive Summary</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg transition-shadow">
              <p className="text-sm text-blue-700 font-semibold uppercase tracking-wide mb-2">Original Rows</p>
              <p className="text-4xl font-bold text-blue-900">
                {job.stats?.original?.totalRows?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-blue-600 mt-1">Starting dataset</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 hover:shadow-lg transition-shadow">
              <p className="text-sm text-green-700 font-semibold uppercase tracking-wide mb-2">Final Rows</p>
              <p className="text-4xl font-bold text-green-900">
                {job.stats?.final?.totalRows?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">After cleaning</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200 hover:shadow-lg transition-shadow">
              <p className="text-sm text-red-700 font-semibold uppercase tracking-wide mb-2">Rows Removed</p>
              <p className="text-4xl font-bold text-red-900">
                {(job.stats?.rowsRemoved || 0).toLocaleString()}
              </p>
              <p className="text-xs text-red-600 mt-1">Duplicates/outliers</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 hover:shadow-lg transition-shadow">
              <p className="text-sm text-purple-700 font-semibold uppercase tracking-wide mb-2">Removal Rate</p>
              <p className="text-4xl font-bold text-purple-900">
                {job.stats?.removalPercentage || 0}%
              </p>
              <p className="text-xs text-purple-600 mt-1">Data reduction</p>
            </div>
          </div>
        </div>

        {/* Pipeline Stages */}
        <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-xl">🔧</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Pipeline Stages - Detailed Results</h2>
          </div>
          <div className="space-y-8">
            {/* Imputation Section */}
            {job.stats?.stages?.imputation && (
              <div className="border-2 border-blue-300 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">1</div>
                  <h3 className="text-xl font-bold text-gray-900">Missing Value Imputation</h3>
                </div>
                
                <div className="bg-white rounded-xl p-5 mb-5 shadow-md border border-blue-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div className="p-3">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Total Missing</p>
                      <p className="text-3xl font-bold text-red-600">{job.stats.stages.imputation.totalMissing || 0}</p>
                      <p className="text-xs text-gray-400 mt-1">values</p>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Columns Affected</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {Object.keys(job.stats.stages.imputation.byColumn || {}).length}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">columns</p>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Total Imputed</p>
                      <p className="text-3xl font-bold text-green-600">
                        {Object.values(job.stats.stages.imputation.byColumn || {}).reduce((sum: number, stat: any) => 
                          sum + (stat.missingBefore - stat.missingAfter), 0
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">filled</p>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Success Rate</p>
                      <p className="text-3xl font-bold text-green-600">
                        {job.stats.stages.imputation.totalMissing > 0 
                          ? Math.round((1 - (Object.values(job.stats.stages.imputation.byColumn || {}).reduce((sum: number, stat: any) => 
                              sum + stat.missingAfter, 0) / job.stats.stages.imputation.totalMissing)) * 100)
                          : 0}%
                      </p>
                      <p className="text-xs text-gray-400 mt-1">complete</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-bold text-gray-800 mb-3 flex items-center">
                    <span className="text-lg mr-2">📊</span>
                    Imputation Details by Column:
                  </p>
                  {Object.entries(job.stats.stages.imputation.byColumn || {}).map(([col, stats]: [string, any]) => (
                    <div key={col} className="bg-white rounded-xl p-5 border-2 border-gray-200 hover:shadow-2xl hover:border-blue-300 transition-all duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-lg mb-3">{col}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold rounded-full shadow">
                              Strategy: {stats.strategy.toUpperCase()}
                            </span>
                            {stats.fillValue !== null && stats.fillValue !== 'forward-fill' && (
                              <span className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-bold rounded-full shadow">
                                Fill Value: {typeof stats.fillValue === 'number' 
                                  ? stats.fillValue.toFixed(2) 
                                  : stats.fillValue}
                              </span>
                            )}
                            <span className={`px-3 py-1.5 text-xs font-bold rounded-full shadow ${
                              stats.missingAfter === 0 
                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                                : 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900'
                            }`}>
                              {stats.missingAfter === 0 ? '✓ 100% Complete' : `${stats.missingAfter} still missing`}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
                          <p className="text-4xl font-bold text-green-700">
                            {stats.missingBefore - stats.missingAfter}
                          </p>
                          <p className="text-xs text-green-600 font-semibold uppercase tracking-wide">values filled</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 space-y-3 border border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 font-medium flex items-center">
                            <span className="mr-2">📉</span> Missing before:
                          </span>
                          <span className="font-bold text-red-600 text-lg">{stats.missingBefore} rows</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 font-medium flex items-center">
                            <span className="mr-2">📈</span> Missing after:
                          </span>
                          <span className="font-bold text-green-600 text-lg">{stats.missingAfter} rows</span>
                        </div>
                        <div className="flex items-center justify-between text-sm border-t border-gray-300 pt-3">
                          <span className="text-gray-700 font-medium flex items-center">
                            <span className="mr-2">✨</span> Success rate:
                          </span>
                          <span className="font-bold text-blue-600 text-lg">
                            {stats.missingBefore > 0 
                              ? Math.round(((stats.missingBefore - stats.missingAfter) / stats.missingBefore) * 100)
                              : 0}%
                          </span>
                        </div>
                      </div>

                      {stats.strategy === 'median' && (
                        <div className="text-sm text-gray-700 mt-4 bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border-l-4 border-blue-500 shadow-md">
                          <p className="font-bold mb-2 flex items-center text-blue-900">
                            <span className="text-xl mr-2">🔢</span> MEDIAN Imputation:
                          </p>
                          <p className="leading-relaxed">Filled missing numeric values with the <strong>median (middle value)</strong> of {stats.fillValue !== null ? stats.fillValue.toFixed(2) : 'N/A'}.</p>
                          <p className="mt-2 text-blue-600 text-xs">✓ Median is resistant to outliers, providing a robust central tendency measure.</p>
                        </div>
                      )}
                      {stats.strategy === 'mode' && (
                        <div className="text-sm text-gray-700 mt-4 bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border-l-4 border-purple-500 shadow-md">
                          <p className="font-bold mb-2 flex items-center text-purple-900">
                            <span className="text-xl mr-2">📊</span> MODE Imputation:
                          </p>
                          <p className="leading-relaxed">Filled missing values with the <strong>mode (most frequent value)</strong>: <strong className="text-purple-700">"{stats.fillValue}"</strong>.</p>
                          <p className="mt-2 text-purple-600 text-xs">✓ Mode preserves the distribution shape for categorical data.</p>
                        </div>
                      )}
                      {stats.strategy === 'forward-fill' && (
                        <div className="text-sm text-gray-700 mt-4 bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border-l-4 border-green-500 shadow-md">
                          <p className="font-bold mb-2 flex items-center text-green-900">
                            <span className="text-xl mr-2">⏩</span> FORWARD-FILL Imputation:
                          </p>
                          <p className="leading-relaxed">Filled missing values by <strong>carrying forward the previous non-null value</strong> in the sequence.</p>
                          <p className="mt-2 text-green-600 text-xs">✓ Forward-fill maintains temporal continuity for time-series data.</p>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-100 border-2 border-blue-300 rounded-xl shadow-lg">
                    <p className="text-sm font-bold text-blue-900 mb-3 flex items-center">
                      <span className="text-xl mr-2">📚</span>
                      Available Imputation Methods (3 strategies):
                    </p>
                    <div className="text-sm text-blue-800 space-y-2 ml-7">
                      <p className="flex items-start"><strong className="mr-2">1. MEDIAN:</strong> <span>For numeric columns - uses middle value (robust to outliers)</span></p>
                      <p className="flex items-start"><strong className="mr-2">2. MODE:</strong> <span>For categorical columns - uses most frequent value</span></p>
                      <p className="flex items-start"><strong className="mr-2">3. FORWARD-FILL:</strong> <span>For date/time-series columns - carries previous value forward</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Outlier Detection Section */}
            {job.stats?.stages?.outliers && (
              <div className="border-2 border-orange-300 rounded-xl p-6 bg-gradient-to-br from-orange-50 to-red-50 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md">2</div>
                  <h3 className="text-xl font-bold text-gray-900">Outlier Detection</h3>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Total Outliers</p>
                      <p className="text-2xl font-bold text-orange-600">{job.stats.stages.outliers.totalOutliers || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Columns Checked</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {Object.keys(job.stats.stages.outliers.byColumn || {}).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Action Taken</p>
                      <p className="text-sm font-bold text-gray-700 mt-1">
                        {job.stats.stages.outliers.removedCount > 0 ? '🗑️ Removed' : '🏷️ Flagged'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Rows Affected</p>
                      <p className="text-2xl font-bold text-red-600">
                        {job.stats.stages.outliers.removedCount || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">📊 Outlier Details by Column:</p>
                  {Object.entries(job.stats.stages.outliers.byColumn || {}).map(([col, stats]: [string, any]) => (
                    <div key={col} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 text-base">{col}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                              Method: {stats.method || 'IQR'}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              Threshold: {stats.threshold || 1.5}× IQR
                            </span>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                              🏷️ Flagged (not removed)
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-3xl font-bold text-orange-600">{stats.count}</p>
                          <p className="text-xs text-gray-500">outliers found</p>
                        </div>
                      </div>

                      {/* IQR Calculation Display */}
                      {stats.q1 !== null && stats.q3 !== null && (
                        <div className="mt-3 bg-gray-50 rounded p-3 space-y-2">
                          <p className="text-xs font-semibold text-gray-700 mb-2">📐 IQR Calculation:</p>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Q1 (25th percentile):</span>
                              <span className="font-semibold text-blue-600">{stats.q1}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Q3 (75th percentile):</span>
                              <span className="font-semibold text-blue-600">{stats.q3}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">IQR (Q3 - Q1):</span>
                              <span className="font-semibold text-purple-600">{stats.iqr}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Threshold:</span>
                              <span className="font-semibold text-gray-700">{stats.threshold}×</span>
                            </div>
                          </div>
                          <div className="border-t pt-2 mt-2">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Lower Bound:</span>
                                <span className="font-semibold text-red-600">{stats.lowerBound}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Upper Bound:</span>
                                <span className="font-semibold text-red-600">{stats.upperBound}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-2 italic">
                            Values below {stats.lowerBound} or above {stats.upperBound} are flagged as outliers
                          </div>
                        </div>
                      )}

                      {stats.indices && stats.indices.length > 0 && (
                        <div className="mt-3 text-sm bg-yellow-50 border border-yellow-200 rounded p-3">
                          <p className="text-gray-700 font-semibold mb-2">🔍 Affected Row Indices:</p>
                          <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                            {stats.indices.slice(0, 30).join(', ')}
                            {stats.indices.length > 30 && ` ... and ${stats.indices.length - 30} more rows`}
                          </p>
                          <p className="text-xs text-yellow-700 mt-2">
                            ⚠️ These {stats.count} row{stats.count > 1 ? 's were' : ' was'} flagged for review but preserved in the dataset.
                          </p>
                        </div>
                      )}

                      <div className="text-xs text-gray-600 mt-3 bg-orange-50 p-2 rounded border-l-4 border-orange-400">
                        <p className="font-semibold mb-1">📊 IQR (Interquartile Range) Method:</p>
                        <p>Formula: Lower Bound = Q1 - (1.5 × IQR) | Upper Bound = Q3 + (1.5 × IQR)</p>
                        <p className="mt-1 text-gray-500">✓ Industry-standard method covering ~99.3% of normal data. Outliers are <strong>flagged, not removed</strong>.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deduplication Section */}
            {job.stats?.stages?.deduplication && (
              <div className="border-2 border-purple-200 rounded-lg p-5 bg-purple-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <h3 className="text-lg font-bold text-gray-800">Deduplication</h3>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Original Rows</p>
                      <p className="text-2xl font-bold text-gray-700">
                        {job.stats.stages.deduplication.originalCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Duplicates Found</p>
                      <p className="text-2xl font-bold text-red-600">
                        {job.stats.stages.deduplication.duplicateCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Unique Rows</p>
                      <p className="text-2xl font-bold text-green-600">
                        {job.stats.stages.deduplication.uniqueCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Dedup Rate</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {job.stats.stages.deduplication.originalCount > 0
                          ? ((job.stats.stages.deduplication.duplicateCount / job.stats.stages.deduplication.originalCount) * 100).toFixed(2)
                          : 0}%
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">🔍 Deduplication Method:</p>
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <p className="text-gray-700">
                        <span className="font-medium">SHA-256 Hash Comparison</span> - 
                        Each row is converted to a unique hash value for exact duplicate detection
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        ℹ️ Duplicates are identified by comparing all column values. Only the first occurrence is kept.
                      </p>
                    </div>
                  </div>

                  {job.stats.stages.deduplication.duplicateCount > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <span className="font-semibold">⚠️ Note:</span> {job.stats.stages.deduplication.duplicateCount} duplicate 
                        row{job.stats.stages.deduplication.duplicateCount > 1 ? 's were' : ' was'} removed from the dataset.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Standardization Section */}
            {job.stats?.stages?.standardization && Object.keys(job.stats.stages.standardization.byColumn || {}).length > 0 && (
              <div className="border-2 border-green-200 rounded-lg p-5 bg-green-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">4</div>
                  <h3 className="text-lg font-bold text-gray-800">Data Standardization</h3>
                </div>

                <div className="bg-white rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Columns Standardized</p>
                      <p className="text-2xl font-bold text-green-600">
                        {Object.keys(job.stats.stages.standardization.byColumn || {}).length}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Total Changes</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {Object.values(job.stats.stages.standardization.byColumn || {}).reduce((sum: number, stat: any) => 
                          sum + (stat.standardizedCount || 0), 0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Errors</p>
                      <p className="text-2xl font-bold text-red-600">
                        {Object.values(job.stats.stages.standardization.byColumn || {}).reduce((sum: number, stat: any) => 
                          sum + (stat.errorCount || 0), 0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Success Rate</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(() => {
                          const total = Object.values(job.stats.stages.standardization.byColumn || {}).reduce((sum: number, stat: any) => 
                            sum + (stat.standardizedCount || 0) + (stat.errorCount || 0), 0
                          );
                          const success = Object.values(job.stats.stages.standardization.byColumn || {}).reduce((sum: number, stat: any) => 
                            sum + (stat.standardizedCount || 0), 0
                          );
                          return total > 0 ? Math.round((success / total) * 100) : 0;
                        })()}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700 mb-2">📊 Standardization Details by Column:</p>
                  {Object.entries(job.stats.stages.standardization.byColumn || {}).map(([col, stats]: [string, any]) => (
                    <div key={col} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 text-base">{col}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                              Type: {stats.type}
                            </span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              Format: {stats.format || 'default'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">{stats.standardizedCount}</p>
                          <p className="text-xs text-gray-500">standardized</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">✅ Successful:</p>
                          <p className="font-medium text-green-600">{stats.standardizedCount} values</p>
                        </div>
                        <div>
                          <p className="text-gray-600">❌ Errors:</p>
                          <p className="font-medium text-red-600">{stats.errorCount} values</p>
                        </div>
                      </div>
                      {stats.type === 'phone' && (
                        <p className="text-xs text-gray-500 mt-2">
                          ℹ️ Phone numbers standardized to {stats.format || 'E164'} format
                        </p>
                      )}
                      {stats.type === 'email' && (
                        <p className="text-xs text-gray-500 mt-2">
                          ℹ️ Email addresses converted to lowercase and validated
                        </p>
                      )}
                      {stats.type === 'date' && (
                        <p className="text-xs text-gray-500 mt-2">
                          ℹ️ Dates standardized to {stats.format || 'ISO8601'} format
                        </p>
                      )}
                      {stats.type === 'currency' && (
                        <p className="text-xs text-gray-500 mt-2">
                          ℹ️ Currency values standardized to {stats.format || 'NUMBER'} format
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Operation Logs */}
        <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-700 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-xl">📋</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Operation Log</h2>
          </div>
          <div className="space-y-3">
            {logs && logs.length > 0 ? (
              logs.map((log: any, index: number) => (
                <div key={index} className="border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-white pl-5 py-4 rounded-r-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-800 text-base">{log.operation}</span>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-mono">{log.duration}ms</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Status: <span className={`font-semibold ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {log.status === 'success' ? '✓ ' : '✗ '}{log.status}
                    </span>
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No operation logs available</p>
            )}
          </div>
        </div>

        {/* Continue to Domain Detection */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl shadow-xl p-8 border-2 border-purple-200">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-xl">🎯</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Next Step: Domain Detection</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Your data has been cleaned successfully! Continue to automatically detect your business domain 
            and unlock domain-specific KPI insights.
          </p>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => navigate(`/domain/${job.id}`)}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg hover:from-purple-700 hover:to-indigo-800 inline-flex items-center font-bold shadow-lg hover:shadow-xl transition-all text-lg"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Continue to Domain Detection
            </button>
            
            {/* Optional: Keep download as secondary action */}
            <div className="flex gap-2">
              <a
                href={cleaningApi.getDownloadUrl(job.id, 'csv')}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 inline-flex items-center text-sm font-medium transition-all"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV
              </a>
              <a
                href={cleaningApi.getDownloadUrl(job.id, 'json')}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 inline-flex items-center text-sm font-medium transition-all"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                JSON
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
