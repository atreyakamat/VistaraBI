// Module 5B — Data Execution Engine Types
// Structured response contracts for chart-ready payloads

import type { KPIExplanation, DataProfile, ChartType, ChartLibrary } from '../dashboard/types';
import type { KPIDataPoint, TimeGranularity, Filter } from '../visualization/types';

// ─── Response Contract ────────────────────────────────────────────

export interface KPIExecutionResult {
    kpiId: string;
    kpiName: string;
    category: string;

    // Values
    primaryValue: number;
    previousValue: number | null;
    delta: number | null;
    deltaPercent: number | null;
    deltaDirection: 'up' | 'down' | 'flat' | null;

    // Dataset
    dataset: KPIDataPoint[];
    datasetSize: number;

    // Profiling
    profiling: DataProfilingResult;

    // Chart recommendation
    recommendedChartType: ChartType;
    recommendedChartLibrary: ChartLibrary;
    disableAnimation: boolean;

    // AI explanation
    aiExplanation: KPIExplanation | null;

    // Lineage
    lineage: {
        tables: string[];
        joins: { from: string; to: string; on: string }[];
        formula: string;
        aggregations: string[];
    };

    // Performance
    performance: ExecutionPerformance;
}

// ─── Data Profiling ───────────────────────────────────────────────

export interface DataProfilingResult {
    recordCount: number;
    uniqueCategoryCount: number;
    numberOfSeries: number;
    hasTimeDimension: boolean;
    numericDimensionCount: number;
    hierarchicalDepth: number;
    volatilityIndex: number;          // stddev / mean
    distributionSkew: number;         // Pearson skewness
    cardinalityLevel: 'low' | 'medium' | 'high' | 'very_high';
    isSequentialChange: boolean;
}

// ─── Performance Metadata ─────────────────────────────────────────

export interface ExecutionPerformance {
    totalTimeMs: number;
    dataLoadTimeMs: number;
    computeTimeMs: number;
    profilingTimeMs: number;
    cacheHit: boolean;
    cacheKey: string | null;
    // New SQL Execution metrics
    queryTimeMs?: number;
    rowsReturned?: number;
    executionMethod?: 'sql' | 'memory-fallback';
    executionContext?: 'primary' | 'comparison' | 'drill-down';
}

// ─── Cache Types ──────────────────────────────────────────────────

export interface CacheEntry<T> {
    data: T;
    createdAt: number;          // Date.now()
    ttlMs: number;
    key: string;
}

// ─── Dashboard Execution Result ───────────────────────────────────

export interface DashboardExecutionResult {
    projectId: string;
    kpis: KPIExecutionResult[];
    appliedFilters: Filter[];
    granularity: TimeGranularity;
    computedAt: string;
    metadata: {
        totalKPIs: number;
        computedKPIs: number;
        skippedKPIs: number;
        totalTimeMs: number;
        cacheHitCount: number;
        cacheMissCount: number;
    };
}

// ─── Execution Options ────────────────────────────────────────────

export interface ExecutionOptions {
    granularity?: TimeGranularity;
    filters?: Filter[];
    groupBy?: string;
    dateFrom?: string;
    dateTo?: string;
    skipCache?: boolean;
    skipAIExplanation?: boolean;
}

// ─── Error Payload ────────────────────────────────────────────────

export interface ExecutionErrorPayload {
    status: 'error';
    message: string;
    kpiId?: string;
    recoverable: boolean;
}
