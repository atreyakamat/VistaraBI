import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './ProjectKpiSelectionPage.css';

interface KPI {
  id: string;
  name: string;
  formula: string;
  category: string;
  priority: number;
  completeness: number;
  feasible: boolean;
}

const ProjectKpiSelectionPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [selectedKpis, setSelectedKpis] = useState<Set<string>>(new Set());
  const [kpiJobId, setKpiJobId] = useState<string | null>(null);
  const [domainJobId, setDomainJobId] = useState<string | null>(null);
  const [cleaningJobIds, setCleaningJobIds] = useState<string[]>([]);
  const [domain, setDomain] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [showManualKpi, setShowManualKpi] = useState(false);
  const [manualKpis, setManualKpis] = useState<Array<{id: string, name: string, column: string}>>([]);
  const [loadingColumns, setLoadingColumns] = useState(true);

  useEffect(() => {
    const state = location.state as any;
    if (state?.domainJobId && state?.cleaningJobIds) {
      setDomainJobId(state.domainJobId);
      setCleaningJobIds(state.cleaningJobIds);
      setDomain(state.domain || '');
      loadProjectColumns();
      extractKpis(state.domainJobId, state.cleaningJobIds[0]);
    } else {
      alert('Missing domain information');
      navigate(`/project/${projectId}/domain`);
    }
  }, [projectId]);

  const loadProjectColumns = async () => {
    setLoadingColumns(true);
    try {
      const response = await axios.get(`/api/projects/${projectId}/columns`);
      if (response.data.success) {
        const columns = response.data.data.allColumns || [];
        setAvailableColumns(columns);
        console.log('Loaded columns:', columns);
      }
    } catch (error) {
      console.error('Failed to load columns:', error);
      // Fallback: try to get from project data
      try {
        const projectResponse = await axios.get(`/api/projects/${projectId}`);
        if (projectResponse.data.success && projectResponse.data.data.uploads?.length > 0) {
          // Try to infer columns from upload metadata if available
          console.log('No columns endpoint, trying project data');
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    } finally {
      setLoadingColumns(false);
    }
  };

  const extractKpis = async (domJobId: string, cleanJobId: string) => {
    try {
      const response = await axios.post('/api/v1/kpi/extract', {
        domainJobId: domJobId,
        cleaningJobId: cleanJobId
      });

      if (response.data.success) {
        const data = response.data.data;
        setKpiJobId(data.kpiJobId);
        setKpis(data.feasibleKpis || []);
        
        // Auto-select top 10 KPIs
        const top10 = data.top10Kpis?.map((kpi: any) => kpi.id) || [];
        setSelectedKpis(new Set(top10));
      }
    } catch (error: any) {
      console.error('KPI extraction failed:', error);
      alert(error.response?.data?.error || 'KPI extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleKpi = (kpiId: string) => {
    const newSelected = new Set(selectedKpis);
    if (newSelected.has(kpiId)) {
      newSelected.delete(kpiId);
    } else {
      newSelected.add(kpiId);
    }
    setSelectedKpis(newSelected);
  };

  const addManualKpi = () => {
    const newKpi = {
      id: `manual_${Date.now()}`,
      name: '',
      column: availableColumns[0] || ''
    };
    setManualKpis([...manualKpis, newKpi]);
  };

  const updateManualKpi = (id: string, field: string, value: string) => {
    setManualKpis(manualKpis.map(kpi => 
      kpi.id === id ? { ...kpi, [field]: value } : kpi
    ));
  };

  const removeManualKpi = (id: string) => {
    setManualKpis(manualKpis.filter(kpi => kpi.id !== id));
  };

  const generateDashboard = async () => {
    if (selectedKpis.size === 0 && manualKpis.length === 0) {
      alert('Please select at least one KPI or create a manual KPI');
      return;
    }

    // Validate manual KPIs
    const invalidKpis = manualKpis.filter(kpi => !kpi.name || !kpi.column);
    if (invalidKpis.length > 0) {
      alert('Please fill in all manual KPI fields (name and column)');
      return;
    }

    setGenerating(true);

    try {
      // Combine auto KPIs and manual KPIs
      const allKpisToSave = [
        ...Array.from(selectedKpis),
        ...manualKpis.map(kpi => kpi.id)
      ];

      // Save selected KPIs
      await axios.post('/api/v1/kpi/select', {
        kpiJobId,
        selectedKpiIds: allKpisToSave,
        manualKpis: manualKpis
      });

      // Generate dashboard with both auto and manual KPIs
      console.log('Generating dashboard with:', {
        datasetId: cleaningJobIds[0],
        kpiJobId,
        selectedKpiIds: allKpisToSave,
        manualKpis: manualKpis,
        domainJobId,
        selectedKpisCount: selectedKpis.size,
        manualKpisCount: manualKpis.length
      });
      
      const dashboardResponse = await axios.post('/api/dashboard/generate', {
        datasetId: cleaningJobIds[0], // Use first cleaning job
        kpiJobId,
        selectedKpiIds: allKpisToSave,
        manualKpis: manualKpis,
        domainJobId
      });

      if (dashboardResponse.data.success) {
        // Navigate to project dashboard view
        navigate(`/project/${projectId}/dashboard`, {
          state: {
            projectId,
            kpiJobId,
            cleaningJobIds,
            domainJobId,
            selectedKpiIds: Array.from(selectedKpis)
          }
        });
      }
    } catch (error: any) {
      console.error('Dashboard generation failed:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.response?.data?.error);
      alert(error.response?.data?.error || error.message || 'Dashboard generation failed');
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="project-kpi-container">
        <div className="loading">Extracting KPIs...</div>
      </div>
    );
  }

  return (
    <div className="project-kpi-container">
      <div className="project-kpi-header">
        <h1>Select KPIs for Dashboard</h1>
        <p>Domain: <strong>{domain.toUpperCase()}</strong></p>
        <p>Selected: <strong>{selectedKpis.size + manualKpis.length}</strong> KPIs ({selectedKpis.size} auto + {manualKpis.length} manual)</p>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowManualKpi(!showManualKpi)}
          >
            {showManualKpi ? 'Hide' : 'Show'} Manual KPI Creation
          </button>
        </div>
      </div>

      {showManualKpi && (
        <div className="manual-kpi-section">
          <div className="manual-kpi-header">
            <h2>Create Custom KPIs</h2>
            <p>Map your dataset columns to create custom metrics</p>
          </div>

          <div className="available-columns">
            <h3>Available Columns:</h3>
            {loadingColumns ? (
              <p className="loading-text">Loading columns...</p>
            ) : availableColumns.length > 0 ? (
              <div className="columns-list">
                {availableColumns.map(col => (
                  <span key={col} className="column-tag">{col}</span>
                ))}
              </div>
            ) : (
              <p className="no-columns-text">No columns available. Please upload data first.</p>
            )}
          </div>

          <div className="manual-kpis-list">
            {manualKpis.map((kpi) => (
              <div key={kpi.id} className="manual-kpi-card">
                <div className="manual-kpi-form">
                  <div className="form-group">
                    <label>KPI Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Total Sales"
                      value={kpi.name}
                      onChange={(e) => updateManualKpi(kpi.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Column</label>
                    <select
                      value={kpi.column}
                      onChange={(e) => updateManualKpi(kpi.id, 'column', e.target.value)}
                    >
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn-remove"
                    onClick={() => removeManualKpi(kpi.id)}
                    title="Remove this KPI"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            <button className="btn btn-outline add-kpi-btn" onClick={addManualKpi} disabled={availableColumns.length === 0}>
              {availableColumns.length === 0 ? 'Loading columns...' : '+ Add Custom KPI'}
            </button>
          </div>
        </div>
      )}

      <div className="auto-kpi-section">
        <h2>Auto-Detected KPIs</h2>
        <p>These KPIs were automatically detected based on your {domain} domain</p>
        
        <div className="kpi-grid">
          {kpis.map((kpi) => (
            <div
              key={kpi.id}
              className={`kpi-card ${selectedKpis.has(kpi.id) ? 'selected' : ''}`}
              onClick={() => toggleKpi(kpi.id)}
            >
              <div className="kpi-header">
                <div className="kpi-checkbox">
                  {selectedKpis.has(kpi.id) ? '✓' : ''}
                </div>
                <div className="kpi-priority">
                  {'⭐'.repeat(kpi.priority)}
                </div>
              </div>
              <h3>{kpi.name}</h3>
              <p className="kpi-formula">{kpi.formula}</p>
              <div className="kpi-footer">
                <span className="kpi-category">{kpi.category}</span>
                <span className="kpi-completeness">{kpi.completeness}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {kpis.length === 0 && (
        <div className="no-kpis">
          <p>No auto-detected KPIs available. Create custom KPIs above to get started.</p>
        </div>
      )}

      <div className="actions">
        <button
          className="btn btn-secondary"
          onClick={() => navigate(`/project/${projectId}/domain`)}
          disabled={generating}
        >
          Back
        </button>
        <button
          className="btn btn-primary btn-large"
          onClick={generateDashboard}
          disabled={generating || (selectedKpis.size === 0 && manualKpis.length === 0)}
        >
          {generating ? 'Generating Dashboard...' : `Generate Dashboard (${selectedKpis.size + manualKpis.length} KPIs)`}
        </button>
      </div>
    </div>
  );
};

export default ProjectKpiSelectionPage;
