// Module 5.5 — Dashboard State Types
// All interfaces for the stateful dashboard intelligence layer.
// This sits ABOVE the existing execution engine — never imports from sql-compiler.

import type { ChartType, CardSize } from '@/lib/dashboard/types';
import type { TimeGranularity, Filter } from '@/lib/visualization/types';
import type { KPIExecutionResult } from '@/lib/execution/types';

// ─── Normalized Filter ────────────────────────────────────────────────────────
// The canonical filter format used throughout Module 5.5.
// Produced by the filter-interpreter; consumed by the execution engine.

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';
export type ComparisonMode = 'prev_period' | 'prev_year' | 'custom' | null;
export type FiscalYearConvention = 'april_march' | 'january_december';

export interface NormalizedDateFilter {
    type: 'date_range';
    column: string;         // Resolved column name in source table
    from: string;           // ISO date string 'YYYY-MM-DD'
    to: string;             // ISO date string 'YYYY-MM-DD'
    label: string;          // Human-readable e.g. "FY2025", "Last 30 days"
}

export interface NormalizedCategoryFilter {
    type: 'category';
    column: string;
    values: string[];
    label: string;
}

export interface NormalizedValueFilter {
    type: 'value';
    column: string;
    operator: FilterOperator;
    value: number | string;
    label: string;
}

export interface NormalizedRankFilter {
    type: 'rank';
    column: string;         // Column to rank by (e.g. 'revenue')
    limit: number;          // e.g. 5 for "Top 5"
    orderDir: 'asc' | 'desc';
    label: string;          // e.g. "Top 5 products"
}

export type NormalizedFilter =
    | NormalizedDateFilter
    | NormalizedCategoryFilter
    | NormalizedValueFilter
    | NormalizedRankFilter;

// ─── Business Filter Expression ───────────────────────────────────────────────
// Raw string from user input: "FY2025", "Last 30 days", "Revenue > 50000", etc.

export type BusinessFilterExpression = string;

// ─── Card Layout ──────────────────────────────────────────────────────────────

export interface CardLayout {
    position: number;       // Ordered index in the dashboard
    colSpan: 1 | 2 | 3 | 4;
    rowSpan: 1 | 2;
    cardSize: CardSize;
}

// ─── Dashboard Card State ─────────────────────────────────────────────────────

export interface DashboardCardState {
    id: string;
    stateId: string;
    kpiId: string;
    kpiName: string;
    chartType: ChartType;
    layout: CardLayout;
    groupBy: string | null;
    filterOverrides: NormalizedFilter[];    // Card-level filter overrides (on top of global)
    comparisonMode: ComparisonMode;
    isPinned: boolean;
    isAIGenerated: boolean;
    isDrillDown: boolean;
    parentCardId: string | null;
    createdAt: string;
    updatedAt: string;
}

// ─── Dashboard State Record ───────────────────────────────────────────────────

export interface DashboardStateRecord {
    id: string;
    projectId: string;
    domain: string;
    version: number;
    globalFilters: NormalizedFilter[];
    granularity: TimeGranularity;
    cards: DashboardCardState[];
    createdAt: string;
    updatedAt: string;
}

// ─── KPI Summary ──────────────────────────────────────────────────────────────

export type TrendLabel = 'significant_increase' | 'notable_increase' | 'stable' |
    'notable_decrease' | 'significant_decrease' | 'no_comparison';
export type ThresholdBand = 'high' | 'medium' | 'low' | 'none';

export interface KPISummary {
    headline: string;           // e.g. "Revenue increased 24% vs. last period"
    detail: string;             // e.g. "Current: ₹1.2M | Previous: ₹970K (high variability)"
    trendLabel: TrendLabel;
    thresholdBand: ThresholdBand;
    generatedAt: string;        // ISO timestamp
}

// ─── Anomaly Report ───────────────────────────────────────────────────────────

export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface AnomalyPoint {
    label: string;              // Data point label (date or category)
    value: number;
    zScore: number;
    severity: AnomalySeverity;
}

export interface AnomalyReport {
    detected: boolean;
    severity: AnomalySeverity;  // Worst point severity
    worstPoint: AnomalyPoint;
    affectedPoints: AnomalyPoint[];
    reasoning: string;          // e.g. "Value 58,221 is 3.1σ above the rolling mean of 12,450"
}

// ─── Anomaly Detection Config ─────────────────────────────────────────────────

export interface AnomalyConfig {
    zLowThreshold: number;      // Default: 2.0
    zHighThreshold: number;     // Default: 3.0
    minDataPoints: number;      // Default: 5 — below this, skip detection
    rollingWindowSize: number;  // Default: 5
}

// ─── Guardrail ────────────────────────────────────────────────────────────────

export interface GuardrailInfo {
    triggered: boolean;
    reason: string;
    fallbackChartType: ChartType;
    originalCount: number;
}

// ─── Enriched KPI Result ── adds Module 5.5 intelligence to execution output ──

export interface EnrichedKPIResult extends KPIExecutionResult {
    summary: KPISummary | null;
    anomaly: AnomalyReport | null;
    guardrail: GuardrailInfo | null;
}

// ─── Enriched Dashboard Result ────────────────────────────────────────────────

export interface EnrichedDashboardResult {
    projectId: string;
    domain: string;
    stateVersion: number;
    granularity: TimeGranularity;
    globalFilters: NormalizedFilter[];
    kpis: EnrichedKPIResult[];
    computedAt: string;
    metadata: {
        totalKPIs: number;
        computedKPIs: number;
        skippedKPIs: number;
        anomalyCount: number;
        cacheHitCount: number;
        totalTimeMs: number;
    };
}

// ─── Intelligence Options ─────────────────────────────────────────────────────

export interface DashboardIntelligenceOptions {
    businessFilters?: BusinessFilterExpression[];   // Raw user strings
    normalizedFilters?: NormalizedFilter[];          // Already-parsed filters (bypass interpreter)
    granularity?: TimeGranularity;
    skipCache?: boolean;
    skipAnomalyDetection?: boolean;
    skipSummaryGeneration?: boolean;
    fiscalYearConvention?: FiscalYearConvention;
    cardIds?: string[];     // If provided, only execute these specific cards
}

// ─── Drill-Down Request ───────────────────────────────────────────────────────

export interface DrillDownRequest {
    sourceCardId: string;
    selectedColumn: string;
    selectedValue: string;
    chartType?: ChartType;
}

// ─── Filter Validation Error ──────────────────────────────────────────────────

export class FilterValidationError extends Error {
    constructor(
        public readonly expression: BusinessFilterExpression,
        public readonly detail: string
    ) {
        super(`[FilterInterpreter] Cannot parse "${expression}": ${detail}`);
        this.name = 'FilterValidationError';
    }
}
