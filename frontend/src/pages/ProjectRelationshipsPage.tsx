import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './ProjectRelationshipsPage.css';

interface Relationship {
  id?: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  matchRate: number;
  status: string;
  relationshipType: string;
}

const ProjectRelationshipsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedRelationships, setSelectedRelationships] = useState<Set<number>>(new Set());

  useEffect(() => {
    detectRelationships();
  }, [projectId]);

  const detectRelationships = async () => {
    setDetecting(true);
    setLoading(false);

    try {
      const response = await axios.post(`/api/projects/${projectId}/detect-relationships`);

      if (response.data.success) {
        const rels = response.data.data.relationships || [];
        setRelationships(rels);
        
        // Auto-select valid relationships with high match rates
        const autoSelected = new Set<number>(
          rels
            .map((r: Relationship, idx: number) => ({ r, idx }))
            .filter(({ r }: { r: Relationship; idx: number }) => r.status === 'valid' && r.matchRate >= 80)
            .map(({ idx }: { r: Relationship; idx: number }) => idx)
        );
        setSelectedRelationships(autoSelected);
      }
    } catch (error: any) {
      console.error('Relationship detection failed:', error);
      alert(error.response?.data?.error || 'Failed to detect relationships');
    } finally {
      setDetecting(false);
    }
  };

  const toggleRelationship = (index: number) => {
    const newSelected = new Set(selectedRelationships);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRelationships(newSelected);
  };

  const createUnifiedView = async () => {
    if (selectedRelationships.size === 0) {
      alert('Please select at least one relationship to create unified view');
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`/api/projects/${projectId}/create-unified-view`);

      if (response.data.success) {
        navigate(`/project/${projectId}/kpi`, {
          state: {
            projectId,
            viewName: response.data.data.viewName
          }
        });
      }
    } catch (error: any) {
      console.error('Unified view creation failed:', error);
      alert(error.response?.data?.error || 'Failed to create unified view');
    } finally {
      setLoading(false);
    }
  };

  const skipToKpi = () => {
    navigate(`/project/${projectId}/kpi`, {
      state: { projectId }
    });
  };

  if (loading) {
    return (
      <div className="relationships-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relationships-page">
      <div className="page-header">
        <h1>🔗 Relationship Detection</h1>
        <p>Analyzing connections between your tables</p>
      </div>

      {detecting ? (
        <div className="detecting-state">
          <div className="spinner"></div>
          <h2>Detecting Relationships...</h2>
          <p>Analyzing foreign key patterns and data matches</p>
        </div>
      ) : (
        <>
          {relationships.length > 0 ? (
            <>
              <div className="results-summary">
                <div className="summary-card">
                  <span className="summary-value">{relationships.length}</span>
                  <span className="summary-label">Relationships Found</span>
                </div>
                <div className="summary-card">
                  <span className="summary-value">{selectedRelationships.size}</span>
                  <span className="summary-label">Selected for View</span>
                </div>
                <div className="summary-card">
                  <span className="summary-value">
                    {relationships.filter(r => r.status === 'valid').length}
                  </span>
                  <span className="summary-label">Valid Relationships</span>
                </div>
              </div>

              <div className="relationships-section">
                <h2>Select Relationships to Include</h2>
                <p className="section-desc">
                  Choose which relationships to use for creating the unified view. 
                  Relationships with higher match rates are recommended.
                </p>

                <div className="relationships-grid">
                  {relationships.map((rel, index) => (
                    <div
                      key={index}
                      className={`relationship-card ${rel.status} ${
                        selectedRelationships.has(index) ? 'selected' : ''
                      }`}
                      onClick={() => toggleRelationship(index)}
                    >
                      <div className="card-header">
                        <input
                          type="checkbox"
                          checked={selectedRelationships.has(index)}
                          onChange={() => toggleRelationship(index)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className={`status-badge ${rel.status}`}>
                          {rel.status}
                        </span>
                        <span className="match-rate">
                          {rel.matchRate}% match
                        </span>
                      </div>

                      <div className="card-body">
                        <div className="table-info">
                          <div className="table-name">{rel.sourceTable}</div>
                          <div className="column-name">{rel.sourceColumn}</div>
                        </div>

                        <div className="arrow">
                          <svg width="40" height="40" viewBox="0 0 40 40">
                            <path
                              d="M5 20 L30 20 M30 20 L25 15 M30 20 L25 25"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                            />
                          </svg>
                        </div>

                        <div className="table-info">
                          <div className="table-name">{rel.targetTable}</div>
                          <div className="column-name">{rel.targetColumn}</div>
                        </div>
                      </div>

                      <div className="card-footer">
                        <span className="relationship-type">
                          {rel.relationshipType || 'Foreign Key'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="info-panel">
                <h3>💡 About Unified Views</h3>
                <p>
                  A unified view combines your tables using the selected relationships, 
                  allowing you to analyze data across multiple tables seamlessly.
                </p>
                <ul>
                  <li>✓ Automatically joins tables based on relationships</li>
                  <li>✓ Enables cross-table KPI calculations</li>
                  <li>✓ Creates a single queryable view for dashboards</li>
                </ul>
              </div>

              <div className="actions">
                <button
                  className="btn btn-secondary"
                  onClick={skipToKpi}
                >
                  Skip (Use Individual Tables)
                </button>
                <button
                  className="btn btn-primary"
                  onClick={createUnifiedView}
                  disabled={selectedRelationships.size === 0}
                >
                  Create Unified View ({selectedRelationships.size} relationships)
                </button>
              </div>
            </>
          ) : (
            <div className="no-relationships">
              <div className="empty-state">
                <h2>No Relationships Detected</h2>
                <p>
                  No foreign key relationships were found between your tables. 
                  This could mean your tables are independent datasets.
                </p>
                <p>
                  You can still proceed with individual table analysis, or you can:
                </p>
                <ul>
                  <li>Check if your tables have matching column names (e.g., customer_id)</li>
                  <li>Ensure your data has consistent ID formats</li>
                  <li>Upload related datasets that reference each other</li>
                </ul>
                <button
                  className="btn btn-primary"
                  onClick={skipToKpi}
                >
                  Continue with Individual Tables
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectRelationshipsPage;
