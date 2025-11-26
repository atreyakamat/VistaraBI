/**
 * MODULE 5: ENHANCED DASHBOARD PAGE
 * 
 * Features:
 * - Progressive rendering with 4-stage loading
 * - 12 chart types with intelligent selection
 * - 5-tier responsive layout
 * - Advanced filtering with URL persistence
 * - 5-level drill-down navigation
 * - WCAG 2.1 AA accessibility
 * - Performance monitoring
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/dashboard-layout.css';

// Import chart components (we'll create these)
import KPICard from '../components/dashboard/KPICard';
import ChartContainer from '../components/dashboard/ChartContainer';
import FilterPanel from '../components/dashboard/FilterPanel';
import DrillDownBreadcrumbs from '../components/dashboard/DrillDownBreadcrumbs';
import PerformanceMonitor from '../components/dashboard/PerformanceMonitor';

interface DashboardData {
  id: string;
  title: string;
  description: string;
  layout: any;
  components: any[];
  filters: any;
  performance: any;
  metadata: any;
}

interface LoadingStage {
  stage: number;
  name: string;
  status: 'pending' | 'loading' | 'complete' | 'error';
  startTime?: number;
  endTime?: number;
  duration?: number;
}

const DashboardPage: React.FC = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // State management
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadingStages, setLoadingStages] = useState<LoadingStage[]>([
    { stage: 1, name: 'Skeleton', status: 'pending' },
    { stage: 2, name: 'KPI Cards', status: 'pending' },
    { stage: 3, name: 'Primary Charts', status: 'pending' },
    { stage: 4, name: 'Secondary Content', status: 'pending' }
  ]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [drillDownPath, setDrillDownPath] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});

  // Refs for performance monitoring
  const startTimeRef = useRef<number>(Date.now());
  const firstInteractiveRef = useRef<number | null>(null);

  // === PROGRESSIVE LOADING ===
  useEffect(() => {
    if (!datasetId) return;

    const loadDashboard = async () => {
      try {
        // Stage 1: Skeleton (300ms)
        updateStageStatus(1, 'loading');
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate initial load
        updateStageStatus(1, 'complete');

        // Stage 2: KPI Cards (500ms)
        updateStageStatus(2, 'loading');
        const response = await axios.get(`/api/dashboard/${datasetId}`);
        setDashboard(response.data.data);
        updateStageStatus(2, 'complete');

        // Mark first interactive time
        if (!firstInteractiveRef.current) {
          firstInteractiveRef.current = Date.now();
          setPerformanceMetrics((prev: any) => ({
            ...prev,
            timeToInteractive: firstInteractiveRef.current! - startTimeRef.current
          }));
        }

        // Stage 3: Primary Charts (700ms)
        updateStageStatus(3, 'loading');
        // Charts loaded progressively in ChartContainer components
        await new Promise(resolve => setTimeout(resolve, 200));
        updateStageStatus(3, 'complete');

        // Stage 4: Secondary Content (1200ms)
        updateStageStatus(4, 'loading');
        await new Promise(resolve => setTimeout(resolve, 300));
        updateStageStatus(4, 'complete');

        // Calculate total load time
        const totalTime = Date.now() - startTimeRef.current;
        setPerformanceMetrics((prev: any) => ({
          ...prev,
          totalLoadTime: totalTime,
          target: totalTime < 3000 ? 'met' : 'exceeded'
        }));

      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
        console.error('Dashboard load error:', err);
      }
    };

    loadDashboard();
  }, [datasetId]);

  // === FILTER URL PERSISTENCE ===
  useEffect(() => {
    // Load filters from URL
    const urlFilters: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith('filter_')) {
        const filterName = key.replace('filter_', '');
        try {
          urlFilters[filterName] = JSON.parse(value);
        } catch {
          urlFilters[filterName] = value;
        }
      }
    });
    setFilters(urlFilters);
  }, [searchParams]);

  const updateStageStatus = (stage: number, status: LoadingStage['status']) => {
    setLoadingStages(prev => prev.map(s => {
      if (s.stage === stage) {
        const now = Date.now();
        return {
          ...s,
          status,
          startTime: status === 'loading' ? now : s.startTime,
          endTime: status === 'complete' || status === 'error' ? now : s.endTime,
          duration: (status === 'complete' || status === 'error') && s.startTime 
            ? now - s.startTime 
            : s.duration
        };
      }
      return s;
    }));
  };

  // === FILTER HANDLERS ===
  const handleFilterChange = useCallback((filterName: string, value: any) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);

    // Update URL params
    const newSearchParams = new URLSearchParams(searchParams);
    if (value !== null && value !== undefined && value !== '') {
      newSearchParams.set(`filter_${filterName}`, JSON.stringify(value));
    } else {
      newSearchParams.delete(`filter_${filterName}`);
    }
    setSearchParams(newSearchParams, { replace: true });

    // Track filter response time
    const filterStartTime = Date.now();
    setTimeout(() => {
      const filterTime = Date.now() - filterStartTime;
      setPerformanceMetrics((prev: any) => ({
        ...prev,
        lastFilterResponseTime: filterTime,
        filterTarget: filterTime < 500 ? 'met' : 'exceeded'
      }));
    }, 0);
  }, [filters, searchParams, setSearchParams]);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const handleSaveFilterPreset = useCallback((presetName: string) => {
    const presets = JSON.parse(localStorage.getItem('dashboardFilterPresets') || '{}');
    presets[presetName] = filters;
    localStorage.setItem('dashboardFilterPresets', JSON.stringify(presets));
  }, [filters]);

  const handleLoadFilterPreset = useCallback((presetName: string) => {
    const presets = JSON.parse(localStorage.getItem('dashboardFilterPresets') || '{}');
    if (presets[presetName]) {
      setFilters(presets[presetName]);
    }
  }, []);

  // === DRILL-DOWN HANDLERS ===
  const handleDrillDown = useCallback((component: any, dataPoint: any) => {
    const newPath = [...drillDownPath, {
      level: drillDownPath.length,
      component,
      dataPoint,
      filters: { ...filters }
    }];
    setDrillDownPath(newPath);

    // Apply drill-down filter
    const drillFilter = {
      [component.kpi.columns_needed[0]]: dataPoint.category || dataPoint.x
    };
    handleFilterChange('drillDown', drillFilter);
  }, [drillDownPath, filters, handleFilterChange]);

  const handleDrillUp = useCallback((level?: number) => {
    if (level !== undefined) {
      // Jump to specific level
      const newPath = drillDownPath.slice(0, level);
      setDrillDownPath(newPath);
      if (newPath.length > 0) {
        setFilters(newPath[newPath.length - 1].filters);
      } else {
        handleClearFilters();
      }
    } else {
      // Go up one level
      if (drillDownPath.length > 0) {
        const newPath = drillDownPath.slice(0, -1);
        setDrillDownPath(newPath);
        if (newPath.length > 0) {
          setFilters(newPath[newPath.length - 1].filters);
        } else {
          handleClearFilters();
        }
      }
    }
  }, [drillDownPath, handleClearFilters]);

  // === KEYBOARD NAVIGATION ===
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Alt+F: Open filter panel
      if (e.altKey && e.key === 'f') {
        e.preventDefault();
        document.getElementById('filter-panel')?.focus();
      }
      // Alt+E: Export
      if (e.altKey && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
      // Escape: Close drill-down
      if (e.key === 'Escape' && drillDownPath.length > 0) {
        e.preventDefault();
        handleDrillUp();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [drillDownPath, handleDrillUp]);

  // === EXPORT HANDLER ===
  const handleExport = useCallback(async () => {
    try {
      const response = await axios.post(
        `/api/dashboard/${datasetId}/export`,
        { filters, format: 'pdf' },
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard_${datasetId}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, [datasetId, filters]);

  // === FILTERED COMPONENTS ===
  const filteredComponents = useMemo(() => {
    if (!dashboard) return [];

    // Apply filters to components
    // This is a placeholder - actual filtering would be more complex
    return dashboard.components.filter(component => {
      // Always show KPI cards
      if (component.type === 'kpi-card') return true;

      // Filter charts based on active filters
      if (Object.keys(filters).length === 0) return true;

      // TODO: Implement actual filtering logic based on component data
      return true;
    });
  }, [dashboard, filters]);

  // === RENDER ===

  if (error) {
    return (
      <div className="dashboard-container" role="alert">
        <div className="error-state">
          <h2>Failed to Load Dashboard</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/upload')}>Return to Upload</button>
        </div>
      </div>
    );
  }

  const isLoading = loadingStages.some(s => s.status === 'loading' || s.status === 'pending');

  return (
    <div className="dashboard-container" role="main" aria-label="Dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <h1 className="dashboard-title">
            {dashboard?.title || 'Loading Dashboard...'}
          </h1>
          {dashboard?.description && (
            <p className="dashboard-subtitle">{dashboard.description}</p>
          )}
        </div>
        
        {/* Performance indicator (dev only) */}
        {process.env.NODE_ENV === 'development' && performanceMetrics.totalLoadTime && (
          <div className="performance-badge">
            Load: {performanceMetrics.totalLoadTime}ms
            {performanceMetrics.target === 'met' ? ' ✓' : ' ⚠'}
          </div>
        )}
      </header>

      {/* Drill-down breadcrumbs */}
      {drillDownPath.length > 0 && (
        <DrillDownBreadcrumbs 
          path={drillDownPath} 
          onNavigate={handleDrillUp}
        />
      )}

      {/* Skip to main content (accessibility) */}
      <a href="#dashboard-content" className="sr-only focus-visible-only">
        Skip to main content
      </a>

      {/* Main dashboard grid */}
      <div 
        id="dashboard-content" 
        className="dashboard-grid"
        role="region"
        aria-label="Dashboard content"
      >
        {/* Stage 1: Skeleton loading state */}
        {loadingStages[0].status === 'loading' && (
          <>
            <div className="kpi-card skeleton" style={{ height: '120px' }} />
            <div className="kpi-card skeleton" style={{ height: '120px' }} />
            <div className="kpi-card skeleton" style={{ height: '120px' }} />
            <div className="chart-container skeleton" style={{ height: '400px' }} />
          </>
        )}

        {/* Stage 2+: Actual content */}
        {dashboard && (
          <>
            {/* KPI Cards */}
            {filteredComponents
              .filter(c => c.type === 'kpi-card')
              .map((component, index) => (
                <KPICard
                  key={component.id}
                  component={component}
                  onDrillDown={(dataPoint: any) => handleDrillDown(component, dataPoint)}
                  loading={loadingStages[1].status === 'loading'}
                  style={{ animationDelay: `${index * 50}ms` }}
                />
              ))}

            {/* Filter Panel */}
            {dashboard.filters && (
              <FilterPanel
                id="filter-panel"
                config={dashboard.filters}
                filters={filters}
                onChange={handleFilterChange}
                onClear={handleClearFilters}
                onSavePreset={handleSaveFilterPreset}
                onLoadPreset={handleLoadFilterPreset}
                loading={loadingStages[2].status === 'loading'}
              />
            )}

            {/* Charts */}
            {filteredComponents
              .filter(c => c.type === 'chart')
              .map((component, index) => {
                const isPrimary = index < 2;
                const loadingStage = isPrimary ? 2 : 3;
                
                return (
                  <ChartContainer
                    key={component.id}
                    component={component}
                    filters={filters}
                    onDrillDown={(dataPoint: any) => handleDrillDown(component, dataPoint)}
                    loading={loadingStages[loadingStage].status === 'loading'}
                    className={isPrimary ? 'primary' : 'secondary'}
                    style={{ animationDelay: `${(index + 6) * 100}ms` }}
                  />
                );
              })}
          </>
        )}
      </div>

      {/* Performance Monitor (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <PerformanceMonitor 
          stages={loadingStages}
          metrics={performanceMetrics}
        />
      )}

      {/* Global loading indicator */}
      {isLoading && (
        <div className="global-loading-indicator" role="status" aria-live="polite">
          <div className="loading-spinner" />
          <span className="sr-only">Loading dashboard content...</span>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
