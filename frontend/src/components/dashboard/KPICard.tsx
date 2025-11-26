/**
 * KPI CARD COMPONENT
 * Enhanced card with sparkline, comparison, and interactive features
 */

import React, { useState, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js';
import { TrendingUp, TrendingDown, Minus, MoreVertical, Eye, Download, Share2 } from 'lucide-react';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

interface KPICardProps {
  component: any;
  onDrillDown?: (dataPoint: any) => void;
  loading?: boolean;
  style?: React.CSSProperties;
}

const KPICard: React.FC<KPICardProps> = ({ component, onDrillDown, loading, style }) => {
  const [showActions, setShowActions] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showActions]);

  if (loading) {
    return (
      <div className="kpi-card skeleton" style={{ height: '180px', ...style }} aria-hidden="true" />
    );
  }

  const { kpi, value, comparison, status, sparkline } = component;

  // Format value based on KPI unit
  const formatValue = (val: number) => {
    if (!kpi.unit) return val.toLocaleString();
    
    switch (kpi.unit.toLowerCase()) {
      case 'currency':
      case '$':
        return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      case 'percentage':
      case '%':
        return `${val.toFixed(1)}%`;
      case 'number':
      case 'count':
        return val.toLocaleString();
      default:
        return `${val.toLocaleString()} ${kpi.unit}`;
    }
  };

  // Sparkline chart configuration
  const sparklineData = {
    labels: Array.from({ length: sparkline?.length || 10 }, (_, i) => i),
    datasets: [
      {
        data: sparkline || Array(10).fill(0),
        borderColor: comparison?.direction === 'up' 
          ? 'rgb(16, 185, 129)' 
          : comparison?.direction === 'down'
          ? 'rgb(239, 68, 68)'
          : 'rgb(107, 114, 128)',
        backgroundColor: comparison?.direction === 'up'
          ? 'rgba(16, 185, 129, 0.1)'
          : comparison?.direction === 'down'
          ? 'rgba(239, 68, 68, 0.1)'
          : 'rgba(107, 114, 128, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  };

  const sparklineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: { display: false },
      y: { display: false }
    },
    animation: {
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300
    }
  };

  const handleCardClick = () => {
    if (onDrillDown) {
      onDrillDown({ kpi, value });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement export functionality
    console.log('Export KPI:', kpi.name);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement share functionality
    if (navigator.share) {
      navigator.share({
        title: kpi.name,
        text: `${kpi.name}: ${formatValue(value)}`,
        url: window.location.href
      });
    }
  };

  const getStatusIcon = () => {
    if (status === 'on-track' || status === 'positive') {
      return <TrendingUp size={16} aria-hidden="true" />;
    } else if (status === 'off-track' || status === 'negative') {
      return <TrendingDown size={16} aria-hidden="true" />;
    }
    return <Minus size={16} aria-hidden="true" />;
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'on-track':
      case 'positive':
        return 'On Track';
      case 'at-risk':
        return 'At Risk';
      case 'off-track':
      case 'negative':
        return 'Off Track';
      default:
        return 'Neutral';
    }
  };

  return (
    <div
      ref={cardRef}
      className="kpi-card"
      style={style}
      onClick={onDrillDown ? handleCardClick : undefined}
      onKeyPress={onDrillDown ? handleKeyPress : undefined}
      tabIndex={onDrillDown ? 0 : undefined}
      role={onDrillDown ? 'button' : undefined}
      aria-label={`${kpi.name}: ${formatValue(value)}${comparison ? `, ${comparison.label} change` : ''}`}
    >
      {/* Header */}
      <div className="kpi-card-header">
        <h3 className="kpi-card-title">
          {kpi.name}
        </h3>
        
        <div className="kpi-card-actions">
          <button
            className="kpi-card-action-button"
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            aria-label="More actions"
            aria-expanded={showActions}
            aria-haspopup="true"
          >
            <MoreVertical size={16} />
          </button>
          
          {showActions && (
            <div className="kpi-card-actions-menu" role="menu">
              <button 
                role="menuitem" 
                onClick={handleCardClick}
                disabled={!onDrillDown}
              >
                <Eye size={14} />
                View Details
              </button>
              <button role="menuitem" onClick={handleExport}>
                <Download size={14} />
                Export
              </button>
              <button role="menuitem" onClick={handleShare}>
                <Share2 size={14} />
                Share
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="kpi-card-value" aria-label="Current value">
        {formatValue(value)}
      </div>

      {/* Comparison */}
      {comparison && (
        <div className="kpi-card-comparison">
          <span 
            className={`kpi-card-change ${comparison.direction}`}
            aria-label={`${comparison.direction === 'up' ? 'Increased' : comparison.direction === 'down' ? 'Decreased' : 'Unchanged'} by ${Math.abs(comparison.value).toFixed(1)}%`}
          >
            {comparison.direction === 'up' && <TrendingUp size={14} aria-hidden="true" />}
            {comparison.direction === 'down' && <TrendingDown size={14} aria-hidden="true" />}
            {comparison.direction === 'stable' && <Minus size={14} aria-hidden="true" />}
            {comparison.label}
          </span>
          <span className="kpi-card-comparison-label" aria-hidden="true">
            vs previous period
          </span>
        </div>
      )}

      {/* Sparkline */}
      {sparkline && sparkline.length > 0 && (
        <div 
          className="kpi-card-sparkline" 
          role="img" 
          aria-label="Trend sparkline chart"
        >
          <Line data={sparklineData} options={sparklineOptions} />
        </div>
      )}

      {/* Status Badge */}
      <span 
        className={`kpi-card-status ${status || 'neutral'}`}
        role="status"
        aria-label={`Status: ${getStatusLabel()}`}
      >
        {getStatusIcon()}
        {getStatusLabel()}
      </span>
    </div>
  );
};

export default KPICard;
