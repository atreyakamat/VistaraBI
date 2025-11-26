import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProjectResultsPage.css';

interface Relationship {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  matchRate: number;
  status: string;
  relationshipType: string;
}

interface UnifiedView {
  viewName: string;
  viewQuery: string;
  status: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  domain: string;
  fileCount: number;
  totalRecords: number;
}

const ProjectResultsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [unifiedViews, setUnifiedViews] = useState<UnifiedView[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}`);
      setProject(response.data.data);
      
      // If already processed, load results
      if (response.data.data.status === 'completed') {
        await loadResults();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/results`);
      const data = response.data.data;
      setProject(data.project);
      setRelationships(data.relationships || []);
      setUnifiedViews(data.unifiedViews || []);
    } catch (err: any) {
      console.error('Failed to load results:', err);
    }
  };

  const handleFinalize = async () => {
    try {
      setProcessing(true);
      setError(null);
      
      await axios.post(`/api/projects/${projectId}/finalize`);
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const response = await axios.get(`/api/projects/${projectId}`);
          const status = response.data.data.status;
          
          if (status === 'completed') {
            clearInterval(pollInterval);
            await loadResults();
            setProcessing(false);
          } else if (status === 'failed') {
            clearInterval(pollInterval);
            setError('Processing failed');
            setProcessing(false);
          }
        } catch (err) {
          clearInterval(pollInterval);
          setProcessing(false);
        }
      }, 3000);
      
      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (processing) {
          setProcessing(false);
          setError('Processing timeout - please refresh to check status');
        }
      }, 120000);
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to finalize project');
      setProcessing(false);
    }
  };

  const viewDashboard = () => {
    navigate(`/project/${projectId}/dashboard`);
  };

  if (loading) {
    return (
      <div className="results-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="results-page">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/project/upload')}>Back to Upload</button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-header">
        <div className="header-content">
          <h1>{project?.name}</h1>
          <p className="project-description">{project?.description}</p>
          <div className="project-stats">
            <div className="stat">
              <span className="stat-label">Files</span>
              <span className="stat-value">{project?.fileCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Records</span>
              <span className="stat-value">{project?.totalRecords?.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Domain</span>
              <span className="stat-value">{project?.domain || 'Not detected'}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Status</span>
              <span className={`stat-value status-${project?.status}`}>
                {project?.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {project?.status === 'draft' && (
        <div className="finalize-section">
          <div className="finalize-card">
            <h2>🚀 Ready to Analyze</h2>
            <p>
              Your files have been uploaded successfully. Click the button below to start
              the multi-file intelligence pipeline, which will:
            </p>
            <ul>
              <li>Detect relationships between your tables</li>
              <li>Create unified views with automatic JOINs</li>
              <li>Extract cross-table KPIs</li>
              <li>Generate interactive dashboards</li>
            </ul>
            <button
              className="finalize-button"
              onClick={handleFinalize}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Start Intelligence Pipeline'}
            </button>
            {error && <div className="error-alert">{error}</div>}
          </div>
        </div>
      )}

      {processing && (
        <div className="processing-section">
          <div className="processing-card">
            <div className="spinner"></div>
            <h3>Processing Your Data...</h3>
            <p>This may take a few moments. We're analyzing your data and detecting relationships.</p>
          </div>
        </div>
      )}

      {project?.status === 'completed' && (
        <>
          <div className="results-section">
            <div className="section-header">
              <h2>🔗 Detected Relationships</h2>
              <span className="badge">{relationships.length} found</span>
            </div>
            
            {relationships.length > 0 ? (
              <div className="relationships-grid">
                {relationships.map((rel, index) => (
                  <div key={index} className="relationship-card">
                    <div className="relationship-header">
                      <span className={`badge badge-${rel.status}`}>{rel.status}</span>
                      <span className="match-rate">{rel.matchRate}% match</span>
                    </div>
                    <div className="relationship-body">
                      <div className="table-name">{rel.sourceTable}</div>
                      <div className="column-name">{rel.sourceColumn}</div>
                      <div className="relationship-arrow">→</div>
                      <div className="table-name">{rel.targetTable}</div>
                      <div className="column-name">{rel.targetColumn}</div>
                    </div>
                    <div className="relationship-type">{rel.relationshipType}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No relationships detected between tables.</p>
              </div>
            )}
          </div>

          <div className="results-section">
            <div className="section-header">
              <h2>📊 Unified Views</h2>
              <span className="badge">{unifiedViews.length} created</span>
            </div>
            
            {unifiedViews.length > 0 ? (
              <div className="views-list">
                {unifiedViews.map((view, index) => (
                  <div key={index} className="view-card">
                    <div className="view-header">
                      <h3>{view.viewName}</h3>
                      <span className={`badge badge-${view.status}`}>{view.status}</span>
                    </div>
                    <div className="view-query">
                      <code>{view.viewQuery}</code>
                    </div>
                    <div className="view-footer">
                      <small>Created: {new Date(view.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No unified views created.</p>
              </div>
            )}
          </div>

          <div className="actions-section">
            <button className="primary-button" onClick={viewDashboard}>
              View Dashboard →
            </button>
            <button className="secondary-button" onClick={() => navigate('/project/upload')}>
              Upload New Project
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectResultsPage;
