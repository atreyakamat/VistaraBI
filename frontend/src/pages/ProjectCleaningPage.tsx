import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ProjectCleaningPage.css';

interface Upload {
  id: string;
  originalName: string;
  totalRecords: number;
  status: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  uploads: Upload[];
}

interface CleaningResult {
  uploadId: string;
  fileName: string;
  jobId?: string;
  status: 'pending' | 'cleaning' | 'success' | 'failed';
  error?: string;
  stats?: any;
}

const ProjectCleaningPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [cleaningResults, setCleaningResults] = useState<CleaningResult[]>([]);
  const [cleaningJobIds, setCleaningJobIds] = useState<string[]>([]);
  const [showConfigHelp, setShowConfigHelp] = useState(false);

  // Cleaning configuration
  const [config, setConfig] = useState({
    imputation: {
      strategy: 'auto'
    },
    outliers: {
      enabled: true,
      method: 'iqr',
      threshold: 1.5
    },
    deduplication: {
      enabled: true,
      strategy: 'keep_first'
    },
    standardization: {}
  });

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}`);
      if (response.data.success) {
        setProject(response.data.data);
        // Initialize cleaning results
        const results: CleaningResult[] = response.data.data.uploads.map((upload: Upload) => ({
          uploadId: upload.id,
          fileName: upload.originalName,
          status: 'pending'
        }));
        setCleaningResults(results);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      alert('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const startCleaning = async () => {
    setCleaning(true);

    try {
      const response = await axios.post(`/api/projects/${projectId}/clean`, {
        config
      });

      if (response.data.success) {
        const jobIds = response.data.data.cleaningJobIds;
        setCleaningJobIds(jobIds);

        // Poll for status
        const pollInterval = setInterval(async () => {
          try {
            const statusResponse = await axios.get(`/api/projects/${projectId}/cleaning-status`);
            const jobs = statusResponse.data.data;

            // Update results
            const updatedResults = cleaningResults.map(result => {
              const job = jobs.find((j: any) => j.upload.id === result.uploadId);
              if (job) {
                const status: 'pending' | 'cleaning' | 'success' | 'failed' = 
                  job.status === 'completed' ? 'success' : 
                  job.status === 'failed' ? 'failed' : 'cleaning';
                return {
                  ...result,
                  jobId: job.id,
                  status,
                  stats: job.report
                };
              }
              return result;
            });

            setCleaningResults(updatedResults);

            // Check if all done
            const allDone = jobs.every((j: any) => 
              j.status === 'completed' || j.status === 'failed'
            );

            if (allDone) {
              clearInterval(pollInterval);
              setCleaning(false);

              const successfulJobs = jobs.filter((j: any) => j.status === 'completed');
              if (successfulJobs.length > 0) {
                setTimeout(() => {
                  navigate(`/project/${projectId}/domain`, {
                    state: {
                      projectId,
                      cleaningJobIds: successfulJobs.map((j: any) => j.id)
                    }
                  });
                }, 2000);
              }
            }
          } catch (err) {
            console.error('Status poll error:', err);
          }
        }, 2000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          setCleaning(false);
        }, 300000);
      }
    } catch (error: any) {
      console.error('Cleaning failed:', error);
      alert(error.response?.data?.error || 'Cleaning failed');
      setCleaning(false);
    }
  };

  if (loading) {
    return (
      <div className="project-cleaning-container">
        <div className="loading">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-cleaning-container">
        <div className="error">Project not found</div>
      </div>
    );
  }

  const allSuccess = cleaningResults.every(r => r.status === 'success');
  const anyFailed = cleaningResults.some(r => r.status === 'failed');

  return (
    <div className="project-cleaning-container">
      <div className="project-cleaning-header">
        <h1>Clean Project Data</h1>
        <div className="project-info">
          <h2>{project.name}</h2>
          {project.description && <p>{project.description}</p>}
          <span className="file-count">{project.uploads.length} files</span>
        </div>
      </div>

      <div className="files-section">
        <h3>Files to Clean</h3>
        <div className="files-list">
          {cleaningResults.map((result) => (
            <div key={result.uploadId} className={`file-card ${result.status}`}>
              <div className="file-header">
                <span className="file-name">{result.fileName}</span>
                <span className={`status-badge ${result.status}`}>
                  {result.status === 'pending' && '⏳ Pending'}
                  {result.status === 'cleaning' && '🔄 Cleaning...'}
                  {result.status === 'success' && '✅ Complete'}
                  {result.status === 'failed' && '❌ Failed'}
                </span>
              </div>
              {result.error && (
                <div className="error-message">{result.error}</div>
              )}
              {result.stats && (
                <div className="stats">
                  <div className="stat">
                    <span>Original Rows:</span>
                    <span>{result.stats.original?.totalRows || 0}</span>
                  </div>
                  <div className="stat">
                    <span>Final Rows:</span>
                    <span>{result.stats.final?.totalRows || 0}</span>
                  </div>
                  <div className="stat">
                    <span>Removed:</span>
                    <span>{result.stats.rowsRemoved || 0}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="config-section">
        <div className="config-header">
          <h3>Cleaning Configuration</h3>
          <button 
            className="btn-help"
            onClick={() => setShowConfigHelp(!showConfigHelp)}
            type="button"
          >
            {showConfigHelp ? '✕ Hide Help' : '? Show Help'}
          </button>
        </div>

        {showConfigHelp && (
          <div className="config-help-panel">
            <h4>📊 Understanding Data Cleaning</h4>
            <div className="help-section">
              <h5>🔧 Imputation (Missing Values)</h5>
              <p><strong>Auto Mode (Recommended):</strong> Automatically detects the best strategy for each column:</p>
              <ul>
                <li><strong>Median</strong> for numeric columns (prices, counts) - uses middle value, resistant to outliers</li>
                <li><strong>Mode</strong> for categorical columns (status, payment method) - uses most frequent value</li>
                <li><strong>Forward-fill</strong> for ID columns - carries previous value forward</li>
              </ul>
              <p><em>Example: OrderValue uses median ($229.99), PaymentMethod uses mode ("Credit Card")</em></p>
            </div>
            <div className="help-section">
              <h5>📈 Outlier Detection</h5>
              <p><strong>IQR Method:</strong> Identifies values outside 1.5× Interquartile Range</p>
              <p>Example: If most orders are $50-$500, a $10,000 order gets flagged</p>
              <p><em>Note: Outliers are marked with _outlier column but NOT removed - you keep all data!</em></p>
            </div>
            <div className="help-section">
              <h5>🔄 Deduplication</h5>
              <p><strong>Keep First:</strong> When duplicate rows are found, keeps the earliest occurrence</p>
              <p>Ensures each unique transaction/record appears only once for accurate counting</p>
            </div>
          </div>
        )}

        <div className="config-options">
          <div className="config-option">
            <label>
              <input
                type="checkbox"
                checked={config.imputation.strategy === 'auto'}
                onChange={(e) => setConfig({
                  ...config,
                  imputation: { strategy: e.target.checked ? 'auto' : 'median' }
                })}
                disabled={cleaning}
              />
              <div className="option-details">
                <span className="option-title">Auto Imputation (Recommended)</span>
                <span className="option-desc">Smart detection: median for numbers, mode for categories, forward-fill for IDs</span>
              </div>
            </label>
          </div>
          <div className="config-option">
            <label>
              <input
                type="checkbox"
                checked={config.outliers.enabled}
                onChange={(e) => setConfig({
                  ...config,
                  outliers: { ...config.outliers, enabled: e.target.checked }
                })}
                disabled={cleaning}
              />
              <div className="option-details">
                <span className="option-title">Outlier Detection</span>
                <span className="option-desc">Flag unusual values using IQR method (data preserved)</span>
              </div>
            </label>
          </div>
          <div className="config-option">
            <label>
              <input
                type="checkbox"
                checked={config.deduplication.enabled}
                onChange={(e) => setConfig({
                  ...config,
                  deduplication: { ...config.deduplication, enabled: e.target.checked }
                })}
                disabled={cleaning}
              />
              <div className="option-details">
                <span className="option-title">Remove Duplicates</span>
                <span className="option-desc">Keep first occurrence of duplicate rows</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="actions">
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/upload')}
          disabled={cleaning}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={startCleaning}
          disabled={cleaning || allSuccess}
        >
          {cleaning ? 'Cleaning...' : allSuccess ? 'Cleaning Complete' : `Clean ${project.uploads.length} Files`}
        </button>
        {allSuccess && (
          <button
            className="btn btn-success"
            onClick={() => navigate(`/project/${projectId}/domain`, {
              state: { projectId, cleaningJobIds }
            })}
          >
            Continue to Domain Detection →
          </button>
        )}
      </div>

      {anyFailed && (
        <div className="warning-banner">
          Some files failed to clean. You can continue with the successfully cleaned files.
        </div>
      )}
    </div>
  );
};

export default ProjectCleaningPage;
