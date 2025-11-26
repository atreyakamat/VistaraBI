import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Circle, ChevronDown, ChevronUp, AlertCircle, Info } from 'lucide-react';

interface KpiDefinition {
  kpi_id: string;
  name: string;
  category: string;
  priority: number;
  formula_expr: string;
  columns_needed: string[];
  completeness: number;
  description: string;
  unit: string;
}

interface KpiExtractionResult {
  kpiJobId: number;
  domain: string;
  totalKpisInLibrary: number;
  feasibleCount: number;
  infeasibleCount: number;
  completenessAverage: number;
  top10Kpis: KpiDefinition[];
  allFeasibleKpis: KpiDefinition[];
  unresolvedColumns: string[];
  canonicalMapping: Record<string, string>;
}

const KpiSelectionPage: React.FC = () => {
  const { domainJobId } = useParams<{ domainJobId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpiData, setKpiData] = useState<KpiExtractionResult | null>(null);
  const [selectedKpis, setSelectedKpis] = useState<Set<string>>(new Set());
  const [showAllKpis, setShowAllKpis] = useState(false);
  const [showMapping, setShowMapping] = useState(false);
  
  const cleaningJobId = location.state?.cleaningJobId;

  useEffect(() => {
    const extractKpis = async () => {
      if (!domainJobId || !cleaningJobId) {
        setError('Missing required parameters');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        console.log('Extracting KPIs with:', { cleaningJobId, domainJobId });

        const response = await fetch('http://localhost:5001/api/v1/kpi/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cleaningJobId: cleaningJobId,
            domainJobId: domainJobId,
          }),
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          throw new Error(errorData.error || errorData.message || 'Failed to extract KPIs');
        }

        const result = await response.json();
        console.log('API Response:', result);
        
        const data = result.data || result;
        console.log('KPI Data:', data);
        
        setKpiData(data);
        
        // Pre-select top 10 KPIs
        if (data.top10Kpis && data.top10Kpis.length > 0) {
          const top10Ids = new Set<string>(data.top10Kpis.map((kpi: KpiDefinition) => kpi.kpi_id));
          setSelectedKpis(top10Ids);
          console.log('Auto-selected KPIs:', Array.from(top10Ids));
        }
        
      } catch (err: any) {
        console.error('KPI extraction error:', err);
        setError(err.message || 'Failed to extract KPIs');
      } finally {
        setLoading(false);
      }
    };

    extractKpis();
  }, [domainJobId, cleaningJobId]);

  const toggleKpiSelection = (kpiId: string) => {
    const newSelection = new Set(selectedKpis);
    if (newSelection.has(kpiId)) {
      newSelection.delete(kpiId);
    } else {
      newSelection.add(kpiId);
    }
    setSelectedKpis(newSelection);
  };

  const handleConfirm = async () => {
    if (selectedKpis.size === 0) {
      setError('Please select at least one KPI');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('http://localhost:5001/api/v1/kpi/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kpiJobId: kpiData!.kpiJobId,
          selectedKpiIds: Array.from(selectedKpis),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save KPI selection');
      }

      const selectionResult = await response.json();
      console.log('KPI selection saved:', selectionResult);

      // Generate dashboard with selected KPIs
      console.log('Generating dashboard...');
      const dashboardResponse = await fetch('http://localhost:5001/api/dashboard/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetId: cleaningJobId, // Using cleaning job ID as dataset ID
          options: {
            kpiJobId: kpiData!.kpiJobId,
            selectedKpiIds: Array.from(selectedKpis),
            domainJobId: domainJobId,
          },
        }),
      });

      if (!dashboardResponse.ok) {
        const errorData = await dashboardResponse.json();
        throw new Error(errorData.error || 'Failed to generate dashboard');
      }

      const dashboardResult = await dashboardResponse.json();
      console.log('Dashboard generated:', dashboardResult);

      // Navigate to Module 5 (Dashboard View)
      // Use cleaningJobId (not generated dashboard ID) for GET /api/dashboard/:datasetId
      navigate(`/dashboard/${cleaningJobId}`, {
        state: {
          kpiJobId: kpiData!.kpiJobId,
          cleaningJobId: cleaningJobId,
          domainJobId: domainJobId,
          selectedKpiIds: Array.from(selectedKpis),
          dashboardId: dashboardResult.data?.id, // Store generated ID in state
        }
      });
      
    } catch (err: any) {
      console.error('KPI selection/dashboard generation error:', err);
      setError(err.message || 'Failed to save KPI selection and generate dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (priority: number) => {
    const colors = {
      5: 'bg-red-100 text-red-800 border-red-300',
      4: 'bg-orange-100 text-orange-800 border-orange-300',
      3: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    };
    const labels = {
      5: 'Critical',
      4: 'High',
      3: 'Medium',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
        Priority {priority} - {labels[priority as keyof typeof labels] || 'Low'}
      </span>
    );
  };

  const getCompletenessBadge = (completeness: number) => {
    const percentage = Math.round(completeness * 100);
    let color = 'bg-green-100 text-green-800 border-green-300';
    if (percentage < 90) color = 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (percentage < 70) color = 'bg-orange-100 text-orange-800 border-orange-300';
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${color}`}>
        {percentage}% Complete
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Extracting KPIs from your data...</p>
        </div>
      </div>
    );
  }

  if (error && !kpiData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
          <div className="flex items-center text-red-600 mb-4">
            <AlertCircle className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-semibold">Error</h2>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!kpiData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            KPI Selection - {kpiData.domain.charAt(0).toUpperCase() + kpiData.domain.slice(1)}
          </h1>
          <p className="text-gray-600 mt-1">
            Select the KPIs you want to track in your dashboard
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total KPIs in Library</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{kpiData.totalKpisInLibrary}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Feasible KPIs</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{kpiData.feasibleCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Average Completeness</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {Math.round(kpiData.completenessAverage * 100)}%
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Selected KPIs</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{selectedKpis.size}</div>
          </div>
        </div>

        {/* Unresolved Columns Warning */}
        {kpiData.unresolvedColumns.length > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Unresolved Columns</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  The following columns couldn't be matched to any KPI requirements:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {kpiData.unresolvedColumns.map((col) => (
                    <span key={col} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded border border-yellow-300">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top 10 Recommended KPIs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Top 10 Recommended KPIs
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Based on data completeness and business priority
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {kpiData.top10Kpis.map((kpi, index) => (
              <div
                key={kpi.kpi_id}
                className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedKpis.has(kpi.kpi_id) ? 'bg-blue-50' : ''
                }`}
                onClick={() => toggleKpiSelection(kpi.kpi_id)}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    {selectedKpis.has(kpi.kpi_id) ? (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                        <h3 className="text-sm font-medium text-gray-900">{kpi.name}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getPriorityBadge(kpi.priority)}
                        {getCompletenessBadge(kpi.completeness)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{kpi.description}</p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <span className="font-medium mr-1">Category:</span>
                        {kpi.category}
                      </span>
                      <span className="flex items-center">
                        <span className="font-medium mr-1">Formula:</span>
                        <code className="bg-gray-100 px-2 py-0.5 rounded">{kpi.formula_expr}</code>
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      <span className="font-medium">Required columns:</span>{' '}
                      {kpi.columns_needed.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Feasible KPIs (Expandable) */}
        {kpiData.allFeasibleKpis.length > kpiData.top10Kpis.length && (
          <div className="bg-white rounded-lg shadow mb-6">
            <button
              onClick={() => setShowAllKpis(!showAllKpis)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div>
                <h2 className="text-lg font-semibold text-gray-900 text-left">
                  All Feasible KPIs ({kpiData.allFeasibleKpis.length})
                </h2>
                <p className="text-sm text-gray-600 mt-1 text-left">
                  View all KPIs that can be calculated from your data
                </p>
              </div>
              {showAllKpis ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {showAllKpis && (
              <div className="border-t border-gray-200 divide-y divide-gray-200">
                {kpiData.allFeasibleKpis.map((kpi) => (
                  <div
                    key={kpi.kpi_id}
                    className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedKpis.has(kpi.kpi_id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => toggleKpiSelection(kpi.kpi_id)}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        {selectedKpis.has(kpi.kpi_id) ? (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900">{kpi.name}</h3>
                          <div className="flex items-center space-x-2">
                            {getPriorityBadge(kpi.priority)}
                            {getCompletenessBadge(kpi.completeness)}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{kpi.description}</p>
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <span>Category: {kpi.category}</span>
                          <span>Formula: <code className="bg-gray-100 px-2 py-0.5 rounded">{kpi.formula_expr}</code></span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Column Mapping (Expandable) */}
        <div className="bg-white rounded-lg shadow mb-6">
          <button
            onClick={() => setShowMapping(!showMapping)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div>
              <h2 className="text-lg font-semibold text-gray-900 text-left">
                Column Mapping
              </h2>
              <p className="text-sm text-gray-600 mt-1 text-left">
                See how your columns map to KPI requirements
              </p>
            </div>
            {showMapping ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {showMapping && (
            <div className="border-t border-gray-200 px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(kpiData.canonicalMapping).map(([canonical, userColumn]) => (
                  <div key={canonical} className="flex items-center space-x-2 text-sm">
                    <span className="font-medium text-gray-700">{canonical}</span>
                    <span className="text-gray-400">←</span>
                    <span className="text-gray-600">{userColumn}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || selectedKpis.size === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Dashboard...
              </>
            ) : (
              <>
                Generate Dashboard ({selectedKpis.size} KPI{selectedKpis.size !== 1 ? 's' : ''}) →
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KpiSelectionPage;
