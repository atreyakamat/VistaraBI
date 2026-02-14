// Module 5B — Visualization & Interaction Engine
// Type definitions for live dashboard data, filters, and interactions

// ─── Time Granularity ─────────────────────────────────────────────

export type TimeGranularity = 'daily' | 'weekly' | 'monthly' | 'quarterly';

// ─── KPI Computed Result ──────────────────────────────────────────

export interface KPIDataPoint {
    label: string;           // X-axis label (date, category, etc.)
    value: number;           // Y-axis value
    metadata?: Record<string, unknown>; // Optional extra info
}

export interface KPIDataResult {
    kpiId: string;
    kpiName: string;
    formula: string;
    category: string;
    currentValue: number;         // Latest computed value
    previousValue?: number;       // Previous period value (for trend)
    trend?: 'up' | 'down' | 'flat';
    trendPercent?: number;        // % change
    dataPoints: KPIDataPoint[];   // Time series or grouped data
    computedAt: string;           // ISO timestamp
}

// ─── Chart Data Payload ───────────────────────────────────────────

export interface ChartDataPayload {
    kpiId: string;
    kpiName: string;
    chartType: string;            // From Module 5A inference
    cardSize: string;             // From Module 5A inference
    sectionId: string;
    data: KPIDataResult;
    availableDrillDowns: string[]; // Columns available for drill-down
    availableGroupBys: string[];   // Columns available for grouping
}

// ─── Filter State ─────────────────────────────────────────────────

export interface DateRangeFilter {
    type: 'date_range';
    column: string;
    from?: string;                // ISO date string
    to?: string;                  // ISO date string
}

export interface CategoryFilter {
    type: 'category';
    column: string;
    values: string[];             // Selected category values
}

export interface ValueFilter {
    type: 'value';
    column: string;
    operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
    value: number | string;
}

export type Filter = DateRangeFilter | CategoryFilter | ValueFilter;

export interface FilterState {
    filters: Filter[];
    granularity: TimeGranularity;
}

// ─── Drill-Down ───────────────────────────────────────────────────

export interface DrillDownStep {
    column: string;
    value: string;
}

export interface DrillDownPath {
    kpiId: string;
    steps: DrillDownStep[];       // Breadcrumb: e.g., [{col: 'region', val: 'US'}, {col: 'city', val: 'NY'}]
    groupByColumn?: string;       // Next level to group by
}

// ─── Cross-Filter Event ───────────────────────────────────────────

export interface CrossFilterEvent {
    sourceKpiId: string;          // KPI that triggered the filter
    sourceChartType: string;
    selectedColumn: string;
    selectedValue: string | number;
    affectedKpiIds: string[];     // KPIs that should update
}

// ─── Dashboard Data Payload ───────────────────────────────────────

export interface DashboardDataPayload {
    projectId: string;
    charts: ChartDataPayload[];
    appliedFilters: FilterState;
    drillDownPaths: DrillDownPath[];
    computedAt: string;
    metadata: {
        totalKPIs: number;
        computedKPIs: number;
        skippedKPIs: number;       // KPIs with insufficient data
        executionTimeMs: number;
    };
}

// ─── Internal Data Types ──────────────────────────────────────────

export type DataRow = Record<string, unknown>;

export interface SourceDataMap {
    sourceId: string;
    sourceName: string;
    columns: string[];
    rows: DataRow[];
}

export interface ProjectDataMap {
    projectId: string;
    sources: Map<string, SourceDataMap>;
}
