import { useState } from 'react';
import { cleaningApi, CleaningConfig, CleaningJob } from '../services/cleaningApi';

interface CleaningPanelProps {
  uploadId: string;
  onCleaningComplete?: (jobId: string) => void;
}

export default function CleaningPanel({ uploadId, onCleaningComplete }: CleaningPanelProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [config, setConfig] = useState<CleaningConfig>({
    imputation: {},
    outliers: { enabled: true, threshold: 1.5, remove: false },
    deduplication: { enabled: true, keyColumns: [] },
    standardization: {}
  });
  const [job, setJob] = useState<CleaningJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAutoConfig = async () => {
    setAutoLoading(true);
    setError(null);
    try {
      const autoConfig = await cleaningApi.autoConfig(uploadId);
      setConfig(autoConfig);
      setShowConfig(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to auto-configure');
    } finally {
      setAutoLoading(false);
    }
  };

  const handleStartCleaning = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await cleaningApi.startCleaning(uploadId, config);
      setJob(result);
      if (result.status === 'completed' && onCleaningComplete) {
        onCleaningComplete(result.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to start cleaning');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = () => {
    if (job) {
      window.open(`/cleaning/${job.id}/report`, '_blank');
    }
  };

  const handleDownload = (format: 'json' | 'csv') => {
    if (job) {
      window.open(cleaningApi.getDownloadUrl(job.id, format), '_blank');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Data Cleaning</h2>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {showConfig ? 'Hide Config' : 'Show Config'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={handleAutoConfig}
          disabled={autoLoading || loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {autoLoading ? 'Analyzing...' : 'Auto-Configure'}
        </button>
        <button
          onClick={handleStartCleaning}
          disabled={loading || autoLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Cleaning...' : 'Start Cleaning'}
        </button>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-700 mb-3">Cleaning Configuration</h3>
          
          {/* Imputation */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Imputation</h4>
            <p className="text-xs text-gray-500 mb-2">
              Auto-detected strategies: {Object.keys(config.imputation || {}).length} columns
            </p>
            <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
              <pre>{JSON.stringify(config.imputation, null, 2)}</pre>
            </div>
          </div>

          {/* Outliers */}
          <div className="mb-4">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={config.outliers?.enabled || false}
                onChange={(e) => setConfig({
                  ...config,
                  outliers: { ...config.outliers, enabled: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Outlier Detection</span>
            </label>
            {config.outliers?.enabled && (
              <div className="ml-6 space-y-2">
                <div>
                  <label className="text-xs text-gray-600">IQR Threshold</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.outliers?.threshold || 1.5}
                    onChange={(e) => setConfig({
                      ...config,
                      outliers: { ...config.outliers, threshold: parseFloat(e.target.value), enabled: true }
                    })}
                    className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm w-20"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.outliers?.remove || false}
                    onChange={(e) => setConfig({
                      ...config,
                      outliers: { ...config.outliers, remove: e.target.checked, enabled: true }
                    })}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-600">Remove outliers</span>
                </label>
              </div>
            )}
          </div>

          {/* Deduplication */}
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.deduplication?.enabled || false}
                onChange={(e) => setConfig({
                  ...config,
                  deduplication: { ...config.deduplication, enabled: e.target.checked }
                })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Deduplication</span>
            </label>
          </div>

          {/* Standardization */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-600 mb-2">Standardization</h4>
            <p className="text-xs text-gray-500 mb-2">
              Auto-detected: {Object.keys(config.standardization || {}).length} columns
            </p>
            <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
              <pre>{JSON.stringify(config.standardization, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Job Status */}
      {job && (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Cleaning Job</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              job.status === 'completed' ? 'bg-green-100 text-green-800' :
              job.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {job.status}
            </span>
          </div>

          {job.stats && (
            <div className="bg-gray-50 rounded p-3 mb-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Original Rows:</span>
                  <span className="ml-2 font-medium">{job.stats.original?.totalRows || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Final Rows:</span>
                  <span className="ml-2 font-medium">{job.stats.final?.totalRows || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Rows Removed:</span>
                  <span className="ml-2 font-medium text-red-600">{job.stats.rowsRemoved || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600">Removal Rate:</span>
                  <span className="ml-2 font-medium">{job.stats.removalPercentage || 0}%</span>
                </div>
              </div>
            </div>
          )}

          {job.status === 'completed' && (
            <div className="flex gap-2">
              <button
                onClick={handleViewReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
              >
                View Report
              </button>
              <button
                onClick={() => handleDownload('csv')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm transition-colors"
              >
                Download CSV
              </button>
              <button
                onClick={() => handleDownload('json')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm transition-colors"
              >
                Download JSON
              </button>
            </div>
          )}

          {job.error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {job.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
