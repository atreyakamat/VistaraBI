// src/lib/kpi/domain-metadata.ts

export type TimeGranularity = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type AggregationFn = 'sum' | 'avg' | 'count' | 'max' | 'min';

export interface KPIMetadata {
    id: string; // Typical name or category
    unit: string;
    aggregationFn: AggregationFn;
    defaultGranularity: TimeGranularity;
    defaultTrendWindowMonths: number;
    domainCategory: string;
}

/**
 * Domain-specific metadata for common Retail/Business KPIs.
 * This powers intelligent defaults in Ask AI when the user doesn't specify
 * time ranges or granularities.
 */
export const RETAIL_KPI_METADATA: Record<string, KPIMetadata> = {
    'Revenue': {
        id: 'Revenue',
        unit: 'currency',
        aggregationFn: 'sum',
        defaultGranularity: 'monthly',
        defaultTrendWindowMonths: 12,
        domainCategory: 'Financials'
    },
    'Profit': {
        id: 'Profit',
        unit: 'currency',
        aggregationFn: 'sum',
        defaultGranularity: 'monthly',
        defaultTrendWindowMonths: 24,
        domainCategory: 'Financials'
    },
    'Gross Margin': {
        id: 'Gross Margin',
        unit: 'percentage',
        aggregationFn: 'avg',
        defaultGranularity: 'monthly',
        defaultTrendWindowMonths: 12,
        domainCategory: 'Financials'
    },
    'Customer Acquisition Cost': {
        id: 'Customer Acquisition Cost',
        unit: 'currency',
        aggregationFn: 'avg',
        defaultGranularity: 'monthly',
        defaultTrendWindowMonths: 12,
        domainCategory: 'Marketing'
    },
    'CAC': {
        id: 'CAC',
        unit: 'currency',
        aggregationFn: 'avg',
        defaultGranularity: 'monthly',
        defaultTrendWindowMonths: 12,
        domainCategory: 'Marketing'
    },
    'Average Order Value': {
        id: 'Average Order Value',
        unit: 'currency',
        aggregationFn: 'avg',
        defaultGranularity: 'monthly',
        defaultTrendWindowMonths: 12,
        domainCategory: 'Sales'
    },
    'AOV': {
        id: 'AOV',
        unit: 'currency',
        aggregationFn: 'avg',
        defaultGranularity: 'monthly',
        defaultTrendWindowMonths: 12,
        domainCategory: 'Sales'
    },
    'Customer Count': {
        id: 'Customer Count',
        unit: 'number',
        aggregationFn: 'count',
        defaultGranularity: 'monthly',
        defaultTrendWindowMonths: 12,
        domainCategory: 'Customers'
    },
    'Repeat Rate': {
        id: 'Repeat Rate',
        unit: 'percentage',
        aggregationFn: 'avg',
        defaultGranularity: 'monthly',
        defaultTrendWindowMonths: 12,
        domainCategory: 'Customers'
    },
    'Inventory Turnover': {
        id: 'Inventory Turnover',
        unit: 'number',
        aggregationFn: 'avg',
        defaultGranularity: 'quarterly',
        defaultTrendWindowMonths: 24,
        domainCategory: 'Operations'
    }
};

/**
 * Helper to fetch metadata for a given KPI name, falling back to a safe default.
 */
export function getKPIMetadata(kpiName: string): KPIMetadata {
    const normalized = kpiName.trim();
    // Case-insensitive exact match
    const key = Object.keys(RETAIL_KPI_METADATA).find(k => k.toLowerCase() === normalized.toLowerCase());

    if (key) {
        return RETAIL_KPI_METADATA[key];
    }

    // Default Fallback
    return {
        id: 'Unknown',
        unit: 'number',
        aggregationFn: 'sum',
        defaultGranularity: 'monthly',
        defaultTrendWindowMonths: 12,
        domainCategory: 'General'
    };
}
