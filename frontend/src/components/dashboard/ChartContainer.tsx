/**
 * CHART CONTAINER COMPONENT
 * Supports 12 chart types with intelligent rendering
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut, Scatter, Bubble } from 'react-chartjs-2';
import Plot from 'react-plotly.js';
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart, 
  Download, 
  Maximize2, 
  ZoomIn,
  Info
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartContainerProps {
  component: any;
  filters: Record<string, any>;
  onDrillDown?: (dataPoint: any) => void;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  component,
  filters,
  onDrillDown,
  loading,
  className = '',
  style
}) => {
  const [selectedChartType, setSelectedChartType] = useState(component.chartType);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(false);

  // Filter data based on active filters
  const filteredData = useMemo(() => {
    if (!component.data || Object.keys(filters).length === 0) {
      return component.data;
    }

    // Apply filters to data
    return component.data.filter((item: any) => {
      return Object.entries(filters).every(([key, value]) => {
        if (key === 'drillDown') return true; // Handle drill-down separately
        return item[key] === value || !value;
      });
    });
  }, [component.data, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    const values = filteredData.map((d: any) => d.y || d.value).filter((v: number) => typeof v === 'number');
    if (values.length === 0) return null;

    const sum = values.reduce((a: number, b: number) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { avg, min, max, count: values.length };
  }, [filteredData]);

  // Chart click handler for drill-down
  const handleChartClick = useCallback((_event: any, elements: any) => {
    if (!onDrillDown || !elements || elements.length === 0) return;

    const index = elements[0].index;
    const dataPoint = filteredData[index];
    onDrillDown(dataPoint);
  }, [filteredData, onDrillDown]);

  // Export chart
  const handleExport = useCallback((format: 'png' | 'csv' = 'png') => {
    if (format === 'png') {
      const canvas = document.querySelector(`#chart-${component.id} canvas`) as HTMLCanvasElement;
      if (canvas) {
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${component.kpi.name}_chart.png`;
        link.href = url;
        link.click();
      }
    } else if (format === 'csv') {
      // Export data as CSV
      const csv = filteredData.map((d: any) => `${d.x},${d.y}`).join('\n');
      const blob = new Blob([`x,y\n${csv}`], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${component.kpi.name}_data.csv`;
      link.href = url;
      link.click();
    }
  }, [component, filteredData]);

  // Render appropriate chart type
  const renderChart = () => {
    if (!filteredData || filteredData.length === 0) {
      return (
        <div className="chart-empty-state" role="status">
          <Info size={48} />
          <p>No data available for this chart</p>
          {Object.keys(filters).length > 0 && (
            <p className="text-sm text-gray-500">Try adjusting your filters</p>
          )}
        </div>
      );
    }

    const chartType = selectedChartType;
    const chartConfig = component.chartConfig || {};

    // Prepare data for Chart.js
    const chartJsData = {
      labels: filteredData.map((d: any) => d.x || d.category),
      datasets: [{
        label: component.kpi.name,
        data: filteredData.map((d: any) => d.y || d.value),
        backgroundColor: [
          'rgba(37, 99, 235, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)'
        ],
        borderColor: [
          'rgb(37, 99, 235)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)'
        ],
        borderWidth: 2,
        ...chartConfig
      }]
    };

    const chartJsOptions = {
      responsive: true,
      maintainAspectRatio: false,
      onClick: handleChartClick,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              label += context.parsed.y.toLocaleString();
              return label;
            }
          }
        },
        ...chartConfig.plugins
      },
      scales: chartType !== 'pie' && chartType !== 'donut' ? {
        x: { display: true },
        y: { display: true, beginAtZero: true }
      } : undefined,
      animation: {
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300
      }
    };

    // Render Chart.js charts
    switch (chartType) {
      case 'line':
      case 'area':
        return <Line data={chartJsData} options={chartJsOptions} />;
      
      case 'bar':
      case 'horizontal-bar':
        return <Bar data={chartJsData} options={{
          ...chartJsOptions,
          indexAxis: chartType === 'horizontal-bar' ? 'y' as const : 'x' as const
        }} />;
      
      case 'pie':
        return <Pie data={chartJsData} options={chartJsOptions} />;
      
      case 'donut':
        return <Doughnut data={chartJsData} options={chartJsOptions} />;
      
      case 'scatter':
        return <Scatter 
          data={{
            datasets: [{
              label: component.kpi.name,
              data: filteredData.map((d: any) => ({ x: d.x, y: d.y })),
              backgroundColor: 'rgba(37, 99, 235, 0.6)'
            }]
          }} 
          options={chartJsOptions} 
        />;
      
      case 'bubble':
        return <Bubble 
          data={{
            datasets: [{
              label: component.kpi.name,
              data: filteredData.map((d: any) => ({ x: d.x, y: d.y, r: d.r || 10 })),
              backgroundColor: 'rgba(37, 99, 235, 0.6)'
            }]
          }} 
          options={chartJsOptions} 
        />;
      
      // Plotly.js charts for advanced types
      case 'treemap':
        return (
          <Plot
            data={[{
              type: 'treemap',
              labels: filteredData.map((d: any) => d.category || d.x),
              parents: filteredData.map(() => ''),
              values: filteredData.map((d: any) => d.y || d.value),
              textinfo: 'label+value',
              marker: { colorscale: 'Blues' }
            }]}
            layout={{
              autosize: true,
              margin: { l: 0, r: 0, t: 30, b: 0 }
            }}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true }}
          />
        );
      
      case 'sunburst':
        return (
          <Plot
            data={[{
              type: 'sunburst',
              labels: filteredData.map((d: any) => d.category || d.x),
              parents: filteredData.map(() => ''),
              values: filteredData.map((d: any) => d.y || d.value),
              branchvalues: 'total'
            }]}
            layout={{
              autosize: true,
              margin: { l: 0, r: 0, t: 0, b: 0 }
            }}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true }}
          />
        );
      
      case 'heatmap':
        const heatmapData = filteredData.reduce((acc: any, item: any) => {
          const row = item.row || 0;
          const col = item.col || 0;
          if (!acc[row]) acc[row] = [];
          acc[row][col] = item.value || 0;
          return acc;
        }, []);

        return (
          <Plot
            data={[{
              type: 'heatmap',
              z: heatmapData,
              colorscale: 'Blues'
            }]}
            layout={{
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 50 }
            }}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true }}
          />
        );
      
      case 'box-plot':
        return (
          <Plot
            data={[{
              type: 'box',
              y: filteredData.map((d: any) => d.y || d.value),
              name: component.kpi.name,
              marker: { color: 'rgb(37, 99, 235)' }
            }]}
            layout={{
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 50 },
              yaxis: { title: component.kpi.unit || 'Value' }
            }}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true }}
          />
        );
      
      case 'violin-plot':
        return (
          <Plot
            data={[{
              type: 'violin',
              y: filteredData.map((d: any) => d.y || d.value),
              name: component.kpi.name,
              box: { visible: true },
              meanline: { visible: true }
            }]}
            layout={{
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 50 }
            }}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true }}
          />
        );
      
      case 'waterfall':
        const waterfallData = filteredData.map((d: any, i: number) => {
          if (i === 0) return d.y || d.value;
          return (d.y || d.value) - (filteredData[i-1].y || filteredData[i-1].value);
        });

        return (
          <Plot
            data={[{
              type: 'waterfall',
              x: filteredData.map((d: any) => d.x || d.category),
              y: waterfallData,
              connector: { line: { color: 'rgb(107, 114, 128)' } }
            }]}
            layout={{
              autosize: true,
              margin: { l: 50, r: 50, t: 30, b: 50 }
            }}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true }}
          />
        );
      
      case 'table':
        return (
          <div className="chart-table">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((d: any, i: number) => (
                  <tr key={i}>
                    <td>{d.x || d.category}</td>
                    <td>{(d.y || d.value).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      default:
        return <div>Unsupported chart type: {chartType}</div>;
    }
  };

  if (loading) {
    return (
      <div 
        className={`chart-container skeleton ${className}`} 
        style={{ height: '400px', ...style }} 
        aria-hidden="true" 
      />
    );
  }

  return (
    <div 
      id={`chart-${component.id}`}
      className={`chart-container ${className} ${isFullscreen ? 'fullscreen' : ''}`}
      style={style}
      role="img"
      aria-label={`${component.kpi.name} chart showing ${selectedChartType} visualization`}
    >
      {/* Header */}
      <div className="chart-header">
        <div>
          <h3 className="chart-title">{component.kpi.name}</h3>
          {component.chartReason && (
            <p className="chart-subtitle text-sm text-gray-500">
              {component.chartReason}
            </p>
          )}
        </div>
        
        <div className="chart-controls">
          {/* Chart type switcher */}
          <div className="chart-type-switcher" role="radiogroup" aria-label="Chart type">
            <button
              className={`chart-type-button ${selectedChartType === 'line' ? 'active' : ''}`}
              onClick={() => setSelectedChartType('line')}
              aria-label="Line chart"
              aria-checked={selectedChartType === 'line'}
              role="radio"
            >
              <LineChartIcon size={16} />
            </button>
            <button
              className={`chart-type-button ${selectedChartType === 'bar' ? 'active' : ''}`}
              onClick={() => setSelectedChartType('bar')}
              aria-label="Bar chart"
              aria-checked={selectedChartType === 'bar'}
              role="radio"
            >
              <BarChart3 size={16} />
            </button>
            <button
              className={`chart-type-button ${selectedChartType === 'pie' ? 'active' : ''}`}
              onClick={() => setSelectedChartType('pie')}
              aria-label="Pie chart"
              aria-checked={selectedChartType === 'pie'}
              role="radio"
            >
              <PieChart size={16} />
            </button>
          </div>

          {/* Actions */}
          <button
            className="chart-action-button"
            onClick={() => setZoomEnabled(!zoomEnabled)}
            aria-label="Toggle zoom"
            aria-pressed={zoomEnabled}
            disabled={['pie', 'donut', 'table'].includes(selectedChartType)}
          >
            <ZoomIn size={16} />
          </button>
          <button
            className="chart-action-button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            aria-label="Toggle fullscreen"
            aria-pressed={isFullscreen}
          >
            <Maximize2 size={16} />
          </button>
          <button
            className="chart-action-button"
            onClick={() => handleExport('png')}
            aria-label="Export chart"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="chart-canvas" style={{ height: 'calc(100% - 120px)' }}>
        {renderChart()}
      </div>

      {/* Footer with statistics */}
      {stats && (
        <div className="chart-footer">
          <div className="chart-stats">
            <div className="chart-stat">
              <span className="chart-stat-label">Avg</span>
              <span className="chart-stat-value">{stats.avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
            </div>
            <div className="chart-stat">
              <span className="chart-stat-label">Min</span>
              <span className="chart-stat-value">{stats.min.toLocaleString()}</span>
            </div>
            <div className="chart-stat">
              <span className="chart-stat-label">Max</span>
              <span className="chart-stat-value">{stats.max.toLocaleString()}</span>
            </div>
            <div className="chart-stat">
              <span className="chart-stat-label">Count</span>
              <span className="chart-stat-value">{stats.count.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartContainer;
