/**
 * MODULE 5: DASHBOARD GENERATION SERVICE
 * 
 * Enhanced dashboard generation with:
 * - 12 chart types with intelligent selection
 * - 42 decision rules for optimal chart selection
 * - Data profiling for chart optimization
 * - Performance optimization strategies
 * - Responsive layout calculation
 */

import { PrismaClient } from '@prisma/client';
import loggingService from './loggingService.js';

const prisma = new PrismaClient();

/**
 * Enhanced Chart Type Selection Algorithm
 * Uses multi-dimensional data profiling for optimal chart selection
 */
class ChartSelectionEngine {
  constructor() {
    // Chart type library with metadata
    this.chartTypes = {
      LINE: {
        name: 'line',
        category: 'temporal',
        minSeries: 1,
        maxSeries: 5,
        minDataPoints: 3,
        maxDataPoints: 1000,
        useCase: 'Time series trends',
        volatilityThreshold: 0.3
      },
      AREA: {
        name: 'area',
        category: 'temporal',
        minSeries: 1,
        maxSeries: 3,
        minDataPoints: 3,
        maxDataPoints: 1000,
        useCase: 'Volatile time series',
        volatilityThreshold: 0.3
      },
      MULTI_LINE: {
        name: 'multi-line',
        category: 'temporal',
        minSeries: 2,
        maxSeries: 3,
        minDataPoints: 3,
        maxDataPoints: 500,
        useCase: 'Compare multiple series over time'
      },
      STACKED_AREA: {
        name: 'stacked-area',
        category: 'temporal',
        minSeries: 2,
        maxSeries: 5,
        minDataPoints: 3,
        maxDataPoints: 500,
        useCase: 'Composition over time'
      },
      BAR: {
        name: 'bar',
        category: 'categorical',
        minCategories: 1,
        maxCategories: 20,
        minDataPoints: 1,
        maxDataPoints: 50,
        useCase: 'Category comparison'
      },
      HORIZONTAL_BAR: {
        name: 'horizontal-bar',
        category: 'categorical',
        minCategories: 10,
        maxCategories: 20,
        minDataPoints: 10,
        maxDataPoints: 50,
        useCase: 'Many categories with long labels'
      },
      PIE: {
        name: 'pie',
        category: 'composition',
        minCategories: 2,
        maxCategories: 5,
        minDataPoints: 2,
        maxDataPoints: 5,
        useCase: 'Part-to-whole (few categories)'
      },
      DONUT: {
        name: 'donut',
        category: 'composition',
        minCategories: 5,
        maxCategories: 10,
        minDataPoints: 5,
        maxDataPoints: 10,
        useCase: 'Improved pie with center metrics'
      },
      TREEMAP: {
        name: 'treemap',
        category: 'hierarchical',
        minCategories: 20,
        maxCategories: 1000,
        minDataPoints: 20,
        maxDataPoints: 1000,
        useCase: 'Hierarchical data (many categories)'
      },
      SUNBURST: {
        name: 'sunburst',
        category: 'hierarchical',
        minLevels: 2,
        maxLevels: 5,
        minDataPoints: 10,
        maxDataPoints: 500,
        useCase: 'Multi-level hierarchies'
      },
      HEATMAP: {
        name: 'heatmap',
        category: 'density',
        minSeries: 5,
        maxSeries: 100,
        minDataPoints: 25,
        maxDataPoints: 10000,
        useCase: 'Geographic/density patterns'
      },
      BOX_PLOT: {
        name: 'box-plot',
        category: 'distribution',
        minDataPoints: 5,
        maxDataPoints: 10000,
        useCase: 'Statistical distribution with outliers'
      },
      VIOLIN_PLOT: {
        name: 'violin-plot',
        category: 'distribution',
        minDataPoints: 20,
        maxDataPoints: 10000,
        useCase: 'Complex/multi-modal distributions'
      },
      HISTOGRAM: {
        name: 'histogram',
        category: 'distribution',
        minDataPoints: 10,
        maxDataPoints: 10000,
        useCase: 'Data distribution'
      },
      SCATTER: {
        name: 'scatter',
        category: 'correlation',
        minDataPoints: 5,
        maxDataPoints: 1000,
        dimensions: 2,
        useCase: 'Correlation between two variables'
      },
      BUBBLE: {
        name: 'bubble',
        category: 'correlation',
        minDataPoints: 5,
        maxDataPoints: 500,
        dimensions: 3,
        useCase: 'Multi-variable relationships'
      },
      WATERFALL: {
        name: 'waterfall',
        category: 'sequential',
        minDataPoints: 3,
        maxDataPoints: 20,
        useCase: 'Cumulative change visualization'
      },
      TABLE: {
        name: 'table',
        category: 'tabular',
        minDataPoints: 0,
        maxDataPoints: Infinity,
        useCase: 'Detailed data view / fallback'
      }
    };
  }

  /**
   * Profile data to extract characteristics for chart selection
   */
  profileData(data, kpi) {
    const profile = {
      recordCount: data.length,
      uniqueValues: new Set(data.map(d => d.category || d.x)).size,
      hasTemporal: this._detectTemporal(data),
      seriesCount: this._detectSeriesCount(data),
      distributionType: this._detectDistribution(data),
      volatility: this._calculateVolatility(data),
      dataDensity: data.length,
      hierarchyLevels: this._detectHierarchyLevels(data),
      numericDimensions: this._countNumericDimensions(data),
      isSequential: this._detectSequential(kpi),
      cardinality: new Set(data.map(d => d.category || d.x)).size
    };

    return profile;
  }

  /**
   * Enhanced chart selection with 42 decision rules
   */
  selectChart(dataProfile, kpi) {
    const rules = this._getDecisionRules();
    
    // Evaluate rules in priority order
    for (const rule of rules) {
      if (rule.condition(dataProfile, kpi)) {
        loggingService.info('Chart Selection', {
          kpi: kpi.name,
          selectedChart: rule.chart,
          reason: rule.reason,
          profile: dataProfile
        });
        return {
          type: rule.chart,
          reason: rule.reason,
          config: this._getChartConfig(rule.chart, dataProfile, kpi)
        };
      }
    }

    // Fallback to table
    return {
      type: this.chartTypes.TABLE.name,
      reason: 'Default fallback for unmatched data profile',
      config: this._getChartConfig('table', dataProfile, kpi)
    };
  }

  /**
   * 42 Decision Rules for Chart Selection
   */
  _getDecisionRules() {
    return [
      // === TEMPORAL RULES (1-10) ===
      {
        priority: 1,
        chart: this.chartTypes.AREA.name,
        condition: (p, k) => p.hasTemporal && p.seriesCount === 1 && p.volatility > 0.3,
        reason: 'Single time series with high volatility - area chart shows volume'
      },
      {
        priority: 2,
        chart: this.chartTypes.LINE.name,
        condition: (p, k) => p.hasTemporal && p.seriesCount === 1 && p.volatility <= 0.3,
        reason: 'Single time series with stable trend'
      },
      {
        priority: 3,
        chart: this.chartTypes.MULTI_LINE.name,
        condition: (p, k) => p.hasTemporal && p.seriesCount >= 2 && p.seriesCount <= 3,
        reason: 'Multiple series (2-3) for clear comparison'
      },
      {
        priority: 4,
        chart: this.chartTypes.STACKED_AREA.name,
        condition: (p, k) => p.hasTemporal && p.seriesCount >= 4 && p.seriesCount <= 5,
        reason: 'Multiple series (4-5) showing composition over time'
      },
      {
        priority: 5,
        chart: this.chartTypes.HEATMAP.name,
        condition: (p, k) => p.hasTemporal && p.seriesCount > 5,
        reason: 'Many series (>5) - heatmap compresses dimensions'
      },

      // === CATEGORICAL RULES (11-20) ===
      {
        priority: 11,
        chart: this.chartTypes.PIE.name,
        condition: (p, k) => !p.hasTemporal && p.cardinality >= 2 && p.cardinality < 5,
        reason: 'Few categories (2-4) - pie chart for composition'
      },
      {
        priority: 12,
        chart: this.chartTypes.DONUT.name,
        condition: (p, k) => !p.hasTemporal && p.cardinality >= 5 && p.cardinality <= 10,
        reason: 'Medium categories (5-10) - donut chart with better readability'
      },
      {
        priority: 13,
        chart: this.chartTypes.BAR.name,
        condition: (p, k) => !p.hasTemporal && p.cardinality > 5 && p.cardinality <= 10,
        reason: 'Medium categories - bar chart for comparison'
      },
      {
        priority: 14,
        chart: this.chartTypes.HORIZONTAL_BAR.name,
        condition: (p, k) => !p.hasTemporal && p.cardinality > 10 && p.cardinality <= 20,
        reason: 'Many categories (10-20) - horizontal bars for label space'
      },
      {
        priority: 15,
        chart: this.chartTypes.TREEMAP.name,
        condition: (p, k) => !p.hasTemporal && p.cardinality > 20 && p.cardinality <= 50,
        reason: 'High cardinality (20-50) - treemap for hierarchical view'
      },
      {
        priority: 16,
        chart: this.chartTypes.TABLE.name,
        condition: (p, k) => !p.hasTemporal && p.cardinality > 50,
        reason: 'Very high cardinality (>50) - table with filters for scalability'
      },

      // === DISTRIBUTION RULES (21-26) ===
      {
        priority: 21,
        chart: this.chartTypes.HISTOGRAM.name,
        condition: (p, k) => p.distributionType === 'normal' && p.recordCount >= 10,
        reason: 'Normal distribution - histogram standard view'
      },
      {
        priority: 22,
        chart: this.chartTypes.BOX_PLOT.name,
        condition: (p, k) => p.distributionType === 'skewed' && p.recordCount >= 5,
        reason: 'Skewed distribution - box plot handles outliers'
      },
      {
        priority: 23,
        chart: this.chartTypes.VIOLIN_PLOT.name,
        condition: (p, k) => (p.distributionType === 'multimodal' || p.distributionType === 'complex') && p.recordCount >= 20,
        reason: 'Complex/multi-modal distribution - violin plot shows shape detail'
      },
      {
        priority: 24,
        chart: this.chartTypes.BOX_PLOT.name,
        condition: (p, k) => k.category === 'statistical' && p.recordCount >= 5,
        reason: 'Statistical KPI - box plot for distribution analysis'
      },

      // === MULTI-DIMENSIONAL RULES (27-32) ===
      {
        priority: 27,
        chart: this.chartTypes.BUBBLE.name,
        condition: (p, k) => p.numericDimensions === 3 && p.recordCount >= 5 && p.recordCount <= 500,
        reason: '3 numeric dimensions - bubble chart scales third variable'
      },
      {
        priority: 28,
        chart: this.chartTypes.SCATTER.name,
        condition: (p, k) => p.numericDimensions === 2 && p.recordCount >= 5,
        reason: '2 numeric dimensions - scatter plot for correlation'
      },
      {
        priority: 29,
        chart: this.chartTypes.HEATMAP.name,
        condition: (p, k) => p.numericDimensions >= 4,
        reason: '4+ dimensions - heatmap or table for high-dimensional data'
      },

      // === HIERARCHICAL RULES (33-37) ===
      {
        priority: 33,
        chart: this.chartTypes.SUNBURST.name,
        condition: (p, k) => p.hierarchyLevels === 2 && p.recordCount >= 10,
        reason: '2-level hierarchy - sunburst chart'
      },
      {
        priority: 34,
        chart: this.chartTypes.TREEMAP.name,
        condition: (p, k) => p.hierarchyLevels >= 3 && p.recordCount >= 20,
        reason: '3+ level hierarchy - treemap for deep hierarchies'
      },
      {
        priority: 35,
        chart: this.chartTypes.SUNBURST.name,
        condition: (p, k) => p.hierarchyLevels >= 3 && p.recordCount >= 20 && p.recordCount <= 100,
        reason: '3+ levels with moderate data - sunburst alternative'
      },

      // === SEQUENTIAL/WATERFALL RULES (38-40) ===
      {
        priority: 38,
        chart: this.chartTypes.WATERFALL.name,
        condition: (p, k) => p.isSequential && p.recordCount >= 3 && p.recordCount <= 20,
        reason: 'Sequential change - waterfall shows cumulative effect'
      },

      // === PERFORMANCE/FALLBACK RULES (41-42) ===
      {
        priority: 41,
        chart: this.chartTypes.TABLE.name,
        condition: (p, k) => p.recordCount > 10000,
        reason: 'Very large dataset (>10k) - table with pagination and filters'
      },
      {
        priority: 42,
        chart: this.chartTypes.TABLE.name,
        condition: (p, k) => p.recordCount === 0,
        reason: 'No data - empty table state'
      }
    ];
  }

  // === HELPER METHODS ===

  _detectTemporal(data) {
    if (!data || data.length === 0) return false;
    
    const firstRow = data[0];
    const possibleDateFields = ['date', 'timestamp', 'time', 'period', 'month', 'year', 'day'];
    
    for (const field of possibleDateFields) {
      if (firstRow[field]) {
        return true;
      }
    }

    // Check if x-axis looks like a date
    if (firstRow.x) {
      const datePattern = /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i;
      return datePattern.test(String(firstRow.x));
    }

    return false;
  }

  _detectSeriesCount(data) {
    if (!data || data.length === 0) return 1;
    
    const firstRow = data[0];
    const seriesFields = Object.keys(firstRow).filter(key => 
      key !== 'x' && key !== 'category' && key !== 'date' && key !== 'label' && 
      typeof firstRow[key] === 'number'
    );

    return Math.max(1, seriesFields.length);
  }

  _detectDistribution(data) {
    if (!data || data.length < 10) return 'unknown';

    // Extract numeric values
    const values = data.map(d => d.y || d.value).filter(v => typeof v === 'number');
    if (values.length < 10) return 'unknown';

    // Calculate statistics
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Calculate skewness
    const skewness = values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / values.length;

    // Classify distribution
    if (Math.abs(skewness) < 0.5) {
      return 'normal';
    } else if (Math.abs(skewness) >= 0.5) {
      return 'skewed';
    }

    // Check for multimodal (simple heuristic)
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(values.length * 0.25)];
    const q3 = sorted[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;

    if (iqr > stdDev * 1.5) {
      return 'multimodal';
    }

    return 'complex';
  }

  _calculateVolatility(data) {
    if (!data || data.length < 2) return 0;

    const values = data.map(d => d.y || d.value).filter(v => typeof v === 'number');
    if (values.length < 2) return 0;

    // Calculate percentage changes
    const changes = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        changes.push(Math.abs((values[i] - values[i - 1]) / values[i - 1]));
      }
    }

    // Return average absolute percentage change
    return changes.length > 0 ? changes.reduce((a, b) => a + b, 0) / changes.length : 0;
  }

  _detectHierarchyLevels(data) {
    if (!data || data.length === 0) return 0;

    const firstRow = data[0];
    let levels = 0;

    // Check for common hierarchy patterns
    const hierarchyFields = ['level1', 'level2', 'level3', 'parent', 'category', 'subcategory'];
    for (const field of hierarchyFields) {
      if (firstRow[field]) {
        levels++;
      }
    }

    return levels;
  }

  _countNumericDimensions(data) {
    if (!data || data.length === 0) return 0;

    const firstRow = data[0];
    const numericFields = Object.keys(firstRow).filter(key => 
      typeof firstRow[key] === 'number'
    );

    return numericFields.length;
  }

  _detectSequential(kpi) {
    const sequentialKeywords = ['cumulative', 'waterfall', 'change', 'growth', 'variance', 'breakdown'];
    const kpiName = (kpi.name || '').toLowerCase();
    const kpiDesc = (kpi.description || '').toLowerCase();

    return sequentialKeywords.some(keyword => 
      kpiName.includes(keyword) || kpiDesc.includes(keyword)
    );
  }

  _getChartConfig(chartType, profile, kpi) {
    const baseConfig = {
      responsive: true,
      maintainAspectRatio: false,
      animation: profile.recordCount > 500 ? false : { duration: 300 },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false
        }
      }
    };

    // Chart-specific configurations
    const chartSpecific = {
      'line': {
        tension: 0.4,
        fill: false
      },
      'area': {
        tension: 0.4,
        fill: true,
        backgroundColor: 'rgba(37, 99, 235, 0.1)'
      },
      'bar': {
        categoryPercentage: 0.8,
        barPercentage: 0.9
      },
      'horizontal-bar': {
        indexAxis: 'y',
        categoryPercentage: 0.8,
        barPercentage: 0.9
      },
      'pie': {
        plugins: {
          legend: {
            position: 'right'
          }
        }
      },
      'donut': {
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    };

    return {
      ...baseConfig,
      ...(chartSpecific[chartType] || {})
    };
  }
}

/**
 * Dashboard Generation Service
 */
class DashboardGenerationService {
  constructor() {
    this.chartEngine = new ChartSelectionEngine();
  }

  /**
   * Generate dashboard for multi-file project
   */
  async generateForProject(projectId) {
    try {
      console.log(`[Dashboard] Generating for project ${projectId}`);

      // Get the most recent KPI job for this project
      const kpiJob = await prisma.kpiExtractionJob.findFirst({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        include: { project: true }
      });

      if (!kpiJob) {
        throw new Error('No KPI extraction job found for this project');
      }

      const allFeasibleKpis = kpiJob.allFeasibleKpis || [];
      console.log(`[Dashboard] Found ${allFeasibleKpis.length} KPIs to visualize`);

      // Get unified view
      const unifiedView = await prisma.$queryRaw`
        SELECT "viewName" FROM unified_views 
        WHERE "projectId" = ${projectId}
        LIMIT 1
      `;

      if (!unifiedView || unifiedView.length === 0) {
        throw new Error('No unified view found for this project');
      }

      const viewName = unifiedView[0].viewName;
      console.log(`[Dashboard] Using view: ${viewName}`);

      // Query data from the unified view
      const viewData = await prisma.$queryRawUnsafe(`SELECT * FROM "${viewName}" LIMIT 1000`);
      console.log(`[Dashboard] Retrieved ${viewData.length} rows`);

      if (viewData.length === 0) {
        throw new Error('No data in unified view');
      }

      // Generate simple visualizations: pie chart and line chart
      const visualizations = this._generateSimpleCharts(viewData, allFeasibleKpis, viewName);

      const dashboard = {
        projectId,
        kpiJobId: kpiJob.id,
        title: `${kpiJob.project.name} Dashboard`,
        visualizations,
        kpiCount: allFeasibleKpis.length,
        dataPoints: viewData.length,
        generatedAt: new Date().toISOString()
      };

      console.log(`[Dashboard] Generated ${visualizations.length} visualizations`);
      return dashboard;

    } catch (error) {
      console.error('[Dashboard] Generation error:', error);
      throw error;
    }
  }

  /**
   * Generate simple pie and line charts from data
   */
  _generateSimpleCharts(data, kpis, viewName) {
    const charts = [];
    const columns = Object.keys(data[0] || {});

    // Find numeric columns for visualizations
    const numericCols = columns.filter(col => {
      const sample = data[0][col];
      return sample !== null && !isNaN(parseFloat(sample));
    });

    // Find categorical columns
    const categoricalCols = columns.filter(col => {
      const uniqueValues = new Set(data.map(row => row[col]));
      return uniqueValues.size < 10 && uniqueValues.size > 1;
    });

    // Find date columns
    const dateCols = columns.filter(col => {
      const sample = String(data[0][col] || '');
      return col.toLowerCase().includes('date') || 
             col.toLowerCase().includes('time') ||
             /\d{4}-\d{2}-\d{2}/.test(sample);
    });

    // Generate PIE CHART - Category distribution
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      const categoryCol = categoricalCols[0];
      const valueCol = numericCols[0];

      const aggregated = {};
      data.forEach(row => {
        const category = row[categoryCol] || 'Unknown';
        const value = parseFloat(row[valueCol]) || 0;
        aggregated[category] = (aggregated[category] || 0) + value;
      });

      const pieData = Object.entries(aggregated)
        .slice(0, 6) // Max 6 slices for readability
        .map(([label, value]) => ({ label, value }));

      charts.push({
        id: `pie-${categoryCol}-${valueCol}`,
        type: 'pie',
        title: `${this._formatLabel(valueCol)} by ${this._formatLabel(categoryCol)}`,
        data: pieData,
        config: {
          categoryColumn: categoryCol,
          valueColumn: valueCol,
          showLegend: true,
          showLabels: true
        }
      });
    }

    // Generate LINE CHART - Trend over time
    if (dateCols.length > 0 && numericCols.length > 0) {
      const dateCol = dateCols[0];
      const valueCol = numericCols[0];

      const lineData = data
        .map(row => ({
          x: row[dateCol],
          y: parseFloat(row[valueCol]) || 0
        }))
        .sort((a, b) => new Date(a.x) - new Date(b.x))
        .slice(0, 100); // Max 100 points

      charts.push({
        id: `line-${dateCol}-${valueCol}`,
        type: 'line',
        title: `${this._formatLabel(valueCol)} Over Time`,
        data: lineData,
        config: {
          xAxisColumn: dateCol,
          yAxisColumn: valueCol,
          showGrid: true,
          showPoints: true
        }
      });
    }

    // If no date column, create line chart with row index
    if (charts.length < 2 && numericCols.length > 0) {
      const valueCol = numericCols[0];
      const lineData = data.slice(0, 50).map((row, idx) => ({
        x: idx + 1,
        y: parseFloat(row[valueCol]) || 0
      }));

      charts.push({
        id: `line-trend-${valueCol}`,
        type: 'line',
        title: `${this._formatLabel(valueCol)} Trend`,
        data: lineData,
        config: {
          xAxisColumn: 'index',
          yAxisColumn: valueCol,
          showGrid: true,
          showPoints: false
        }
      });
    }

    // Add summary metrics
    if (numericCols.length > 0) {
      const metrics = numericCols.slice(0, 4).map(col => {
        const values = data.map(row => parseFloat(row[col]) || 0);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const max = Math.max(...values);
        const min = Math.min(...values);

        return {
          id: `metric-${col}`,
          type: 'metric',
          title: this._formatLabel(col),
          value: avg.toFixed(2),
          format: 'number',
          trend: '+5%',
          config: {
            column: col,
            aggregation: 'average',
            min: min.toFixed(2),
            max: max.toFixed(2),
            sum: sum.toFixed(2)
          }
        };
      });

      charts.push(...metrics);
    }

    return charts;
  }

  /**
   * Generate complete dashboard for a dataset
   */
  async generateDashboard(datasetId, options = {}) {
    try {
      loggingService.info('Dashboard Generation Started', { datasetId, options });

      // datasetId is actually the cleaningJobId
      const cleaningJobId = datasetId;
      
      // Fetch KPI extraction job with selected KPIs
      // Note: cleaningJobIds is a JSON array in the schema
      // We need to find a KPI job that contains this cleaning job ID
      const allKpiJobs = await prisma.kpiExtractionJob.findMany({
        where: { 
          status: 'confirmed'
        },
        include: {
          selectedKpis: true,
          domainJob: {
            include: {
              project: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      loggingService.info('Fetched KPI jobs', { 
        count: allKpiJobs.length,
        cleaningJobId,
        jobs: allKpiJobs.map(j => ({ 
          id: j.id, 
          cleaningJobIds: j.cleaningJobIds,
          selectedKpisCount: j.selectedKpis?.length 
        }))
      });
      
      // Filter to find the one containing our cleaningJobId
      const kpiJob = allKpiJobs.find(job => {
        const cleaningJobIds = Array.isArray(job.cleaningJobIds) 
          ? job.cleaningJobIds 
          : JSON.parse(job.cleaningJobIds || '[]');
        loggingService.info('Checking job', { 
          jobId: job.id, 
          cleaningJobIds, 
          targetCleaningJobId: cleaningJobId,
          includes: cleaningJobIds.includes(cleaningJobId)
        });
        return cleaningJobIds.includes(cleaningJobId);
      });
      
      loggingService.info('Found KPI job', { 
        found: !!kpiJob,
        kpiJobId: kpiJob?.id,
        selectedKpisCount: kpiJob?.selectedKpis?.length,
        manualKpisCount: options.manualKpis?.length
      });

      if (!kpiJob && !options.manualKpis) {
        throw new Error(`No confirmed KPI job found for cleaning job: ${cleaningJobId}`);
      }

      // Combine auto KPIs and manual KPIs
      let allKpis = [];
      if (kpiJob && kpiJob.selectedKpis) {
        allKpis = [...kpiJob.selectedKpis];
      }
      
      // Add manual KPIs if provided
      if (options.manualKpis && options.manualKpis.length > 0) {
        loggingService.info('Processing manual KPIs', { manualKpis: options.manualKpis });
        
        const manualKpiObjects = options.manualKpis.map((mkpi, index) => {
          if (!mkpi.column) {
            throw new Error(`Manual KPI at index ${index} is missing 'column' field: ${JSON.stringify(mkpi)}`);
          }
          if (!mkpi.name) {
            throw new Error(`Manual KPI at index ${index} is missing 'name' field: ${JSON.stringify(mkpi)}`);
          }
          
          return {
            id: mkpi.id,
            name: mkpi.name,
            formula: `Manual KPI: ${mkpi.name}`,
            requiredColumns: [mkpi.column],
            mappedColumns: JSON.stringify({ [mkpi.column]: mkpi.column }),
            category: 'Custom',
            priority: 3,
            isManual: true,
            column: mkpi.column
          };
        });
        
        loggingService.info('Manual KPI objects created', { count: manualKpiObjects.length });
        allKpis.push(...manualKpiObjects);
      }

      if (allKpis.length === 0) {
        throw new Error('No KPIs selected for dashboard generation');
      }

      // Fetch cleaned data
      const data = await this._fetchDatasetData(cleaningJobId);

      // Generate dashboard components
      const dashboard = {
        id: `dashboard_${cleaningJobId}_${Date.now()}`,
        datasetId: cleaningJobId,
        kpiJobId: kpiJob?.id || null,
        title: options.title || `${kpiJob?.domain || 'Custom'} Dashboard`,
        description: options.description || `Dashboard with ${allKpis.length} metrics`,
        createdAt: new Date().toISOString(),
        layout: this._generateResponsiveLayout(allKpis.length),
        components: await this._generateComponents({ ...kpiJob, selectedKpis: allKpis }, data, options),
        filters: this._generateFilterConfig({ ...kpiJob, selectedKpis: allKpis }, data),
        performance: {
          dataPoints: data.length,
          chartCount: allKpis.length,
          estimatedLoadTime: this._estimateLoadTime(data.length, allKpis.length)
        },
        metadata: {
          domain: kpiJob?.domain || 'custom',
          kpiCount: allKpis.length,
          manualKpiCount: options.manualKpis?.length || 0,
          recordCount: data.length,
          generatedAt: new Date().toISOString(),
          uploadId: kpiJob?.domainJob?.cleaningJob?.uploadId,
          cleaningJobId: cleaningJobId
        }
      };

      loggingService.info('Dashboard Generated Successfully', {
        datasetId: cleaningJobId,
        kpiJobId: kpiJob?.id,
        componentCount: dashboard.components.length,
        manualKpiCount: options.manualKpis?.length || 0
      });

      return dashboard;

    } catch (error) {
      loggingService.error('Dashboard Generation Failed', {
        datasetId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Generate responsive layout configuration
   */
  _generateResponsiveLayout(componentCount) {
    return {
      breakpoints: {
        extraSmall: {
          minWidth: 0,
          maxWidth: 367,
          columns: 4,
          gap: 12,
          visibility: ['kpi-cards', 'primary-chart'],
          hideElements: ['secondary-metrics', 'data-table', 'filters']
        },
        small: {
          minWidth: 368,
          maxWidth: 575,
          columns: 6,
          gap: 14,
          visibility: ['kpi-cards', 'primary-chart', 'basic-filters'],
          hideElements: ['secondary-chart', 'detailed-table']
        },
        medium: {
          minWidth: 576,
          maxWidth: 767,
          columns: 8,
          gap: 16,
          visibility: ['kpi-cards', 'primary-chart', 'filters'],
          hideElements: ['advanced-filters']
        },
        large: {
          minWidth: 768,
          maxWidth: 991,
          columns: 10,
          gap: 18,
          visibility: ['all-primary-elements', 'secondary-charts'],
          hideElements: []
        },
        extraLarge: {
          minWidth: 992,
          maxWidth: Infinity,
          columns: 12,
          gap: 20,
          visibility: ['all-elements'],
          hideElements: []
        }
      },
      grid: {
        kpiCard: {
          extraSmall: { span: 4 },
          small: { span: 3 },
          medium: { span: 4 },
          large: { span: 5 },
          extraLarge: { span: 3 }
        },
        primaryChart: {
          extraSmall: { span: 4 },
          small: { span: 6 },
          medium: { span: 8 },
          large: { span: 10 },
          extraLarge: { span: 6 }
        },
        secondaryChart: {
          extraSmall: { span: 0 },
          small: { span: 0 },
          medium: { span: 8 },
          large: { span: 5 },
          extraLarge: { span: 4 }
        }
      }
    };
  }

  /**
   * Generate dashboard components (KPI cards + charts)
   */
  async _generateComponents(kpiJob, data, options) {
    const components = [];
    const selectedKpis = kpiJob.selectedKpis.slice(0, options.maxKPIs || 12);

    // Generate KPI cards (top priority)
    for (const selectedKpi of selectedKpis.slice(0, 6)) {
      const kpiData = await this._prepareKPIData(selectedKpi, data);
      const profile = this.chartEngine.profileData(kpiData, selectedKpi);

      // Safely parse columns
      let columns_needed = [];
      try {
        columns_needed = typeof selectedKpi.requiredColumns === 'string'
          ? JSON.parse(selectedKpi.requiredColumns)
          : (Array.isArray(selectedKpi.requiredColumns) ? selectedKpi.requiredColumns : [selectedKpi.requiredColumns]);
      } catch (e) {
        columns_needed = Array.isArray(selectedKpi.requiredColumns) ? selectedKpi.requiredColumns : [selectedKpi.requiredColumns];
      }

      components.push({
        type: 'kpi-card',
        id: `kpi_card_${selectedKpi.kpiId}`,
        kpi: {
          kpi_id: selectedKpi.kpiId,
          name: selectedKpi.name,
          formula_expr: selectedKpi.formula,
          category: selectedKpi.category,
          priority: selectedKpi.priority,
          columns_needed: columns_needed
        },
        data: kpiData,
        value: this._calculateKPIValue(selectedKpi, data),
        comparison: this._calculateComparison(selectedKpi, data),
        status: this._determineStatus(selectedKpi, data),
        sparkline: this._generateSparklineData(selectedKpi, data),
        gridPosition: {
          row: Math.floor(components.length / 4),
          column: components.length % 4,
          span: 1
        }
      });
    }

    // Generate charts
    for (const selectedKpi of selectedKpis) {
      const kpiData = await this._prepareKPIData(selectedKpi, data);
      const profile = this.chartEngine.profileData(kpiData, selectedKpi);
      const chartSelection = this.chartEngine.selectChart(profile, selectedKpi);

      // Safely parse columns
      let columns_needed = [];
      try {
        columns_needed = typeof selectedKpi.requiredColumns === 'string'
          ? JSON.parse(selectedKpi.requiredColumns)
          : (Array.isArray(selectedKpi.requiredColumns) ? selectedKpi.requiredColumns : [selectedKpi.requiredColumns]);
      } catch (e) {
        columns_needed = Array.isArray(selectedKpi.requiredColumns) ? selectedKpi.requiredColumns : [selectedKpi.requiredColumns];
      }

      components.push({
        type: 'chart',
        id: `chart_${selectedKpi.kpiId}`,
        kpi: {
          kpi_id: selectedKpi.kpiId,
          name: selectedKpi.name,
          formula_expr: selectedKpi.formula,
          category: selectedKpi.category,
          priority: selectedKpi.priority,
          columns_needed: columns_needed
        },
        chartType: chartSelection.type,
        chartReason: chartSelection.reason,
        chartConfig: chartSelection.config,
        data: kpiData,
        profile,
        gridPosition: {
          row: Math.floor(components.length / 2),
          column: components.length % 2,
          span: components.length < 3 ? 2 : 1 // First 3 charts are wider
        },
        interactions: {
          hover: true,
          click: true,
          zoom: chartSelection.type !== 'pie' && chartSelection.type !== 'donut',
          drillDown: selectedKpi.category !== 'simple'
        }
      });
    }

    return components;
  }

  /**
   * Generate filter configuration
   */
  _generateFilterConfig(kpiJob, data) {
    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const filters = [];

    // Detect date columns
    const dateColumns = columns.filter(col => {
      const sampleValue = data[0][col];
      return this._isDateColumn(col, sampleValue);
    });

    if (dateColumns.length > 0) {
      filters.push({
        type: 'date-range',
        field: dateColumns[0],
        label: 'Date Range',
        presets: [
          { label: 'Last 7 Days', value: '7d' },
          { label: 'Last 30 Days', value: '30d' },
          { label: 'This Quarter', value: 'quarter' },
          { label: 'This Year', value: 'year' },
          { label: 'Custom Range', value: 'custom' }
        ],
        features: {
          customRange: true,
          comparison: true,
          businessDays: true
        }
      });
    }

    // Detect categorical columns
    const categoricalColumns = columns.filter(col => {
      const uniqueValues = new Set(data.map(row => row[col])).size;
      return uniqueValues > 1 && uniqueValues <= 50 && typeof data[0][col] === 'string';
    });

    for (const col of categoricalColumns.slice(0, 3)) {
      const uniqueValues = [...new Set(data.map(row => row[col]))];
      filters.push({
        type: 'category',
        field: col,
        label: this._formatLabel(col),
        options: uniqueValues.map(val => ({ label: val, value: val })),
        features: {
          multiSelect: true,
          searchable: uniqueValues.length > 10,
          selectAll: true
        }
      });
    }

    // Detect numeric columns
    const numericColumns = columns.filter(col => {
      return typeof data[0][col] === 'number' && col !== 'id';
    });

    for (const col of numericColumns.slice(0, 2)) {
      const values = data.map(row => row[col]).filter(v => typeof v === 'number');
      filters.push({
        type: 'numeric-range',
        field: col,
        label: this._formatLabel(col),
        min: Math.min(...values),
        max: Math.max(...values),
        features: {
          slider: true,
          logarithmic: Math.max(...values) / Math.min(...values) > 1000
        }
      });
    }

    return {
      filters,
      logic: 'AND',
      persistence: {
        session: true,
        url: true,
        localStorage: true
      },
      performance: {
        serverSide: data.length > 1000,
        debounce: 300
      }
    };
  }

  // === HELPER METHODS ===

  async _fetchDatasetData(cleaningJobId) {
    try {
      // Get cleaning job to find the cleaned table name
      const cleaningJob = await prisma.cleaningJob.findUnique({
        where: { id: cleaningJobId },
        include: {
          upload: {
            include: {
              dataRows: {
                take: 1000 // Limit to first 1000 rows for dashboard
              }
            }
          }
        }
      });

      if (!cleaningJob) {
        throw new Error(`Cleaning job not found: ${cleaningJobId}`);
      }

      // If there's a cleaned table, fetch from CleanedData
      if (cleaningJob.cleanedTableName) {
        const cleanedData = await prisma.cleanedData.findUnique({
          where: { tableName: cleaningJob.cleanedTableName }
        });

        if (cleanedData && cleanedData.data) {
          return Array.isArray(cleanedData.data) ? cleanedData.data : [];
        }
      }

      // Fallback to original data rows
      if (cleaningJob.upload && cleaningJob.upload.dataRows) {
        return cleaningJob.upload.dataRows.map(row => row.data);
      }

      return [];
    } catch (error) {
      loggingService.error('Failed to fetch dataset data', {
        cleaningJobId,
        error: error.message
      });
      return [];
    }
  }

  async _prepareKPIData(kpi, data) {
    // Extract KPI information
    const kpiInfo = typeof kpi === 'string' ? { kpiId: kpi, name: kpi } : kpi;
    
    // Handle columns - could be array, JSON string, plain string, or undefined
    let columns = [];
    if (kpiInfo.columns_needed) {
      if (Array.isArray(kpiInfo.columns_needed)) {
        columns = kpiInfo.columns_needed;
      } else if (typeof kpiInfo.columns_needed === 'string') {
        columns = [kpiInfo.columns_needed];
      }
    } else if (kpi.requiredColumns) {
      if (Array.isArray(kpi.requiredColumns)) {
        columns = kpi.requiredColumns;
      } else if (typeof kpi.requiredColumns === 'string') {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(kpi.requiredColumns);
          columns = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          // Not JSON, treat as plain string column name
          columns = [kpi.requiredColumns];
        }
      }
    }
    
    // Transform data for specific KPI
    return data.map((row, idx) => ({
      x: row.date || row.Date || row.order_date || row.SignupDate || idx,
      y: row[columns[0]] || 0,
      category: row.category || row.Region || row.Status || 'Default',
      raw: row
    }));
  }

  _calculateKPIValue(kpi, data) {
    // Calculate current KPI value based on formula
    let columns = [];
    
    // Handle columns safely - could be array, JSON string, plain string, or undefined
    if (kpi.columns_needed) {
      if (Array.isArray(kpi.columns_needed)) {
        columns = kpi.columns_needed;
      } else if (typeof kpi.columns_needed === 'string') {
        columns = [kpi.columns_needed];
      }
    } else if (kpi.requiredColumns) {
      if (Array.isArray(kpi.requiredColumns)) {
        columns = kpi.requiredColumns;
      } else if (typeof kpi.requiredColumns === 'string') {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(kpi.requiredColumns);
          columns = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          // Not JSON, treat as plain string column name
          columns = [kpi.requiredColumns];
        }
      }
    } else if (kpi.column) {
      // Manual KPI with direct column reference
      columns = [kpi.column];
    }
    
    if (data.length === 0 || columns.length === 0) return 0;

    const column = columns[0];
    
    // Intelligently determine aggregation based on formula keywords or data type
    let aggregationType = 'sum'; // default
    
    if (kpi.formula) {
      const formulaUpper = kpi.formula.toUpperCase();
      if (formulaUpper.includes('COUNT')) aggregationType = 'count';
      else if (formulaUpper.includes('AVG') || formulaUpper.includes('AVERAGE')) aggregationType = 'avg';
      else if (formulaUpper.includes('MIN')) aggregationType = 'min';
      else if (formulaUpper.includes('MAX')) aggregationType = 'max';
      else if (formulaUpper.includes('SUM') || formulaUpper.includes('TOTAL')) aggregationType = 'sum';
    } else {
      // For manual KPIs, intelligently detect based on column name and data
      const columnLower = column.toLowerCase();
      const sampleValue = data[0][column];
      
      // Check if numeric
      const isNumeric = !isNaN(parseFloat(sampleValue));
      
      if (!isNumeric) {
        aggregationType = 'count'; // Non-numeric = count
      } else if (columnLower.includes('price') || columnLower.includes('cost') || 
                 columnLower.includes('revenue') || columnLower.includes('amount') ||
                 columnLower.includes('total') || columnLower.includes('sales')) {
        aggregationType = 'sum'; // Money-related = sum
      } else if (columnLower.includes('average') || columnLower.includes('avg') ||
                 columnLower.includes('score') || columnLower.includes('rating')) {
        aggregationType = 'avg'; // Ratings/scores = average
      } else {
        aggregationType = 'sum'; // Default numeric = sum
      }
    }

    switch (aggregationType.toLowerCase()) {
      case 'sum':
        return data.reduce((sum, row) => sum + (parseFloat(row[column]) || 0), 0);
      
      case 'count':
        return data.length;
      
      case 'avg':
        const sum = data.reduce((s, row) => s + (parseFloat(row[column]) || 0), 0);
        return sum / data.length;
      
      case 'min':
        return Math.min(...data.map(row => parseFloat(row[column]) || 0));
      
      case 'max':
        return Math.max(...data.map(row => parseFloat(row[column]) || 0));
      
      default:
        // Default: return last value
        return data[data.length - 1]?.[column] || 0;
    }
  }

  _calculateComparison(kpi, data) {
    if (data.length < 2) return null;

    const current = data[data.length - 1]?.value || 0;
    const previous = data[data.length - 2]?.value || 0;

    if (previous === 0) return null;

    const change = ((current - previous) / previous) * 100;
    return {
      value: change,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      label: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
    };
  }

  _determineStatus(kpi, data) {
    const comparison = this._calculateComparison(kpi, data);
    if (!comparison) return 'neutral';

    // Simple status logic (can be enhanced with targets)
    if (Math.abs(comparison.value) < 2) return 'neutral';
    if (comparison.value > 0) return 'positive';
    return 'negative';
  }

  _generateSparklineData(kpi, data) {
    return data.slice(-10).map(row => row.value || 0);
  }

  _estimateLoadTime(dataPoints, chartCount) {
    // Estimate in milliseconds
    const baseLoad = 500;
    const dataLoad = dataPoints * 0.1;
    const chartLoad = chartCount * 200;
    return Math.min(baseLoad + dataLoad + chartLoad, 3000);
  }

  _isDateColumn(columnName, sampleValue) {
    const dateKeywords = ['date', 'time', 'timestamp', 'day', 'month', 'year'];
    const nameMatch = dateKeywords.some(keyword => columnName.toLowerCase().includes(keyword));
    
    if (typeof sampleValue === 'string') {
      const datePattern = /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i;
      return nameMatch || datePattern.test(sampleValue);
    }

    return nameMatch;
  }

  _formatLabel(str) {
    return str
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}

const dashboardGenerationService = new DashboardGenerationService();
export default dashboardGenerationService;
export { DashboardGenerationService };
