/**
 * PERFORMANCE MONITOR COMPONENT
 * Real-time performance tracking and metrics (development mode only)
 */

import React, { useState } from 'react';
import { Activity, Clock, TrendingUp, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface PerformanceMonitorProps {
  stages: Array<{
    stage: number;
    name: string;
    status: 'pending' | 'loading' | 'complete' | 'error';
    startTime?: number;
    endTime?: number;
    duration?: number;
  }>;
  metrics: {
    totalLoadTime?: number;
    timeToInteractive?: number;
    lastFilterResponseTime?: number;
    target?: 'met' | 'exceeded';
    filterTarget?: 'met' | 'exceeded';
  };
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ stages, metrics }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle size={14} className="text-success" aria-hidden="true" />;
      case 'loading':
        return <Clock size={14} className="text-warning animate-spin" aria-hidden="true" />;
      case 'error':
        return <XCircle size={14} className="text-critical" aria-hidden="true" />;
      default:
        return <AlertCircle size={14} className="text-neutral" aria-hidden="true" />;
    }
  };

  const getPerformanceGrade = () => {
    if (!metrics.totalLoadTime) return 'N/A';
    
    if (metrics.totalLoadTime < 1000) return 'A+';
    if (metrics.totalLoadTime < 2000) return 'A';
    if (metrics.totalLoadTime < 3000) return 'B';
    if (metrics.totalLoadTime < 4000) return 'C';
    return 'D';
  };

  return (
    <div 
      className="performance-monitor"
      role="complementary"
      aria-label="Performance metrics"
    >
      {/* Collapsed view - Badge */}
      {!isExpanded && (
        <button
          className="performance-badge"
          onClick={() => setIsExpanded(true)}
          aria-label="Expand performance monitor"
          aria-expanded={false}
        >
          <Activity size={14} aria-hidden="true" />
          <span className="performance-grade">{getPerformanceGrade()}</span>
          {metrics.totalLoadTime && (
            <span className="performance-time">
              {metrics.totalLoadTime}ms
            </span>
          )}
        </button>
      )}

      {/* Expanded view - Panel */}
      {isExpanded && (
        <div className="performance-panel">
          <div className="performance-header">
            <h3 className="performance-title">
              <Activity size={16} aria-hidden="true" />
              Performance Monitor
            </h3>
            <button
              className="performance-close"
              onClick={() => setIsExpanded(false)}
              aria-label="Collapse performance monitor"
            >
              ×
            </button>
          </div>

          {/* Overall Metrics */}
          <div className="performance-metrics">
            <div className="performance-metric">
              <span className="metric-label">Total Load Time</span>
              <span className={`metric-value ${metrics.target === 'met' ? 'text-success' : 'text-warning'}`}>
                {metrics.totalLoadTime ? `${metrics.totalLoadTime}ms` : 'N/A'}
              </span>
              <span className="metric-target">
                Target: &lt; 3000ms {metrics.target === 'met' ? '✓' : '⚠'}
              </span>
            </div>

            <div className="performance-metric">
              <span className="metric-label">Time to Interactive</span>
              <span className="metric-value">
                {metrics.timeToInteractive ? `${metrics.timeToInteractive}ms` : 'N/A'}
              </span>
              <span className="metric-target">
                Target: &lt; 1200ms {(metrics.timeToInteractive && metrics.timeToInteractive < 1200) ? '✓' : '⚠'}
              </span>
            </div>

            {metrics.lastFilterResponseTime && (
              <div className="performance-metric">
                <span className="metric-label">Last Filter Response</span>
                <span className={`metric-value ${metrics.filterTarget === 'met' ? 'text-success' : 'text-warning'}`}>
                  {metrics.lastFilterResponseTime}ms
                </span>
                <span className="metric-target">
                  Target: &lt; 500ms {metrics.filterTarget === 'met' ? '✓' : '⚠'}
                </span>
              </div>
            )}

            <div className="performance-metric">
              <span className="metric-label">Performance Grade</span>
              <span className="metric-value metric-grade">
                {getPerformanceGrade()}
              </span>
            </div>
          </div>

          {/* Loading Stages */}
          <div className="performance-stages">
            <h4 className="stages-title">Loading Stages</h4>
            {stages.map((stage) => (
              <div key={stage.stage} className="stage-item">
                <span className="stage-status">
                  {getStatusIcon(stage.status)}
                </span>
                <span className="stage-name">
                  Stage {stage.stage}: {stage.name}
                </span>
                {stage.duration !== undefined && (
                  <span className="stage-duration">
                    {stage.duration}ms
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {metrics.totalLoadTime && metrics.totalLoadTime > 3000 && (
            <div className="performance-recommendations">
              <h4 className="recommendations-title">
                <TrendingUp size={14} aria-hidden="true" />
                Optimization Suggestions
              </h4>
              <ul className="recommendations-list">
                <li>Consider reducing the number of charts displayed</li>
                <li>Enable data sampling for large datasets</li>
                <li>Use server-side filtering for better performance</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
