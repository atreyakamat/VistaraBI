// src/lib/kpi/domain-metadata.ts
// Complete KPI metadata for all 8 business domains.
// Powers intelligent AI defaults (time granularity, aggregation, trend windows)
// when the user doesn't specify those in natural language queries.

import type { DomainType } from '@/lib/prisma';

export type TimeGranularity = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type AggregationFn = 'sum' | 'avg' | 'count' | 'max' | 'min';

export interface KPIMetadata {
    id: string;
    unit: string;
    aggregationFn: AggregationFn;
    defaultGranularity: TimeGranularity;
    defaultTrendWindowMonths: number;
    domainCategory: string;
}

// ─── E-COMMERCE ──────────────────────────────────────────────────────────────

const ECOMMERCE_KPI_METADATA: Record<string, KPIMetadata> = {
    'Total Revenue': { id: 'Total Revenue', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Orders Count': { id: 'Orders Count', unit: 'count', aggregationFn: 'count', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Volume' },
    'Average Order Value': { id: 'Average Order Value', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'AOV': { id: 'AOV', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Conversion Rate': { id: 'Conversion Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'weekly', defaultTrendWindowMonths: 6, domainCategory: 'Conversion' },
    'Cart Abandonment Rate': { id: 'Cart Abandonment Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'weekly', defaultTrendWindowMonths: 6, domainCategory: 'Conversion' },
    'Customer Lifetime Value': { id: 'Customer Lifetime Value', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Customer' },
    'LTV': { id: 'LTV', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Customer' },
    'Customer Acquisition Cost': { id: 'Customer Acquisition Cost', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Marketing' },
    'CAC': { id: 'CAC', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Marketing' },
    'Gross Margin': { id: 'Gross Margin', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Profitability' },
    'Net Profit': { id: 'Net Profit', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Profitability' },
    'Product Sales Volume': { id: 'Product Sales Volume', unit: 'count', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Volume' },
    'Return Rate': { id: 'Return Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Operations' },
    'Revenue Growth Rate': { id: 'Revenue Growth Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Growth' },
    'Monthly Active Customers': { id: 'Monthly Active Customers', unit: 'count', aggregationFn: 'count', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Customer' },
    'Inventory Turnover': { id: 'Inventory Turnover', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Operations' },
};

// ─── SAAS ─────────────────────────────────────────────────────────────────────

const SAAS_KPI_METADATA: Record<string, KPIMetadata> = {
    'Monthly Recurring Revenue': { id: 'Monthly Recurring Revenue', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 24, domainCategory: 'Revenue' },
    'MRR': { id: 'MRR', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 24, domainCategory: 'Revenue' },
    'Annual Recurring Revenue': { id: 'Annual Recurring Revenue', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'yearly', defaultTrendWindowMonths: 36, domainCategory: 'Revenue' },
    'ARR': { id: 'ARR', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'yearly', defaultTrendWindowMonths: 36, domainCategory: 'Revenue' },
    'Churn Rate': { id: 'Churn Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Retention' },
    'Net Revenue Retention': { id: 'Net Revenue Retention', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Retention' },
    'NRR': { id: 'NRR', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Retention' },
    'Gross Revenue Retention': { id: 'Gross Revenue Retention', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Retention' },
    'Customer Lifetime Value': { id: 'Customer Lifetime Value', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Customer' },
    'Customer Acquisition Cost': { id: 'Customer Acquisition Cost', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Marketing' },
    'CAC': { id: 'CAC', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Marketing' },
    'Active Users': { id: 'Active Users', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Engagement' },
    'Trial Conversion Rate': { id: 'Trial Conversion Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Conversion' },
    'Average Revenue Per User': { id: 'Average Revenue Per User', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'ARPU': { id: 'ARPU', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Expansion Revenue': { id: 'Expansion Revenue', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Revenue Growth Rate': { id: 'Revenue Growth Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 24, domainCategory: 'Growth' },
    'Customer Count': { id: 'Customer Count', unit: 'count', aggregationFn: 'count', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Customer' },
};

// ─── EDTECH ───────────────────────────────────────────────────────────────────

const EDTECH_KPI_METADATA: Record<string, KPIMetadata> = {
    'Total Enrollments': { id: 'Total Enrollments', unit: 'count', aggregationFn: 'count', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Volume' },
    'Course Completion Rate': { id: 'Course Completion Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Engagement' },
    'Student Engagement Rate': { id: 'Student Engagement Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'weekly', defaultTrendWindowMonths: 3, domainCategory: 'Engagement' },
    'Dropout Rate': { id: 'Dropout Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Retention' },
    'Average Grade': { id: 'Average Grade', unit: 'score', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Performance' },
    'Active Learners': { id: 'Active Learners', unit: 'count', aggregationFn: 'count', defaultGranularity: 'weekly', defaultTrendWindowMonths: 3, domainCategory: 'Engagement' },
    'Revenue per Course': { id: 'Revenue per Course', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Certification Rate': { id: 'Certification Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 12, domainCategory: 'Performance' },
    'Quiz Pass Rate': { id: 'Quiz Pass Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Performance' },
    'Student Retention Rate': { id: 'Student Retention Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 12, domainCategory: 'Retention' },
    'Revenue Growth Rate': { id: 'Revenue Growth Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Growth' },
};

// ─── RETAIL ───────────────────────────────────────────────────────────────────

const RETAIL_KPI_METADATA: Record<string, KPIMetadata> = {
    'Total Sales': { id: 'Total Sales', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Revenue': { id: 'Revenue', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Profit': { id: 'Profit', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 24, domainCategory: 'Financials' },
    'Sales Growth': { id: 'Sales Growth', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Growth' },
    'Inventory Turnover': { id: 'Inventory Turnover', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Operations' },
    'Stock Level': { id: 'Stock Level', unit: 'count', aggregationFn: 'sum', defaultGranularity: 'weekly', defaultTrendWindowMonths: 3, domainCategory: 'Operations' },
    'Gross Margin': { id: 'Gross Margin', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Profitability' },
    'Average Basket Size': { id: 'Average Basket Size', unit: 'count', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Volume' },
    'Sales per Store': { id: 'Sales per Store', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Footfall Conversion': { id: 'Footfall Conversion', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'weekly', defaultTrendWindowMonths: 6, domainCategory: 'Conversion' },
    'Shrinkage Rate': { id: 'Shrinkage Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Operations' },
    'Sell-through Rate': { id: 'Sell-through Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Operations' },
    'Customer Acquisition Cost': { id: 'Customer Acquisition Cost', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Marketing' },
    'CAC': { id: 'CAC', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Marketing' },
    'Average Order Value': { id: 'Average Order Value', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Sales' },
    'AOV': { id: 'AOV', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Sales' },
    'Customer Count': { id: 'Customer Count', unit: 'count', aggregationFn: 'count', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Customers' },
    'Repeat Rate': { id: 'Repeat Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Customers' },
};

// ─── SERVICES ─────────────────────────────────────────────────────────────────

const SERVICES_KPI_METADATA: Record<string, KPIMetadata> = {
    'Total Revenue': { id: 'Total Revenue', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Billable Utilization Rate': { id: 'Billable Utilization Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Efficiency' },
    'Average Billing Rate': { id: 'Average Billing Rate', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Project Profitability': { id: 'Project Profitability', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Profitability' },
    'Client Retention Rate': { id: 'Client Retention Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Retention' },
    'Revenue per Client': { id: 'Revenue per Client', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Active Projects': { id: 'Active Projects', unit: 'count', aggregationFn: 'count', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Volume' },
    'Overdue Invoices': { id: 'Overdue Invoices', unit: 'count', aggregationFn: 'count', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Operations' },
    'Employee Utilization': { id: 'Employee Utilization', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Efficiency' },
    'Delivery Timeliness': { id: 'Delivery Timeliness', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Performance' },
    'Revenue Growth': { id: 'Revenue Growth', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Growth' },
};

// ─── MANUFACTURING ────────────────────────────────────────────────────────────

const MANUFACTURING_KPI_METADATA: Record<string, KPIMetadata> = {
    'Production Output': { id: 'Production Output', unit: 'count', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Volume' },
    'Yield Rate': { id: 'Yield Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Quality' },
    'Defect Rate': { id: 'Defect Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Quality' },
    'Overall Equipment Effectiveness': { id: 'Overall Equipment Effectiveness', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Efficiency' },
    'OEE': { id: 'OEE', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Efficiency' },
    'Downtime': { id: 'Downtime', unit: 'hours', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations' },
    'Cost per Unit': { id: 'Cost per Unit', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Cost' },
    'Machine Utilization': { id: 'Machine Utilization', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Efficiency' },
    'Throughput': { id: 'Throughput', unit: 'count', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Volume' },
    'Scrap Rate': { id: 'Scrap Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Quality' },
    'Lead Time': { id: 'Lead Time', unit: 'days', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Operations' },
};

// ─── HEALTHCARE ───────────────────────────────────────────────────────────────

const HEALTHCARE_KPI_METADATA: Record<string, KPIMetadata> = {
    'Patient Count': { id: 'Patient Count', unit: 'count', aggregationFn: 'count', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Volume' },
    'Appointment No-show Rate': { id: 'Appointment No-show Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Operations' },
    'Bed Occupancy Rate': { id: 'Bed Occupancy Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Capacity' },
    'Average Length of Stay': { id: 'Average Length of Stay', unit: 'days', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Operations' },
    'ALOS': { id: 'ALOS', unit: 'days', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Operations' },
    'Readmission Rate': { id: 'Readmission Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Quality' },
    'Revenue per Patient': { id: 'Revenue per Patient', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Claim Approval Rate': { id: 'Claim Approval Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Operations' },
    'Doctor Utilization': { id: 'Doctor Utilization', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Efficiency' },
    'Treatment Success Rate': { id: 'Treatment Success Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Quality' },
    'Cost per Treatment': { id: 'Cost per Treatment', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Cost' },
};

// ─── FINANCE ──────────────────────────────────────────────────────────────────

const FINANCE_KPI_METADATA: Record<string, KPIMetadata> = {
    'Total Transactions': { id: 'Total Transactions', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Volume' },
    'Net Profit': { id: 'Net Profit', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Profitability' },
    'Cash Flow': { id: 'Cash Flow', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Liquidity' },
    'Loan Default Rate': { id: 'Loan Default Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Risk' },
    'Return on Assets': { id: 'Return on Assets', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Performance' },
    'ROA': { id: 'ROA', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Performance' },
    'Return on Equity': { id: 'Return on Equity', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Performance' },
    'ROE': { id: 'ROE', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Performance' },
    'Non-performing Assets': { id: 'Non-performing Assets', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Risk' },
    'NPA': { id: 'NPA', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Risk' },
    'Liquidity Ratio': { id: 'Liquidity Ratio', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'quarterly', defaultTrendWindowMonths: 24, domainCategory: 'Liquidity' },
    'Interest Income': { id: 'Interest Income', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 12, domainCategory: 'Revenue' },
    'Fraud Rate': { id: 'Fraud Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Risk' },
};

// ─── Master Domain Metadata Map ───────────────────────────────────────────────

export const DOMAIN_KPI_METADATA: Record<DomainType, Record<string, KPIMetadata>> = {
    ECOMMERCE:     ECOMMERCE_KPI_METADATA,
    SAAS:          SAAS_KPI_METADATA,
    EDTECH:        EDTECH_KPI_METADATA,
    RETAIL:        RETAIL_KPI_METADATA,
    SERVICES:      SERVICES_KPI_METADATA,
    MANUFACTURING: MANUFACTURING_KPI_METADATA,
    HEALTHCARE:    HEALTHCARE_KPI_METADATA,
    FINANCE:       FINANCE_KPI_METADATA,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get metadata for a KPI by name. Searches domain-specific metadata first,
 * then falls back to a cross-domain search, then returns a safe default.
 *
 * @param kpiName - The display name of the KPI (e.g. "Monthly Recurring Revenue")
 * @param domain  - Optional: restrict search to a specific domain for better precision
 */
export function getKPIMetadata(kpiName: string, domain?: DomainType): KPIMetadata {
    const normalized = kpiName.trim().toLowerCase();

    // 1. If domain provided, search domain-scoped map first
    if (domain && DOMAIN_KPI_METADATA[domain]) {
        const domainMap = DOMAIN_KPI_METADATA[domain];
        const domainKey = Object.keys(domainMap).find(k => k.toLowerCase() === normalized);
        if (domainKey) return domainMap[domainKey];
    }

    // 2. Cross-domain search (all 8 domains)
    for (const map of Object.values(DOMAIN_KPI_METADATA)) {
        const key = Object.keys(map).find(k => k.toLowerCase() === normalized);
        if (key) return map[key];
    }

    // 3. Safe default
    return {
        id: 'Unknown',
        unit: 'number',
        aggregationFn: 'sum',
        defaultGranularity: 'monthly',
        defaultTrendWindowMonths: 12,
        domainCategory: 'General',
    };
}

/**
 * Get all KPI metadata entries for a given domain.
 */
export function getDomainKPIMetadata(domain: DomainType): Record<string, KPIMetadata> {
    return DOMAIN_KPI_METADATA[domain] ?? {};
}

/**
 * Get the list of core KPI names for a domain (for AI prompt injection).
 */
export function getDomainKPINames(domain: DomainType): string[] {
    return Object.keys(DOMAIN_KPI_METADATA[domain] ?? {});
}

// ─── Legacy Export (backward-compat) ─────────────────────────────────────────
// Kept so any existing consumers of RETAIL_KPI_METADATA don't break.
export { RETAIL_KPI_METADATA };
