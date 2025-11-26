import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './ProjectDomainDetectionPage.css';

interface DomainScore {
  domain: string;
  score: number;
  confidence?: number; // For backward compatibility
  primaryMatches?: string[];
  keywordMatches?: string[];
}

const ProjectDomainDetectionPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [detectedDomain, setDetectedDomain] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [domainJobId, setDomainJobId] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<DomainScore[]>([]);
  const [cleaningJobIds, setCleaningJobIds] = useState<string[]>([]);
  const [allDomains, setAllDomains] = useState<string[]>([]);
  const [showManualSelection, setShowManualSelection] = useState(false);
  const [decision, setDecision] = useState<string>('auto_detect');

  useEffect(() => {
    // Get cleaning job IDs from navigation state or fetch from project
    const state = location.state as any;
    if (state?.cleaningJobIds) {
      setCleaningJobIds(state.cleaningJobIds);
      detectDomain(state.cleaningJobIds);
    } else {
      loadProjectCleaningJobs();
    }
  }, [projectId]);

  const loadProjectCleaningJobs = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}`);
      if (response.data.success) {
        const jobIds = response.data.data.cleaningJobs?.map((job: any) => job.id) || [];
        setCleaningJobIds(jobIds);
        if (jobIds.length > 0) {
          detectDomain(jobIds);
        } else {
          alert('No cleaning jobs found. Please clean the files first.');
          navigate(`/project/${projectId}/clean`);
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error);
      setLoading(false);
    }
  };

  const detectDomain = async (jobIds: string[]) => {
    setDetecting(true);
    setLoading(false);

    try {
      // Use project-level domain detection
      const response = await axios.post(`/api/projects/${projectId}/detect-domain`);

      if (response.data.success) {
        const data = response.data.data;
        setDetectedDomain(data.detected_domain || data.domain);
        setConfidence(data.confidence);
        setDomainJobId(data.id || `project_${projectId}`);
        setAlternatives(data.domainScores || data.top3Alternatives || []);
        setAllDomains(data.allDomains || []);
        setDecision(data.decision || 'auto_detect');
        
        // If low confidence or manual_select decision, show manual selection
        if (data.confidence < 50 || data.decision === 'manual_select') {
          setShowManualSelection(true);
        }
      }
    } catch (error: any) {
      console.error('Domain detection failed:', error);
      // Show manual selection on error
      setShowManualSelection(true);
      // Load all available domains
      setAllDomains(['retail', 'ecommerce', 'saas', 'healthcare', 'manufacturing', 'logistics', 'financial', 'education']);
    } finally {
      setDetecting(false);
    }
  };

  const confirmDomain = async (selectedDomain: string) => {
    try {
      // Update project domain and navigate to relationship detection
      await axios.post(`/api/projects/${projectId}/detect-domain`);

      // Navigate to relationship detection
      navigate(`/project/${projectId}/relationships`, {
        state: {
          projectId,
          cleaningJobIds,
          domain: selectedDomain
        }
      });
    } catch (error: any) {
      console.error('Domain confirmation failed:', error);
      alert(error.response?.data?.error || 'Failed to confirm domain');
    }
  };

  if (loading) {
    return (
      <div className="project-domain-container">
        <div className="loading">Loading project...</div>
      </div>
    );
  }

  return (
    <div className="project-domain-container">
      <div className="project-domain-header">
        <h1>Domain Detection</h1>
        <p>Analyzing {cleaningJobIds.length} files to detect business domain</p>
      </div>

      {detecting ? (
        <div className="detecting-state">
          <div className="spinner"></div>
          <h2>Analyzing Data...</h2>
          <p>Detecting domain patterns across all files</p>
        </div>
      ) : showManualSelection ? (
        <div className="manual-selection-section">
          <div className="manual-header">
            {detectedDomain ? (
              <>
                <h2>Low Confidence Detection</h2>
                <p>Auto-detection found "{detectedDomain}" with {confidence.toFixed(1)}% confidence.</p>
                <p>Please review and confirm, or select a different domain:</p>
              </>
            ) : (
              <>
                <h2>Select Business Domain</h2>
                <p>Unable to auto-detect domain. Please manually select your business domain:</p>
              </>
            )}
          </div>

          {detectedDomain && (
            <div className="suggested-domain">
              <h3>Suggested Domain</h3>
              <div 
                className="domain-card suggested"
                onClick={() => confirmDomain(detectedDomain)}
              >
                <h4>{detectedDomain.toUpperCase()}</h4>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill" 
                    style={{ width: `${confidence}%` }}
                  ></div>
                </div>
                <p>{confidence.toFixed(1)}% confidence</p>
                <button className="btn btn-primary">Confirm This Domain</button>
              </div>
            </div>
          )}

          <div className="all-domains-section">
            <h3>{detectedDomain ? 'Or Choose Different Domain' : 'Available Domains'}</h3>
            <div className="domains-grid">
              {allDomains.filter(d => d !== detectedDomain).map((domain) => (
                <div 
                  key={domain} 
                  className="domain-card"
                  onClick={() => confirmDomain(domain)}
                >
                  <h4>{domain.toUpperCase()}</h4>
                  <button className="btn btn-secondary">Select</button>
                </div>
              ))}
            </div>
          </div>

          <div className="manual-actions">
            <button 
              className="btn btn-link"
              onClick={() => navigate(`/project/${projectId}/clean`)}
            >
              ← Back to Cleaning
            </button>
          </div>
        </div>
      ) : detectedDomain ? (
        <div className="results-section">
          <div className="primary-domain">
            <div className="domain-badge">
              <span className="domain-icon">🎯</span>
              <div className="domain-info">
                <h2>{detectedDomain.toUpperCase()}</h2>
                <div className="confidence-bar">
                  <div 
                    className="confidence-fill" 
                    style={{ width: `${confidence}%` }}
                  ></div>
                </div>
                <p className="confidence-text">{confidence.toFixed(1)}% Confidence</p>
              </div>
            </div>
            <button 
              className="btn btn-primary btn-large"
              onClick={() => confirmDomain(detectedDomain)}
            >
              Confirm & Continue to KPIs →
            </button>
          </div>

          {alternatives.length > 0 && (
            <div className="alternatives-section">
              <h3>Alternative Domains</h3>
              <div className="alternatives-grid">
                {alternatives.map((alt) => (
                  <div 
                    key={alt.domain} 
                    className="alternative-card"
                    onClick={() => confirmDomain(alt.domain)}
                  >
                    <h4>{alt.domain.toUpperCase()}</h4>
                    <div className="confidence-bar small">
                      <div 
                        className="confidence-fill" 
                        style={{ width: `${alt.score || 0}%` }}
                      ></div>
                    </div>
                    <p>{(alt.score || 0).toFixed(1)}% match</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="error-state">
          <p>Failed to detect domain</p>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate(`/project/${projectId}/clean`)}
          >
            Back to Cleaning
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectDomainDetectionPage;
