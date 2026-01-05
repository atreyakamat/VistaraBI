// Domain-Specific KPI Libraries for VistaraBI Module 4

import type { DomainType } from './domain-keywords';

export interface KPI {
    id: string;
    name: string;
    description: string;
    formula: string;              // How to calculate it
    category: string;             // Revenue, Growth, Efficiency, etc.
    isCore: boolean;              // Core KPI for this domain
    dataRequirements: string[];   // Required columns
}

// E-Commerce KPIs
const ECOMMERCE_KPIS: KPI[] = [
    {
        id: 'revenue',
        name: 'Total Revenue',
        description: 'Total sales revenue',
        formula: 'SUM(price * quantity)',
        category: 'Revenue',
        isCore: true,
        dataRequirements: ['price', 'quantity'],
    },
    {
        id: 'aov',
        name: 'Average Order Value (AOV)',
        description: 'Average value per order',
        formula: 'Total Revenue / Number of Orders',
        category: 'Revenue',
        isCore: true,
        dataRequirements: ['order_id', 'price'],
    },
    {
        id: 'conversion_rate',
        name: 'Conversion Rate',
        description: 'Percentage of visitors who make a purchase',
        formula: '(Orders / Total Visitors) * 100',
        category: 'Growth',
        isCore: true,
        dataRequirements: ['order_id', 'visitor_id'],
    },
    {
        id: 'cart_abandonment',
        name: 'Cart Abandonment Rate',
        description: 'Percentage of carts abandoned before checkout',
        formula: '(Abandoned Carts / Total Carts) * 100',
        category: 'Efficiency',
        isCore: false,
        dataRequirements: ['cart_id', 'status'],
    },
    {
        id: 'customer_ltv',
        name: 'Customer Lifetime Value (LTV)',
        description: 'Total revenue per customer over their lifetime',
        formula: 'AVG(Total Revenue per Customer)',
        category: 'Revenue',
        isCore: true,
        dataRequirements: ['customer_id', 'price'],
    },
];

// SaaS KPIs
const SAAS_KPIS: KPI[] = [
    {
        id: 'mrr',
        name: 'Monthly Recurring Revenue (MRR)',
        description: 'Predictable monthly revenue from subscriptions',
        formula: 'SUM(subscription_price)',
        category: 'Revenue',
        isCore: true,
        dataRequirements: ['subscription_id', 'mrr'],
    },
    {
        id: 'arr',
        name: 'Annual Recurring Revenue (ARR)',
        description: 'Predictable yearly revenue',
        formula: 'MRR * 12',
        category: 'Revenue',
        isCore: true,
        dataRequirements: ['arr'],
    },
    {
        id: 'churn_rate',
        name: 'Churn Rate',
        description: 'Percentage of customers who cancel',
        formula: '(Churned Customers / Total Customers) * 100',
        category: 'Growth',
        isCore: true,
        dataRequirements: ['churn_date', 'user_id'],
    },
    {
        id: 'cac',
        name: 'Customer Acquisition Cost (CAC)',
        description: 'Cost to acquire a new customer',
        formula: 'Total Marketing Spend / New Customers',
        category: 'Efficiency',
        isCore: true,
        dataRequirements: ['signup_date', 'marketing_cost'],
    },
    {
        id: 'nrr',
        name: 'Net Revenue Retention (NRR)',
        description: 'Revenue retained from existing customers',
        formula: '((Starting MRR + Expansion - Churn) / Starting MRR) * 100',
        category: 'Growth',
        isCore: true,
        dataRequirements: ['mrr', 'user_id'],
    },
];

// EdTech KPIs
const EDTECH_KPIS: KPI[] = [
    {
        id: 'enrollment_rate',
        name: 'Enrollment Rate',
        description: 'Percentage of enrollments',
        formula: '(Enrolled Students / Total Applicants) * 100',
        category: 'Growth',
        isCore: true,
        dataRequirements: ['enrollment_id', 'student_id'],
    },
    {
        id: 'completion_rate',
        name: 'Course Completion Rate',
        description: 'Percentage of students who complete courses',
        formula: '(Completed Courses / Total Enrollments) * 100',
        category: 'Efficiency',
        isCore: true,
        dataRequirements: ['completion', 'enrollment_id'],
    },
    {
        id: 'avg_score',
        name: 'Average Student Score',
        description: 'Average performance across all students',
        formula: 'AVG(score)',
        category: 'Quality',
        isCore: true,
        dataRequirements: ['score'],
    },
    {
        id: 'retention_rate',
        name: 'Student Retention Rate',
        description: 'Percentage of students who continue',
        formula: '(Returning Students / Total Students) * 100',
        category: 'Growth',
        isCore: true,
        dataRequirements: ['student_id', 'enrollment_date'],
    },
];

// Retail KPIs
const RETAIL_KPIS: KPI[] = [
    {
        id: 'sales_per_sqft',
        name: 'Sales Per Square Foot',
        description: 'Revenue efficiency per store area',
        formula: 'Total Sales / Store Square Footage',
        category: 'Efficiency',
        isCore: true,
        dataRequirements: ['sales', 'store_id'],
    },
    {
        id: 'inventory_turnover',
        name: 'Inventory Turnover',
        description: 'How quickly inventory is sold',
        formula: 'Cost of Goods Sold / Average Inventory',
        category: 'Efficiency',
        isCore: true,
        dataRequirements: ['inventory', 'sales'],
    },
    {
        id: 'foot_traffic',
        name: 'Foot Traffic',
        description: 'Number of store visitors',
        formula: 'COUNT(visitor_id)',
        category: 'Growth',
        isCore: false,
        dataRequirements: ['visitor_id'],
    },
    {
        id: 'gross_margin',
        name: 'Gross Margin',
        description: 'Profit after cost of goods',
        formula: '((Revenue - COGS) / Revenue) * 100',
        category: 'Revenue',
        isCore: true,
        dataRequirements: ['sales', 'cost'],
    },
];

// Services KPIs
const SERVICES_KPIS: KPI[] = [
    {
        id: 'billable_utilization',
        name: 'Billable Utilization Rate',
        description: 'Percentage of hours billed',
        formula: '(Billable Hours / Total Hours) * 100',
        category: 'Efficiency',
        isCore: true,
        dataRequirements: ['billable_hours', 'hours'],
    },
    {
        id: 'project_margin',
        name: 'Project Profit Margin',
        description: 'Profit per project',
        formula: '((Revenue - Costs) / Revenue) * 100',
        category: 'Revenue',
        isCore: true,
        dataRequirements: ['invoice', 'cost'],
    },
    {
        id: 'client_retention',
        name: 'Client Retention Rate',
        description: 'Percentage of clients retained',
        formula: '(Retained Clients / Total Clients) * 100',
        category: 'Growth',
        isCore: true,
        dataRequirements: ['client_id'],
    },
];

// Manufacturing KPIs
const MANUFACTURING_KPIS: KPI[] = [
    {
        id: 'oee',
        name: 'Overall Equipment Effectiveness (OEE)',
        description: 'Manufacturing productivity',
        formula: 'Availability * Performance * Quality',
        category: 'Efficiency',
        isCore: true,
        dataRequirements: ['machine_id', 'downtime', 'output'],
    },
    {
        id: 'yield_rate',
        name: 'Yield Rate',
        description: 'Percentage of good units produced',
        formula: '(Good Units / Total Units) * 100',
        category: 'Quality',
        isCore: true,
        dataRequirements: ['yield', 'defect'],
    },
    {
        id: 'defect_rate',
        name: 'Defect Rate',
        description: 'Percentage of defective units',
        formula: '(Defective Units / Total Units) * 100',
        category: 'Quality',
        isCore: true,
        dataRequirements: ['defect', 'production'],
    },
];

// Healthcare KPIs
const HEALTHCARE_KPIS: KPI[] = [
    {
        id: 'patient_satisfaction',
        name: 'Patient Satisfaction Score',
        description: 'Average patient satisfaction rating',
        formula: 'AVG(satisfaction_score)',
        category: 'Quality',
        isCore: true,
        dataRequirements: ['patient_id', 'satisfaction'],
    },
    {
        id: 'readmission_rate',
        name: 'Readmission Rate',
        description: 'Percentage of patients readmitted',
        formula: '(Readmissions / Total Discharges) * 100',
        category: 'Quality',
        isCore: true,
        dataRequirements: ['admission', 'discharge'],
    },
    {
        id: 'avg_wait_time',
        name: 'Average Wait Time',
        description: 'Average time patients wait',
        formula: 'AVG(wait_time)',
        category: 'Efficiency',
        isCore: true,
        dataRequirements: ['appointment', 'visit'],
    },
];

// Finance KPIs
const FINANCE_KPIS: KPI[] = [
    {
        id: 'net_profit_margin',
        name: 'Net Profit Margin',
        description: 'Profitability percentage',
        formula: '(Net Profit / Revenue) * 100',
        category: 'Revenue',
        isCore: true,
        dataRequirements: ['profit', 'revenue'],
    },
    {
        id: 'roi',
        name: 'Return on Investment (ROI)',
        description: 'Investment efficiency',
        formula: '((Gain - Cost) / Cost) * 100',
        category: 'Revenue',
        isCore: true,
        dataRequirements: ['investment', 'return'],
    },
    {
        id: 'debt_to_equity',
        name: 'Debt-to-Equity Ratio',
        description: 'Financial leverage',
        formula: 'Total Debt / Total Equity',
        category: 'Risk',
        isCore: true,
        dataRequirements: ['debt', 'equity'],
    },
];

// KPI Library by Domain
export const DOMAIN_KPI_LIBRARIES: Record<DomainType, KPI[]> = {
    ECOMMERCE: ECOMMERCE_KPIS,
    SAAS: SAAS_KPIS,
    EDTECH: EDTECH_KPIS,
    RETAIL: RETAIL_KPIS,
    SERVICES: SERVICES_KPIS,
    MANUFACTURING: MANUFACTURING_KPIS,
    HEALTHCARE: HEALTHCARE_KPIS,
    FINANCE: FINANCE_KPIS,
};

// Get KPIs for a domain
export function getKPIsForDomain(domain: DomainType): KPI[] {
    return DOMAIN_KPI_LIBRARIES[domain] || [];
}

// Get core KPIs only
export function getCoreKPIs(domain: DomainType): KPI[] {
    return getKPIsForDomain(domain).filter(kpi => kpi.isCore);
}

// Check if data supports a KPI
export function canCalculateKPI(kpi: KPI, availableColumns: string[]): boolean {
    const normalizedColumns = availableColumns.map(c => c.toLowerCase().replace(/[_\s]/g, ''));

    return kpi.dataRequirements.every(req => {
        const normalizedReq = req.toLowerCase().replace(/[_\s]/g, '');
        return normalizedColumns.some(col => col.includes(normalizedReq));
    });
}
