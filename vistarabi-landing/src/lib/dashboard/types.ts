// Module 5A — Dashboard Types (Rebuilt)
// Production-grade type system for the Data Intelligence Interface

import type { DomainType } from '../prisma';

// ─── Chart Types ──────────────────────────────────────────────────

export type ChartType =
    // Chart.js (simple, fast)
    | 'line'
    | 'bar'
    | 'horizontal_bar'
    | 'pie'
    | 'doughnut'
    | 'area'
    | 'radar'
    | 'scatter'
    | 'bubble'
    // Plotly (advanced, interactive)
    | 'heatmap'
    | 'treemap'
    | 'sunburst'
    | 'waterfall'
    | 'box_plot'
    | 'violin'
    // Fallback
    | 'metric_card'
    | 'table';

export type ChartLibrary = 'chartjs' | 'plotly';

export type CardSize =
    | 'sm'    // 1/4 row
    | 'md'    // 1/2 row (default for 2×2)
    | 'lg'    // 3/4 row
    | 'full'; // Full row

// ─── Data Profiling ───────────────────────────────────────────────

export type DistributionType = 'normal' | 'skewed' | 'bimodal' | 'uniform' | 'unknown';
export type CardinalityLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface DataProfile {
    hasTimeDimension: boolean;
    numberOfSeries: number;
    uniqueCategoryCount: number;
    numericDimensionCount: number;
    hierarchicalDepth: number;
    recordCount: number;
    volatilityIndex: number;       // stddev / mean
    distributionType: DistributionType;
    cardinalityLevel: CardinalityLevel;
    isSequentialChange: boolean;
    dateColumn?: string;
    categoryColumns: string[];
    numericColumns: string[];
}

export interface ChartSelection {
    chartType: ChartType;
    chartLibrary: ChartLibrary;
    fallbackType: ChartType;
    fallbackLibrary: ChartLibrary;
    confidence: number;           // 0–1 selection confidence
    reason: string;               // Human-readable reasoning
}

// ─── KPI Card Configuration ──────────────────────────────────────

export interface DashboardKPICard {
    kpiId: string;
    kpiName: string;
    formula: string;
    category: string;
    chartSelection: ChartSelection;
    cardSize: CardSize;
    position: number;
    confidence: number;
    description?: string;
    colorAccent?: string;
}

// ─── Dashboard Section ───────────────────────────────────────────

export interface DashboardSection {
    id: string;
    title: string;
    description: string;
    icon: string;
    order: number;
    cards: DashboardKPICard[];
    collapsed: boolean;
}

// ─── Sidebar ─────────────────────────────────────────────────────

export interface SidebarItem {
    id: string;
    label: string;
    icon: string;
    route: string;
    enabled: boolean;
    badge?: string;
    children?: SidebarItem[];
}

export interface SidebarConfig {
    projectId: string;
    projectName: string;
    items: SidebarItem[];
}

// ─── Dashboard Metadata ──────────────────────────────────────────

export interface KPIExplanation {
    kpiId: string;
    explanation: string;
    formulaSummary: string;
    dataSourceRef: string;
    businessDefinition: string;
    recommendation?: string;
    generatedAt: string;
}

export interface DashboardMetadata {
    domain: DomainType | null;
    domainName: string;
    domainIcon: string;
    domainColor: string;
    totalKPIs: number;
    totalSections: number;
    generatedAt: string;
    version: number;
    kpiExplanations?: Record<string, KPIExplanation>;
}

// ─── Full Dashboard Config ───────────────────────────────────────

export interface DashboardConfigSchema {
    projectId: string;
    sections: DashboardSection[];
    sidebarConfig: SidebarConfig;
    metadata: DashboardMetadata;
    version: number;
}

// ─── KPI Data Point (Used by Execution Layer) ──────────────────────

export interface KPIDataPoint {
    label?: string;
    category?: string;
    date?: string;
    x?: string | number;
    y?: number;
    value?: number;
}
