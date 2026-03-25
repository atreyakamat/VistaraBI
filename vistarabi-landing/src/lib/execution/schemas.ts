import { z } from 'zod';
import { ChartTypeSchema, ChartLibrarySchema, KPIExplanationSchema } from '../dashboard/schemas';

// ─── Filter Schemas ───────────────────────────────────────────────

export const CategoryFilterSchema = z.object({
    type: z.literal('category'),
    column: z.string(),
    values: z.array(z.string()),
});

export const ValueFilterSchema = z.object({
    type: z.literal('value'),
    column: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
});

export const DateFilterSchema = z.object({
    type: z.literal('date'),
    column: z.string(),
    from: z.string().optional(),
    to: z.string().optional(),
});

export const FilterSchema = z.discriminatedUnion('type', [
    CategoryFilterSchema,
    ValueFilterSchema,
    DateFilterSchema,
]);

// ─── Execution Options ────────────────────────────────────────────

export const TimeGranularitySchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);

export const ExecutionOptionsSchema = z.object({
    granularity: TimeGranularitySchema.optional(),
    filters: z.array(FilterSchema).optional(),
    groupBy: z.string().optional(),
    dateColumn: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    skipCache: z.boolean().optional(),
    skipAIExplanation: z.boolean().optional(),
});

export const ExecutionFiltersSchema = z.object({
    dateColumn: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    categoryFilters: z.array(z.object({
        column: z.string(),
        values: z.array(z.string()),
    })).optional(),
    equalsFilters: z.array(z.object({
        column: z.string(),
        value: z.string(),
    })).optional(),
});

// ─── Execution Result Schemas ─────────────────────────────────────

export const KPIDataPointSchema = z.object({
    label: z.string(),
    value: z.number(),
    date: z.string().optional(),
}).passthrough(); // Allow extra fields from grouping

export const DataProfilingResultSchema = z.object({
    recordCount: z.number(),
    uniqueCategoryCount: z.number(),
    numberOfSeries: z.number(),
    hasTimeDimension: z.boolean(),
    numericDimensionCount: z.number(),
    hierarchicalDepth: z.number(),
    volatilityIndex: z.number(),
    distributionSkew: z.number(),
    cardinalityLevel: z.enum(['low', 'medium', 'high', 'very_high']),
    isSequentialChange: z.boolean(),
});

export const ExecutionPerformanceSchema = z.object({
    totalTimeMs: z.number(),
    dataLoadTimeMs: z.number(),
    computeTimeMs: z.number(),
    profilingTimeMs: z.number(),
    cacheHit: z.boolean(),
    cacheKey: z.string().nullable(),
    queryTimeMs: z.number().optional(),
    rowsReturned: z.number().optional(),
    executionMethod: z.enum(['sql', 'memory-fallback']).optional(),
    executionContext: z.enum(['primary', 'comparison', 'drill-down']).optional(),
});

export const KPIExecutionResultSchema = z.object({
    kpiId: z.string(),
    kpiName: z.string(),
    category: z.string(),
    primaryValue: z.number(),
    previousValue: z.number().nullable(),
    delta: z.number().nullable(),
    deltaPercent: z.number().nullable(),
    deltaDirection: z.enum(['up', 'down', 'flat']).nullable(),
    dataset: z.array(KPIDataPointSchema),
    datasetSize: z.number(),
    profiling: DataProfilingResultSchema,
    recommendedChartType: ChartTypeSchema,
    recommendedChartLibrary: ChartLibrarySchema,
    disableAnimation: z.boolean(),
    aiExplanation: KPIExplanationSchema.nullable(),
    lineage: z.object({
        tables: z.array(z.string()),
        joins: z.array(z.object({
            from: z.string(),
            to: z.string(),
            on: z.string(),
        })),
        formula: z.string(),
        aggregations: z.array(z.string()),
    }),
    performance: ExecutionPerformanceSchema,
});
