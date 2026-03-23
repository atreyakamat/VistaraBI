/**
 * prisma-json-schemas.ts — Zod Schemas for Prisma JSON Columns
 *
 * Provides runtime validation for all Json-typed Prisma columns.
 * Usage:
 *   import { DashboardConfigSectionsSchema, safeParseDashboardSections } from '@/lib/prisma/json-schemas';
 *
 * Prisma returns Json columns as `unknown` at runtime, so we must
 * parse and validate before consumption in application logic.
 */

import { z } from 'zod';

// ─── LineageDefinition.tables / .joins ────────────────────────────────────────

export const LineageJoinSchema = z.object({
    leftTable: z.string(),
    rightTable: z.string(),
    leftColumn: z.string(),
    rightColumn: z.string(),
    joinType: z.enum(['INNER', 'LEFT', 'RIGHT', 'FULL']).optional(),
});

export const LineageTablesSchema = z.array(z.string());
export const LineageJoinsSchema = z.array(LineageJoinSchema);

// ─── DashboardConfig.sections ─────────────────────────────────────────────────

export const ChartSelectionSchema = z.object({
    chartType: z.string(),
    chartLibrary: z.string(),
    fallbackType: z.string(),
    fallbackLibrary: z.string(),
    confidence: z.number().min(0).max(1),
    reason: z.string(),
});

export const DashboardCardConfigSchema = z.object({
    kpiId: z.string(),
    kpiName: z.string(),
    formula: z.string().optional(),
    category: z.string().optional(),
    cardSize: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional(),
    position: z.number().int().nonnegative(),
    confidence: z.number().min(0).max(1).optional(),
    chartSelection: ChartSelectionSchema.optional(),
});

export const DashboardSectionConfigSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    order: z.number().int().nonnegative(),
    collapsed: z.boolean().default(false),
    cards: z.array(DashboardCardConfigSchema),
});

export const DashboardSectionsSchema = z.array(DashboardSectionConfigSchema);

// ─── DashboardConfig.metadata ─────────────────────────────────────────────────

export const DashboardMetadataSchema = z.object({
    domain: z.string(),
    domainName: z.string(),
    domainIcon: z.string().optional(),
    domainColor: z.string().optional(),
    totalKPIs: z.number().int().nonnegative(),
    totalSections: z.number().int().nonnegative(),
    generatedAt: z.string(),
    version: z.number().int().positive(),
});

// ─── DashboardConfig.sidebarConfig ────────────────────────────────────────────

export const SidebarItemSchema = z.object({
    id: z.string(),
    label: z.string(),
    icon: z.string().optional(),
    href: z.string().optional(),
});

export const SidebarConfigSchema = z.object({
    projectId: z.string(),
    projectName: z.string(),
    items: z.array(SidebarItemSchema),
});

// ─── DashboardState.globalFilters ─────────────────────────────────────────────

export const GlobalFilterSchema = z.union([
    z.object({
        type: z.literal('date_range'),
        column: z.string(),
        from: z.string().optional(),
        to: z.string().optional(),
    }),
    z.object({
        type: z.literal('category'),
        column: z.string(),
        values: z.array(z.string()),
    }),
    z.object({
        type: z.literal('value'),
        column: z.string(),
        operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']),
        value: z.union([z.string(), z.number()]),
    }),
]);

export const GlobalFiltersSchema = z.array(GlobalFilterSchema);

// ─── DashboardCard.filterOverrides ────────────────────────────────────────────

export const CardFilterOverrideSchema = z.object({
    type: z.string(),
    column: z.string(),
    value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
});

export const CardFilterOverridesSchema = z.array(CardFilterOverrideSchema);

// ─── DomainDetection.scoringBreakdown ────────────────────────────────────────

export const ScoringBreakdownSchema = z.record(z.string(), z.number());

// ─── KPIDiscovery.computableKPIs / .partialKPIs ───────────────────────────────

export const KPIDiscoveryItemSchema = z.object({
    name: z.string(),
    formula: z.string().optional(),
    category: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    requiredColumns: z.array(z.string()).optional(),
    missingColumns: z.array(z.string()).optional(),
});

// ─── KPILineageRegistry.entries ───────────────────────────────────────────────

export const LineageRegistryEntrySchema = z.object({
    kpiId: z.string(),
    kpiName: z.string(),
    sourceTable: z.string(),
    tables: LineageTablesSchema,
    joins: LineageJoinsSchema,
    formula: z.string().optional(),
    aggregations: z.array(z.string()).optional(),
    sources: z.array(z.object({
        sourceId: z.string(),
        sourceName: z.string(),
        columns: z.array(z.string()),
    })).optional(),
});

export const KPILineageRegistryEntriesSchema = z.array(LineageRegistryEntrySchema);

// ─── ProjectGoal.generatedPlan ────────────────────────────────────────────────

export const GeneratedPlanSchema = z.object({
    goal: z.object({
        rawText: z.string(),
        targetMetric: z.string().optional(),
        targetValue: z.string().optional(),
        timeframe: z.string().optional(),
    }).optional(),
    actions: z.array(z.object({
        actionName: z.string(),
        tier: z.string().optional(),
        scenarios: z.array(z.unknown()).optional(),
    })).optional(),
}).passthrough(); // Allow extra fields as the plan can evolve

// ─── ColumnMeta.sampleValues ─────────────────────────────────────────────────

export const SampleValuesSchema = z.array(z.unknown());

// ─── Source.data ─────────────────────────────────────────────────────────────
// Source data is an array of arbitrary row objects

export const SourceDataSchema = z.array(z.record(z.string(), z.unknown()));

// ─── OutlierRecord.value ─────────────────────────────────────────────────────

export const OutlierValueSchema = z.union([z.string(), z.number(), z.null()]);

// ─── Safe Parse Helpers ───────────────────────────────────────────────────────
// Use these in API routes and server components when reading Prisma JSON fields.

export function safeParseDashboardSections(raw: unknown) {
    return DashboardSectionsSchema.safeParse(raw);
}

export function safeParseDashboardMetadata(raw: unknown) {
    return DashboardMetadataSchema.safeParse(raw);
}

export function safeParseGlobalFilters(raw: unknown) {
    return GlobalFiltersSchema.safeParse(raw);
}

export function safeParseLineageEntries(raw: unknown) {
    return KPILineageRegistryEntriesSchema.safeParse(raw);
}

export function safeParseGeneratedPlan(raw: unknown) {
    return GeneratedPlanSchema.safeParse(raw);
}

export function safeParseSourceData(raw: unknown) {
    return SourceDataSchema.safeParse(raw);
}
