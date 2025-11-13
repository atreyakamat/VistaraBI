import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cleaningApi, CleaningConfig } from '../services/cleaningApi';
import { uploadApi } from '../services/uploadApi';

export default function CleaningConfigPage() {
  const { uploadId } = useParams<{ uploadId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [autoConfigLoading, setAutoConfigLoading] = useState(false);
  const [cleaningLoading, setCleaningLoading] = useState(false);
  const [uploadData, setUploadData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectionLog, setDetectionLog] = useState<any[]>([]); // NEW: Store detection reasoning
  
  const [config, setConfig] = useState<CleaningConfig>({
    imputation: {},
    outliers: { enabled: true, threshold: 1.5, remove: false },
    deduplication: { enabled: true, keyColumns: [] },
    standardization: {}
  });

  const [imputationColumn, setImputationColumn] = useState('');
  const [imputationStrategy, setImputationStrategy] = useState<'median' | 'mode' | 'forward-fill'>('median');
  
  const [standardizationColumn, setStandardizationColumn] = useState('');
  const [standardizationType, setStandardizationType] = useState<'phone' | 'email' | 'date' | 'currency'>('phone');
  const [standardizationFormat, setStandardizationFormat] = useState('E164');

  useEffect(() => {
    if (uploadId) {
      loadUploadData();
      // Auto-run configuration analysis on page load
      handleAutoConfig();
    }
  }, [uploadId]);

  const loadUploadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await uploadApi.getUploadData(uploadId!, 1, 10);
      setUploadData(result);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load upload data');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoConfig = async () => {
    setAutoConfigLoading(true);
    setError(null);
    try {
      const result = await cleaningApi.autoConfig(uploadId!);
      setConfig(result);
      // Store detection log for transparency
      if (result.detectionLog) {
        setDetectionLog(result.detectionLog);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to auto-configure');
    } finally {
      setAutoConfigLoading(false);
    }
  };

  const handleAddImputation = () => {
    if (!imputationColumn) return;
    setConfig({
      ...config,
      imputation: {
        ...config.imputation,
        [imputationColumn]: imputationStrategy
      }
    });
    setImputationColumn('');
  };

  const handleRemoveImputation = (column: string) => {
    const newImputation = { ...config.imputation };
    delete newImputation[column];
    setConfig({ ...config, imputation: newImputation });
  };

  const handleAddStandardization = () => {
    if (!standardizationColumn) return;
    setConfig({
      ...config,
      standardization: {
        ...config.standardization,
        [standardizationColumn]: {
          type: standardizationType,
          format: standardizationFormat
        }
      }
    });
    setStandardizationColumn('');
  };

  const handleRemoveStandardization = (column: string) => {
    const newStandardization = { ...config.standardization };
    delete newStandardization[column];
    setConfig({ ...config, standardization: newStandardization });
  };

  const handleStartCleaning = async () => {
    console.log('🧹 Starting cleaning with config:', config);
    setCleaningLoading(true);
    setError(null);
    try {
      const result = await cleaningApi.startCleaning(uploadId!, config);
      console.log('✅ Cleaning job started:', result);
      console.log('   Job ID:', result.id || result.jobId);
      console.log('   Status:', result.status);
      
      // Navigate to the data view page with cleaning panel or directly to report
      const jobId = result.id || result.jobId;
      console.log('🔄 Navigating to report page:', `/cleaning/${jobId}/report`);
      navigate(`/cleaning/${jobId}/report`);
    } catch (err: any) {
      console.error('❌ Cleaning failed:', err);
      setError(err.response?.data?.error || err.message || 'Failed to start cleaning');
      setCleaningLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading upload data...</p>
        </div>
      </div>
    );
  }

  if (error && !uploadData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Failed to Load Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Upload
          </button>
        </div>
      </div>
    );
  }

  const columns = uploadData?.upload?.headers || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/upload')}
            className="text-sm text-blue-600 hover:text-blue-700 mb-2 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Upload
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Configure Data Cleaning</h1>
          <p className="mt-2 text-sm text-gray-600">
            {uploadData?.upload?.originalName} • {uploadData?.pagination?.totalRows || 0} rows • {columns.length} columns
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration Options */}
          <div className="lg:col-span-2 space-y-6">
            {/* Auto-Configure */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Start</h2>
              <p className="text-sm text-gray-600 mb-4">
                Let the system analyze your data and suggest optimal cleaning strategies automatically.
              </p>
              <button
                onClick={handleAutoConfig}
                disabled={autoConfigLoading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {autoConfigLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing Data...
                  </span>
                ) : (
                  '✨ Auto-Configure Cleaning'
                )}
              </button>
            </div>

            {/* Detection Reasoning - Show what the AI detected */}
            {detectionLog.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg border-2 border-indigo-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h2 className="text-xl font-bold text-indigo-900">🤖 Auto-Detection Results</h2>
                </div>
                <p className="text-sm text-indigo-700 mb-4 font-medium">
                  The system analyzed your data and detected the following patterns. You can review and modify the configuration below.
                </p>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {detectionLog.map((log, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{log.column}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              log.dataType === 'numeric' ? 'bg-blue-100 text-blue-700' :
                              log.dataType === 'date' ? 'bg-green-100 text-green-700' :
                              log.dataType === 'phone' ? 'bg-purple-100 text-purple-700' :
                              log.dataType === 'email' ? 'bg-pink-100 text-pink-700' :
                              log.dataType === 'categorical' ? 'bg-yellow-100 text-yellow-700' :
                              log.dataType === 'boolean' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {log.dataType.toUpperCase()}
                            </span>
                            {log.recommendedImputation && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                Strategy: {log.recommendedImputation.toUpperCase()}
                              </span>
                            )}
                          </div>
                          
                          {log.missingCount !== undefined && log.missingCount > 0 && (
                            <p className="text-xs text-orange-600 mt-1">
                              ⚠️ {log.missingCount} missing values ({(log.missingRatio * 100).toFixed(1)}%)
                            </p>
                          )}
                          
                          {log.reasoning && (
                            <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                              {log.reasoning}
                            </p>
                          )}
                          
                          {log.sampleValues && log.sampleValues.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Sample values:</p>
                              <p className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded">
                                {log.sampleValues.slice(0, 5).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-indigo-100 rounded-lg border border-indigo-200">
                  <p className="text-xs text-indigo-800 font-medium">
                    ✨ <strong>Transparency Note:</strong> All configurations are based on statistical analysis of your data. 
                    You can review and modify any suggested strategy in the sections below.
                  </p>
                </div>
              </div>
            )}

            {/* Imputation */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Missing Value Imputation</h2>
              <p className="text-sm text-gray-600 mb-4">
                Fill missing values using statistical methods (median for numbers, mode for categories, forward-fill for time series).
              </p>
              
              <div className="flex gap-2 mb-4">
                <select
                  value={imputationColumn}
                  onChange={(e) => setImputationColumn(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select column...</option>
                  {columns.map((col: string) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <select
                  value={imputationStrategy}
                  onChange={(e) => setImputationStrategy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="median">Median</option>
                  <option value="mode">Mode</option>
                  <option value="forward-fill">Forward Fill</option>
                </select>
                <button
                  onClick={handleAddImputation}
                  disabled={!imputationColumn}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>

              {Object.keys(config.imputation || {}).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(config.imputation || {}).map(([col, strategy]) => (
                    <div key={col} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-sm">
                        <span className="font-medium">{col}</span>
                        <span className="text-gray-500 ml-2">→ {strategy}</span>
                      </span>
                      <button
                        onClick={() => handleRemoveImputation(col)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outlier Detection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Outlier Detection</h2>
              <p className="text-sm text-gray-600 mb-4">
                Identify and optionally remove statistical outliers using the IQR (Interquartile Range) method.
              </p>
              
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.outliers?.enabled || false}
                    onChange={(e) => setConfig({
                      ...config,
                      outliers: { ...config.outliers, enabled: e.target.checked }
                    })}
                    className="rounded w-5 h-5"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Outlier Detection</span>
                </label>

                {config.outliers?.enabled && (
                  <div className="ml-7 space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">IQR Threshold Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="3"
                        value={config.outliers?.threshold || 1.5}
                        onChange={(e) => setConfig({
                          ...config,
                          outliers: { ...config.outliers, threshold: parseFloat(e.target.value), enabled: true }
                        })}
                        className="px-3 py-2 border border-gray-300 rounded-lg w-32"
                      />
                      <p className="text-xs text-gray-500 mt-1">Higher = less sensitive (1.5 is standard)</p>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.outliers?.remove || false}
                        onChange={(e) => setConfig({
                          ...config,
                          outliers: { ...config.outliers, remove: e.target.checked, enabled: true }
                        })}
                        className="rounded w-4 h-4"
                      />
                      <span className="text-sm text-gray-600">Remove outliers (instead of just flagging)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Deduplication */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Deduplication</h2>
              <p className="text-sm text-gray-600 mb-4">
                Remove duplicate rows based on SHA-256 hash comparison of all columns or specific key columns.
              </p>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.deduplication?.enabled || false}
                  onChange={(e) => setConfig({
                    ...config,
                    deduplication: { ...config.deduplication, enabled: e.target.checked }
                  })}
                  className="rounded w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-700">Enable Deduplication</span>
              </label>
              <p className="text-xs text-gray-500 ml-7 mt-1">
                Compares all columns by default. Use custom key columns for partial matching.
              </p>
            </div>

            {/* Standardization */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Data Standardization</h2>
              <p className="text-sm text-gray-600 mb-4">
                Standardize phone numbers, emails, dates, and currency values to consistent formats.
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-2">
                  <select
                    value={standardizationColumn}
                    onChange={(e) => setStandardizationColumn(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select column...</option>
                    {columns.map((col: string) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  <select
                    value={standardizationType}
                    onChange={(e) => {
                      const type = e.target.value as any;
                      setStandardizationType(type);
                      // Set default format
                      if (type === 'phone') setStandardizationFormat('E164');
                      else if (type === 'date') setStandardizationFormat('ISO8601');
                      else if (type === 'currency') setStandardizationFormat('NUMBER');
                      else setStandardizationFormat('');
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="date">Date</option>
                    <option value="currency">Currency</option>
                  </select>
                  {standardizationType !== 'email' && (
                    <select
                      value={standardizationFormat}
                      onChange={(e) => setStandardizationFormat(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {standardizationType === 'phone' && (
                        <>
                          <option value="E164">E164 (+1234567890)</option>
                          <option value="NATIONAL">National ((123) 456-7890)</option>
                          <option value="DIGITS">Digits Only</option>
                        </>
                      )}
                      {standardizationType === 'date' && (
                        <>
                          <option value="ISO8601">ISO8601 (YYYY-MM-DD)</option>
                          <option value="US">US (MM/DD/YYYY)</option>
                          <option value="UNIX">Unix Timestamp</option>
                        </>
                      )}
                      {standardizationType === 'currency' && (
                        <>
                          <option value="NUMBER">Number (1234.56)</option>
                          <option value="USD">USD ($1,234.56)</option>
                          <option value="EUR">EUR (1.234,56 €)</option>
                        </>
                      )}
                    </select>
                  )}
                  <button
                    onClick={handleAddStandardization}
                    disabled={!standardizationColumn}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>

                {Object.keys(config.standardization || {}).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(config.standardization || {}).map(([col, opts]: [string, any]) => (
                      <div key={col} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm">
                          <span className="font-medium">{col}</span>
                          <span className="text-gray-500 ml-2">→ {opts.type} ({opts.format || 'default'})</span>
                        </span>
                        <button
                          onClick={() => handleRemoveStandardization(col)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            {/* Configuration Summary */}
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuration Summary</h3>
              
              <div className="space-y-3 text-sm mb-6">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-gray-600">Imputation Rules</span>
                  <span className="font-semibold text-blue-600">
                    {Object.keys(config.imputation || {}).length}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-gray-600">Outlier Detection</span>
                  <span className={`font-semibold ${config.outliers?.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {config.outliers?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-gray-600">Deduplication</span>
                  <span className={`font-semibold ${config.deduplication?.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {config.deduplication?.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-gray-600">Standardization Rules</span>
                  <span className="font-semibold text-blue-600">
                    {Object.keys(config.standardization || {}).length}
                  </span>
                </div>
              </div>

              <button
                onClick={handleStartCleaning}
                disabled={cleaningLoading}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
              >
                {cleaningLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Cleaning...
                  </span>
                ) : (
                  '🚀 Start Cleaning Pipeline'
                )}
              </button>

              <div className="mt-4 text-xs text-gray-500 text-center">
                This will create a new cleaned dataset while preserving the original data
              </div>
            </div>

            {/* Data Preview */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Preview</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">File Name</span>
                  <span className="font-medium truncate ml-2">{uploadData?.upload?.originalName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Rows</span>
                  <span className="font-medium">{uploadData?.pagination?.totalRows || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Columns</span>
                  <span className="font-medium">{columns.length}</span>
                </div>
              </div>
              
              <button
                onClick={() => navigate(`/data/${uploadId}`)}
                className="mt-4 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                View Full Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
