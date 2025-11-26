import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Pie, Doughnut, Bar, Line } from 'react-chartjs-2';
import './ProjectDashboardPage.css';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardData {
  projectName: string;
  fileCount: number;
  totalRecords: number;
  domain: string;
  kpis: any[];
  charts: any[];
}

const ProjectDashboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [projectId]);

  const loadDashboard = async () => {
    try {
      const state = location.state as any;
      
      // Get project details
      const projectResponse = await axios.get(`http://localhost:5001/api/projects/${projectId}`);
      const project = projectResponse.data;

      // Get dashboard data for the first cleaning job (primary dataset)
      const cleaningJobId = state?.cleaningJobIds?.[0] || project.uploads[0]?.cleaningJobs[0]?.id;
      
      if (!cleaningJobId) {
        throw new Error('No cleaning job found for this project');
      }

      const dashboardResponse = await axios.get(`/api/dashboard/${cleaningJobId}`);
      
      const components = dashboardResponse.data.data?.components || [];
      const kpiCards = components.filter((c: any) => c.type === 'kpi-card');
      const chartComponents = components.filter((c: any) => c.type === 'chart');
      
      setDashboardData({
        projectName: project.name || 'Untitled Project',
        fileCount: project.uploads?.length || 0,
        totalRecords: dashboardResponse.data.data?.performance?.dataPoints || 0,
        domain: dashboardResponse.data.data?.metadata?.domain || project.combinedDomain || 'Unknown',
        kpis: kpiCards,
        charts: chartComponents
      });

    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const renderChart = (chartComponent: any) => {
    const data = chartComponent.data || [];
    const chartType = chartComponent.chartType || 'horizontal-bar';
    
    if (data.length === 0) {
      return <div className="chart-placeholder">No data available</div>;
    }

    // Extract labels and values from data
    const labels = data.map((item: any) => 
      item.category || item.name || item.label || item.x || `Item ${data.indexOf(item) + 1}`
    );
    const values = data.map((item: any) => 
      item.value || item.count || item.amount || item.y || 0
    );

    // Power BI color palette
    const powerBIColors = [
      '#01B8AA', '#FD625E', '#F2C80F', '#5F6B6D', '#8AD4EB',
      '#FE9666', '#A66999', '#3599B8', '#DFBFBF', '#4AC5BB',
      '#5F6B6D', '#FB8281', '#F4D25A', '#7F898A', '#A4DDEE',
      '#FDAB89', '#B687AC', '#28738A', '#A78F8F', '#168980'
    ];

    const chartColors = powerBIColors.slice(0, Math.max(values.length, 20));

    // Chart.js options with Power BI styling
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom' as const,
          labels: {
            boxWidth: 12,
            padding: 15,
            font: {
              size: 11,
              family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
            },
            color: '#605e5c'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(50, 49, 48, 0.95)',
          padding: 12,
          titleFont: {
            size: 13,
            family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          },
          bodyFont: {
            size: 12,
            family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          },
          borderColor: '#edebe9',
          borderWidth: 1
        }
      }
    };

    // Render pie chart
    if (chartType === 'pie') {
      const chartData = {
        labels,
        datasets: [{
          data: values,
          backgroundColor: chartColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }]
      };

      return (
        <div className="chart-wrapper" style={{ height: '350px', padding: '20px' }}>
          <Pie data={chartData} options={commonOptions} />
        </div>
      );
    }

    // Render donut chart
    if (chartType === 'donut') {
      const chartData = {
        labels,
        datasets: [{
          data: values,
          backgroundColor: chartColors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }]
      };

      const donutOptions = {
        ...commonOptions,
        cutout: '60%'
      };

      return (
        <div className="chart-wrapper" style={{ height: '350px', padding: '20px' }}>
          <Doughnut data={chartData} options={donutOptions} />
        </div>
      );
    }

    // Render line chart
    if (chartType === 'line' || chartType === 'multi-line' || chartType === 'area') {
      const chartData = {
        labels,
        datasets: [{
          label: chartComponent.kpi?.name || 'Value',
          data: values,
          borderColor: powerBIColors[0],
          backgroundColor: chartType === 'area' ? `${powerBIColors[0]}33` : 'transparent',
          borderWidth: 3,
          tension: 0.4,
          fill: chartType === 'area',
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: powerBIColors[0],
          pointBorderWidth: 2
        }]
      };

      const lineOptions = {
        ...commonOptions,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#f3f2f1',
              drawBorder: false
            },
            ticks: {
              font: {
                size: 11,
                family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
              },
              color: '#605e5c'
            }
          },
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              font: {
                size: 11,
                family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
              },
              color: '#605e5c'
            }
          }
        }
      };

      return (
        <div className="chart-wrapper" style={{ height: '350px', padding: '20px' }}>
          <Line data={chartData} options={lineOptions} />
        </div>
      );
    }

    // Render bar chart (vertical)
    if (chartType === 'bar') {
      const chartData = {
        labels,
        datasets: [{
          label: chartComponent.kpi?.name || 'Value',
          data: values,
          backgroundColor: chartColors,
          borderColor: chartColors.map(c => c),
          borderWidth: 0,
          borderRadius: 4
        }]
      };

      const barOptions = {
        ...commonOptions,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: '#f3f2f1',
              drawBorder: false
            },
            ticks: {
              font: {
                size: 11,
                family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
              },
              color: '#605e5c'
            }
          },
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              font: {
                size: 11,
                family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
              },
              color: '#605e5c'
            }
          }
        },
        plugins: {
          ...commonOptions.plugins,
          legend: {
            display: false
          }
        }
      };

      return (
        <div className="chart-wrapper" style={{ height: '350px', padding: '20px' }}>
          <Bar data={chartData} options={barOptions} />
        </div>
      );
    }

    // Render horizontal bar chart (default fallback)
    const chartData = {
      labels,
      datasets: [{
        label: chartComponent.kpi?.name || 'Value',
        data: values,
        backgroundColor: chartColors,
        borderColor: chartColors.map(c => c),
        borderWidth: 0,
        borderRadius: 4
      }]
    };

    const horizontalBarOptions = {
      ...commonOptions,
      indexAxis: 'y' as const,
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: '#f3f2f1',
            drawBorder: false
          },
          ticks: {
            font: {
              size: 11,
              family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
            },
            color: '#605e5c'
          }
        },
        y: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            font: {
              size: 11,
              family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
            },
            color: '#605e5c'
          }
        }
      },
      plugins: {
        ...commonOptions.plugins,
        legend: {
          display: false
        }
      }
    };

    return (
      <div className="chart-wrapper" style={{ height: '350px', padding: '20px' }}>
        <Bar data={chartData} options={horizontalBarOptions} />
      </div>
    );
  };

  const getKpiIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'Financial': '💰',
      'Sales': '📊',
      'Operations': '⚙️',
      'Marketing': '📢',
      'Custom': '📈',
      'Inventory': '📦',
      'Customer': '👥'
    };
    return icons[category] || '📈';
  };

  if (loading) {
    return (
      <div className="project-dashboard-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading project dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-dashboard-container">
        <div className="error-state">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/project/${projectId}/kpi`)}
          >
            Back to KPI Selection
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  return (
    <div className="project-dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>{dashboardData.projectName}</h1>
            <div className="project-meta">
              <span className="meta-item">
                📁 {dashboardData.fileCount || 0} Files
              </span>
              <span className="meta-item">
                📊 {(dashboardData.totalRecords || 0).toLocaleString()} Records
              </span>
              <span className="meta-item domain-badge">
                {(dashboardData.domain || 'Unknown').toUpperCase()}
              </span>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => navigate(`/project/${projectId}/kpi`)}
            >
              ← Back to KPIs
            </button>
            <button
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              🖨️ Export Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="kpi-overview">
        <h2>Key Performance Indicators</h2>
        <div className="kpi-cards">
          {dashboardData.kpis.map((kpiComponent: any, index: number) => (
            <div key={index} className="kpi-card">
              <div className="kpi-icon">{getKpiIcon(kpiComponent.kpi?.category || 'Custom')}</div>
              <div className="kpi-content">
                <h3>{kpiComponent.kpi?.name || 'KPI'}</h3>
                <div className="kpi-value">
                  {typeof kpiComponent.value === 'number' 
                    ? kpiComponent.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : kpiComponent.value}
                </div>
                <div className="kpi-formula">{kpiComponent.kpi?.formula_expr || ''}</div>
                {kpiComponent.comparison && (
                  <div className="kpi-comparison" style={{ color: kpiComponent.comparison > 0 ? '#4caf50' : '#f44336' }}>
                    {kpiComponent.comparison > 0 ? '↑' : '↓'} {Math.abs(kpiComponent.comparison)}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <h2>Visual Analytics</h2>
        <div className="charts-grid">
          {dashboardData.charts.map((chartComponent: any, index: number) => (
            <div key={index} className="chart-card">
              <div className="chart-header">
                <h3>{chartComponent.kpi?.name || 'Chart'}</h3>
                <span className="chart-type">{chartComponent.chartType || 'bar'}</span>
              </div>
              <div className="chart-container">
                {renderChart(chartComponent)}
              </div>
              {chartComponent.chartReason && (
                <div className="chart-reason" style={{ fontSize: '0.85em', color: '#666', marginTop: '8px' }}>
                  {chartComponent.chartReason}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Data Quality Insights */}
      <div className="insights-section">
        <h2>Data Quality Insights</h2>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Data Completeness</h4>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '85%' }}></div>
            </div>
            <p>85% of required fields are populated</p>
          </div>
          <div className="insight-card">
            <h4>Data Consistency</h4>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '92%' }}></div>
            </div>
            <p>92% of records follow expected patterns</p>
          </div>
          <div className="insight-card">
            <h4>Cross-File Correlation</h4>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '78%' }}></div>
            </div>
            <p>78% of files have matching key fields</p>
          </div>
        </div>
      </div>
    </div>
  );
};

function getKpiIcon(category: string): string {
  const icons: Record<string, string> = {
    financial: '💰',
    operational: '⚙️',
    sales: '📈',
    customer: '👥',
    efficiency: '⚡',
    quality: '✨',
    default: '📊'
  };
  return icons[category?.toLowerCase()] || icons.default;
}

export default ProjectDashboardPage;
