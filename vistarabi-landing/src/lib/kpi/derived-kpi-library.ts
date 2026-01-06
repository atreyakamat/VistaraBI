// Derived KPI Library - Module 4 Phase 4C
// KPIs that depend on other KPIs, not raw columns

import type { DomainType } from '@/lib/prisma';

export interface DerivedKPIDefinition {
    id: string;
    name: string;
    description: string;
    domain: DomainType | 'GLOBAL';
    dependsOn: string[]; // KPI IDs that this depends on
    formula: string;     // Symbolic formula
    category: string;
    priority: number;
}

// ============ GLOBAL (Cross-Domain) Derived KPIs ============
export const GLOBAL_DERIVED_KPIS: DerivedKPIDefinition[] = [
    {
        id: 'd-001',
        name: 'Revenue Efficiency',
        description: 'Revenue generated per active customer',
        domain: 'GLOBAL',
        dependsOn: ['ec-001', 'saas-001', 'hc-006', 'sv-001'],
        formula: 'Total Revenue / Active Customers',
        category: 'efficiency',
        priority: 1,
    },
    {
        id: 'd-002',
        name: 'Profit Margin %',
        description: 'Net profit as percentage of revenue',
        domain: 'GLOBAL',
        dependsOn: ['ec-009', 'ec-001', 'fn-002'],
        formula: '(Net Profit / Total Revenue) * 100',
        category: 'profitability',
        priority: 2,
    },
    {
        id: 'd-003',
        name: 'Customer Value Index',
        description: 'Customer lifetime value adjusted by retention',
        domain: 'GLOBAL',
        dependsOn: ['ec-006', 'saas-006', 'sv-005'],
        formula: 'CLV * Retention Rate',
        category: 'customer',
        priority: 3,
    },
    {
        id: 'd-004',
        name: 'Operational Leakage',
        description: 'Losses due to inefficiency',
        domain: 'GLOBAL',
        dependsOn: ['ec-011', 'sv-008', 'rt-009'],
        formula: 'Returns + Overdue + Shrinkage',
        category: 'operations',
        priority: 4,
    },
    {
        id: 'd-005',
        name: 'Growth Velocity',
        description: 'Rate of revenue growth normalized by customer base',
        domain: 'GLOBAL',
        dependsOn: ['ec-001', 'saas-017'],
        formula: 'Revenue Growth Rate * Customer Growth',
        category: 'growth',
        priority: 5,
    },
];

// ============ E-Commerce Derived KPIs ============
export const ECOMMERCE_DERIVED_KPIS: DerivedKPIDefinition[] = [
    {
        id: 'dec-001',
        name: 'Revenue per Visitor',
        description: 'Monetization efficiency of traffic',
        domain: 'ECOMMERCE',
        dependsOn: ['ec-001', 'ec-004'],
        formula: 'Total Revenue * Conversion Rate',
        category: 'conversion',
        priority: 1,
    },
    {
        id: 'dec-002',
        name: 'Discount Dependency Ratio',
        description: 'How much revenue depends on discounts',
        domain: 'ECOMMERCE',
        dependsOn: ['ec-013', 'ec-001'],
        formula: 'Discount Amount / Total Revenue',
        category: 'revenue',
        priority: 2,
    },
    {
        id: 'dec-003',
        name: 'Customer Profitability',
        description: 'Profit per customer',
        domain: 'ECOMMERCE',
        dependsOn: ['ec-009', 'ec-006'],
        formula: 'Net Profit / Customers',
        category: 'customer',
        priority: 3,
    },
    {
        id: 'dec-004',
        name: 'Cart Abandonment Cost',
        description: 'Estimated revenue lost to abandoned carts',
        domain: 'ECOMMERCE',
        dependsOn: ['ec-005', 'ec-002'],
        formula: 'Cart Abandonment Rate * Average Order Value',
        category: 'revenue',
        priority: 4,
    },
    {
        id: 'dec-005',
        name: 'Repeat Purchase Momentum',
        description: 'Strength of repeat customer purchases',
        domain: 'ECOMMERCE',
        dependsOn: ['ec-007', 'ec-008'],
        formula: 'Repeat Purchase Rate * Purchase Frequency',
        category: 'customer',
        priority: 5,
    },
];

// ============ SaaS Derived KPIs ============
export const SAAS_DERIVED_KPIS: DerivedKPIDefinition[] = [
    {
        id: 'dsaas-001',
        name: 'LTV to CAC Ratio',
        description: 'Unit economics health indicator',
        domain: 'SAAS',
        dependsOn: ['saas-006', 'saas-007'],
        formula: 'Customer Lifetime Value / CAC',
        category: 'unit_economics',
        priority: 1,
    },
    {
        id: 'dsaas-002',
        name: 'Revenue Stability Score',
        description: 'Predictability of recurring revenue',
        domain: 'SAAS',
        dependsOn: ['saas-004', 'saas-003'],
        formula: 'Net Revenue Retention * (1 - Churn Rate)',
        category: 'retention',
        priority: 2,
    },
    {
        id: 'dsaas-003',
        name: 'Growth Efficiency',
        description: 'Revenue growth per new signup',
        domain: 'SAAS',
        dependsOn: ['saas-018', 'saas-017'],
        formula: 'Revenue Growth Rate / New Signups',
        category: 'growth',
        priority: 3,
    },
    {
        id: 'dsaas-004',
        name: 'CAC Payback Period',
        description: 'Months to recover customer acquisition cost',
        domain: 'SAAS',
        dependsOn: ['saas-007', 'saas-001'],
        formula: 'CAC / (ARPU * Gross Margin)',
        category: 'unit_economics',
        priority: 4,
    },
    {
        id: 'dsaas-005',
        name: 'Expansion Revenue Rate',
        description: 'Revenue from upsells as % of MRR',
        domain: 'SAAS',
        dependsOn: ['saas-002', 'saas-005'],
        formula: 'Expansion MRR / MRR * 100',
        category: 'growth',
        priority: 5,
    },
];

// ============ Services/Agency Derived KPIs ============
export const SERVICES_DERIVED_KPIS: DerivedKPIDefinition[] = [
    {
        id: 'dsv-001',
        name: 'Revenue per Employee',
        description: 'Team monetization efficiency',
        domain: 'SERVICES',
        dependsOn: ['sv-001', 'sv-009'],
        formula: 'Total Revenue / Employee Utilization',
        category: 'efficiency',
        priority: 1,
    },
    {
        id: 'dsv-002',
        name: 'Client Risk Index',
        description: 'Revenue risk from churn',
        domain: 'SERVICES',
        dependsOn: ['sv-005', 'sv-006'],
        formula: '(1 - Retention Rate) * Revenue per Client',
        category: 'risk',
        priority: 2,
    },
    {
        id: 'dsv-003',
        name: 'Project Profitability',
        description: 'Profit margin on project delivery',
        domain: 'SERVICES',
        dependsOn: ['sv-001', 'sv-007'],
        formula: '(Billable Revenue - Project Cost) / Billable Revenue',
        category: 'profitability',
        priority: 3,
    },
];

// ============ Manufacturing Derived KPIs ============
export const MANUFACTURING_DERIVED_KPIS: DerivedKPIDefinition[] = [
    {
        id: 'dmf-001',
        name: 'Production Efficiency Score',
        description: 'Composite efficiency metric',
        domain: 'MANUFACTURING',
        dependsOn: ['mf-004', 'mf-007'],
        formula: 'OEE * Machine Utilization',
        category: 'efficiency',
        priority: 1,
    },
    {
        id: 'dmf-002',
        name: 'Waste Cost Impact',
        description: 'Financial loss due to scrap',
        domain: 'MANUFACTURING',
        dependsOn: ['mf-009', 'mf-006'],
        formula: 'Scrap Rate * Cost per Unit',
        category: 'cost',
        priority: 2,
    },
    {
        id: 'dmf-003',
        name: 'Quality Cost Ratio',
        description: 'Cost of quality issues vs production',
        domain: 'MANUFACTURING',
        dependsOn: ['mf-005', 'mf-001'],
        formula: 'Defect Rate * Production Volume',
        category: 'quality',
        priority: 3,
    },
];

// ============ Healthcare Derived KPIs ============
export const HEALTHCARE_DERIVED_KPIS: DerivedKPIDefinition[] = [
    {
        id: 'dhc-001',
        name: 'Revenue per Patient Day',
        description: 'Daily revenue efficiency per patient',
        domain: 'HEALTHCARE',
        dependsOn: ['hc-006', 'hc-003'],
        formula: 'Total Revenue / Patient Days',
        category: 'revenue',
        priority: 1,
    },
    {
        id: 'dhc-002',
        name: 'Care Quality Index',
        description: 'Composite quality and readmission metric',
        domain: 'HEALTHCARE',
        dependsOn: ['hc-008', 'hc-004'],
        formula: 'Patient Satisfaction * (1 - Readmission Rate)',
        category: 'quality',
        priority: 2,
    },
];

// ============ Finance Derived KPIs ============
export const FINANCE_DERIVED_KPIS: DerivedKPIDefinition[] = [
    {
        id: 'dfn-001',
        name: 'Financial Health Index',
        description: 'Overall financial stability indicator',
        domain: 'FINANCE',
        dependsOn: ['fn-002', 'fn-008', 'fn-004'],
        formula: '(Profit + Liquidity) * (1 - Default Rate)',
        category: 'health',
        priority: 1,
    },
    {
        id: 'dfn-002',
        name: 'Risk Adjusted Return',
        description: 'Return normalized by risk factors',
        domain: 'FINANCE',
        dependsOn: ['fn-005', 'fn-010'],
        formula: 'ROA * (1 - Fraud Rate)',
        category: 'risk',
        priority: 2,
    },
    {
        id: 'dfn-003',
        name: 'Portfolio Efficiency',
        description: 'Return relative to risk exposure',
        domain: 'FINANCE',
        dependsOn: ['fn-005', 'fn-003'],
        formula: 'ROI / Risk Exposure',
        category: 'efficiency',
        priority: 3,
    },
];

// ============ Retail Derived KPIs ============
export const RETAIL_DERIVED_KPIS: DerivedKPIDefinition[] = [
    {
        id: 'drt-001',
        name: 'Sales per Sqft Efficiency',
        description: 'Revenue efficiency per store area',
        domain: 'RETAIL',
        dependsOn: ['rt-001', 'rt-006'],
        formula: 'Sales per Sqft * Store Traffic',
        category: 'efficiency',
        priority: 1,
    },
    {
        id: 'drt-002',
        name: 'Inventory Productivity',
        description: 'Revenue generated per inventory unit',
        domain: 'RETAIL',
        dependsOn: ['rt-001', 'rt-004'],
        formula: 'Total Sales / Inventory Turnover',
        category: 'operations',
        priority: 2,
    },
];

// ============ Aggregated Library ============
export const ALL_DERIVED_KPIS: DerivedKPIDefinition[] = [
    ...GLOBAL_DERIVED_KPIS,
    ...ECOMMERCE_DERIVED_KPIS,
    ...SAAS_DERIVED_KPIS,
    ...SERVICES_DERIVED_KPIS,
    ...MANUFACTURING_DERIVED_KPIS,
    ...HEALTHCARE_DERIVED_KPIS,
    ...FINANCE_DERIVED_KPIS,
    ...RETAIL_DERIVED_KPIS,
];

// Get derived KPIs for a domain (includes GLOBAL)
export function getDerivedKPIsForDomain(domain: DomainType): DerivedKPIDefinition[] {
    return ALL_DERIVED_KPIS.filter(
        kpi => kpi.domain === 'GLOBAL' || kpi.domain === domain
    ).sort((a, b) => a.priority - b.priority);
}

// Get derived KPI by ID
export function getDerivedKPIById(id: string): DerivedKPIDefinition | undefined {
    return ALL_DERIVED_KPIS.find(kpi => kpi.id === id);
}

// Check if dependent KPIs are available
export function checkDerivedKPIDependencies(
    derivedKpi: DerivedKPIDefinition,
    availableKpiIds: string[]
): { canCompute: boolean; missingDependencies: string[] } {
    const missing = derivedKpi.dependsOn.filter(dep => !availableKpiIds.includes(dep));
    return {
        canCompute: missing.length === 0,
        missingDependencies: missing,
    };
}
