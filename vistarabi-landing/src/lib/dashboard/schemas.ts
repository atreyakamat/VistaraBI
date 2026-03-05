import { z } from 'zod';

// ─── Basic Types ──────────────────────────────────────────────────

export const ChartTypeSchema = z.enum([
    'line', 'bar', 'horizontal_bar', 'pie', 'doughnut', 'area', 'radar', 'scatter', 'bubble',
    'heatmap', 'treemap', 'sunburst', 'waterfall', 'box_plot', 'violin',
    'metric_card', 'table'
]);

export const ChartLibrarySchema = z.enum(['chartjs', 'plotly']);

export const CardSizeSchema = z.enum(['sm', 'md', 'lg', 'full']);

// ─── Configuration Schemas ────────────────────────────────────────

export const ChartSelectionSchema = z.object({
    chartType: ChartTypeSchema,
    chartLibrary: ChartLibrarySchema,
    fallbackType: ChartTypeSchema,
    fallbackLibrary: ChartLibrarySchema,
    confidence: z.number().min(0).max(1),
    reason: z.string(),
});

export const DashboardKPICardSchema = z.object({
    kpiId: z.string(),
    kpiName: z.string(),
    formula: z.string(),
    category: z.string(),
    chartSelection: ChartSelectionSchema,
    cardSize: CardSizeSchema,
    position: z.number(),
    confidence: z.number().min(0).max(1),
    description: z.string().optional(),
    colorAccent: z.string().optional(),
});

export const DashboardSectionSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    icon: z.string(),
    order: z.number(),
    cards: z.array(DashboardKPICardSchema),
    collapsed: z.boolean(),
});

export const SidebarItemSchema: z.ZodType<any> = z.lazy(() => z.object({
    id: z.string(),
    label: z.string(),
    icon: z.string(),
    route: z.string(),
    enabled: z.boolean(),
    badge: z.string().optional(),
    children: z.array(SidebarItemSchema).optional(),
}));

export const SidebarConfigSchema = z.object({
    projectId: z.string(),
    projectName: z.string(),
    items: z.array(SidebarItemSchema),
});

export const KPIExplanationSchema = z.object({
    kpiId: z.string(),
    explanation: z.string(),
    formulaSummary: z.string(),
    dataSourceRef: z.string(),
    businessDefinition: z.string(),
    recommendation: z.string().optional(),
    generatedAt: z.string(),
});

export const DashboardMetadataSchema = z.object({
    domain: z.string().nullable(),
    domainName: z.string(),
    domainIcon: z.string(),
    domainColor: z.string(),
    totalKPIs: z.number(),
    totalSections: z.number(),
    generatedAt: z.string(),
    version: z.number(),
    kpiExplanations: z.record(z.string(), KPIExplanationSchema).optional(),
});

export const DashboardConfigSchema = z.object({
    projectId: z.string(),
    sections: z.array(DashboardSectionSchema),
    sidebarConfig: SidebarConfigSchema,
    metadata: DashboardMetadataSchema,
    version: z.number(),
});

// ─── State Schemas (Module 5.5) ───────────────────────────────────

export const NormalizedFilterSchema = z.object({
    type: z.enum(['category', 'date', 'value', 'range']),
    column: z.string(),
    values: z.array(z.string()).optional(),
    value: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    operator: z.string().optional(),
});

export const DashboardStateSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    domain: z.string(),
    version: z.number(),
    globalFilters: z.array(NormalizedFilterSchema),
    granularity: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
    createdAt: z.union([z.date(), z.string()]),
    updatedAt: z.union([z.date(), z.string()]),
});
