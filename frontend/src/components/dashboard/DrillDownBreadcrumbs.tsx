/**
 * DRILL-DOWN BREADCRUMBS COMPONENT
 * 5-level hierarchical navigation with quick jumps
 */

import React from 'react';
import { ChevronRight, Home, X } from 'lucide-react';

interface DrillDownBreadcrumbsProps {
  path: Array<{
    level: number;
    component: any;
    dataPoint: any;
    filters: any;
  }>;
  onNavigate: (level?: number) => void;
}

const DrillDownBreadcrumbs: React.FC<DrillDownBreadcrumbsProps> = ({ path, onNavigate }) => {
  if (path.length === 0) return null;

  return (
    <nav 
      className="drill-down-breadcrumbs"
      aria-label="Drill-down navigation"
      role="navigation"
    >
      <ol className="breadcrumb-list">
        {/* Home */}
        <li className="breadcrumb-item">
          <button
            className="breadcrumb-button"
            onClick={() => onNavigate(0)}
            aria-label="Return to dashboard overview"
          >
            <Home size={14} aria-hidden="true" />
            <span>Dashboard</span>
          </button>
        </li>

        {/* Path items */}
        {path.map((item, index) => (
          <React.Fragment key={index}>
            <li className="breadcrumb-separator" aria-hidden="true">
              <ChevronRight size={14} />
            </li>
            <li className="breadcrumb-item">
              <button
                className={`breadcrumb-button ${index === path.length - 1 ? 'active' : ''}`}
                onClick={() => index < path.length - 1 ? onNavigate(index + 1) : undefined}
                aria-current={index === path.length - 1 ? 'location' : undefined}
                aria-label={`Level ${index + 1}: ${item.dataPoint.category || item.dataPoint.x}`}
              >
                <span className="breadcrumb-level">L{index + 1}</span>
                <span className="breadcrumb-label">
                  {item.dataPoint.category || item.dataPoint.x}
                </span>
              </button>
            </li>
          </React.Fragment>
        ))}

        {/* Clear drill-down */}
        <li className="breadcrumb-item breadcrumb-clear">
          <button
            className="breadcrumb-button breadcrumb-clear-button"
            onClick={() => onNavigate(0)}
            aria-label="Clear drill-down and return to overview"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </li>
      </ol>

      {/* Context info */}
      <div className="breadcrumb-context" role="status" aria-live="polite">
        <span>Viewing: </span>
        <strong>{path[path.length - 1].dataPoint.category || path[path.length - 1].dataPoint.x}</strong>
        <span className="breadcrumb-level-indicator">
          (Level {path.length} of 5)
        </span>
      </div>
    </nav>
  );
};

export default DrillDownBreadcrumbs;
