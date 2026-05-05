// Module 4.5 — KPI Rule Registry
// Static deterministic rules for all 8 domains.
// ALL field references use SemanticRole — NEVER raw column names.
// Adding a new domain = add an entry to KPI_RULE_REGISTRY only.

import type { DomainType, AggregationFunction } from '@/lib/prisma';
import type { SemanticRole } from './semantic-types';

// ─── KPI Rule Shape ───────────────────────────────────────────────────────────

export interface KPIAggregationRule {
    function: AggregationFunction;
    semanticRole: SemanticRole;
}

export interface KPIRule {
    id: string;
    name: string;
    description: string;
    category: string;
    requiredSemanticRoles: SemanticRole[];
    optionalSemanticRoles?: SemanticRole[];
    requiresJoin: boolean;
    joinedSemanticRoles?: SemanticRole[];   // roles that must come from a joined source
    aggregationRules: KPIAggregationRule[];
    /**
     * Formula template. Use {roleName} as placeholder.
     * e.g. 'SUM({revenue})' or 'SUM({revenue}) / COUNT({order_id})'
     * The resolver will replace {role} with the actual column name.
     * MUST be a pure arithmetic expression — no SQL clauses (WHERE/GROUP BY/JOIN etc.)
     */
    lineageFormulaTemplate: string;
    defaultVisualizationHint: 'metric_card' | 'bar_chart' | 'line_chart' | 'pie_chart';
    priority: number;
    // R3: measurement unit for the KPI output value (required)
    unit: string;
}

// ─── ECOMMERCE (10 rules) ─────────────────────────────────────────────────────

const ECOMMERCE_RULES: KPIRule[] = [
    {
        id: 'ec-001', name: 'Total Revenue', category: 'revenue', priority: 1,
        description: 'Sum of all order values',
        requiredSemanticRoles: ['revenue'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'revenue' }],
        lineageFormulaTemplate: 'SUM({revenue})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'ec-002', name: 'Order Count', category: 'volume', priority: 2,
        description: 'Total number of orders placed',
        requiredSemanticRoles: ['order_id'],
        requiresJoin: false,
        aggregationRules: [{ function: 'COUNT', semanticRole: 'order_id' }],
        lineageFormulaTemplate: 'COUNT({order_id})',
        defaultVisualizationHint: 'bar_chart',
        unit: 'count', // R3
    },
    {
        id: 'ec-003', name: 'Average Order Value', category: 'revenue', priority: 3,
        description: 'Average revenue per order',
        requiredSemanticRoles: ['revenue', 'order_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'revenue' },
            { function: 'COUNT', semanticRole: 'order_id' },
        ],
        lineageFormulaTemplate: 'SUM({revenue}) / COUNT({order_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'ec-004', name: 'Conversion Rate', category: 'conversion', priority: 4,
        description: 'Percentage of visitors who placed an order',
        requiredSemanticRoles: ['order_id', 'session_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'order_id' },
            { function: 'COUNT_DISTINCT', semanticRole: 'session_id' },
        ],
        lineageFormulaTemplate: 'COUNT({order_id}) / COUNT(DISTINCT {session_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'ec-005', name: 'Cart Abandonment Rate', category: 'conversion', priority: 5,
        description: 'Percentage of carts that did not convert to orders',
        requiredSemanticRoles: ['cart_id', 'order_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'cart_id' },
            { function: 'COUNT', semanticRole: 'order_id' },
        ],
        lineageFormulaTemplate: '(COUNT({cart_id}) - COUNT({order_id})) / COUNT({cart_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'ec-006', name: 'Customer Lifetime Value', category: 'customer', priority: 6,
        description: 'Average total revenue generated per unique customer',
        requiredSemanticRoles: ['revenue', 'customer_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'revenue' },
            { function: 'COUNT_DISTINCT', semanticRole: 'customer_id' },
        ],
        lineageFormulaTemplate: 'SUM({revenue}) / COUNT(DISTINCT {customer_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'ec-007', name: 'Gross Margin', category: 'profitability', priority: 7,
        description: 'Revenue minus cost of goods as a percentage',
        requiredSemanticRoles: ['revenue', 'cogs'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'revenue' },
            { function: 'SUM', semanticRole: 'cogs' },
        ],
        lineageFormulaTemplate: '(SUM({revenue}) - SUM({cogs})) / SUM({revenue})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'ec-008', name: 'Revenue Growth Rate', category: 'growth', priority: 8,
        description: 'Period-over-period revenue growth',
        requiredSemanticRoles: ['revenue', 'date'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'revenue' }],
        lineageFormulaTemplate: 'SUM({revenue}) GROUP BY {date}',
        defaultVisualizationHint: 'line_chart',
        unit: 'currency', // R3
    },
    {
        id: 'ec-009', name: 'Revenue by Category', category: 'revenue', priority: 9,
        description: 'Revenue broken down by product category',
        requiredSemanticRoles: ['revenue', 'category'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'revenue' }],
        lineageFormulaTemplate: 'SUM({revenue}) GROUP BY {category}',
        defaultVisualizationHint: 'bar_chart',
        unit: 'currency', // R3
    },
    {
        id: 'ec-010', name: 'Customer Acquisition Cost', category: 'marketing', priority: 10,
        description: 'Marketing spend per new unique customer',
        requiredSemanticRoles: ['marketing_cost', 'customer_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'marketing_cost' },
            { function: 'COUNT_DISTINCT', semanticRole: 'customer_id' },
        ],
        lineageFormulaTemplate: 'SUM({marketing_cost}) / COUNT(DISTINCT {customer_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
];

// ─── SAAS (10 rules) ──────────────────────────────────────────────────────────

const SAAS_RULES: KPIRule[] = [
    {
        id: 'saas-001', name: 'Monthly Recurring Revenue', category: 'revenue', priority: 1,
        description: 'Total monthly subscription revenue',
        requiredSemanticRoles: ['mrr'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'mrr' }],
        lineageFormulaTemplate: 'SUM({mrr})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'saas-002', name: 'Annual Recurring Revenue', category: 'revenue', priority: 2,
        description: 'MRR * 12',
        requiredSemanticRoles: ['mrr'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'mrr' }],
        lineageFormulaTemplate: 'SUM({mrr}) * 12',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'saas-003', name: 'Churn Rate', category: 'retention', priority: 3,
        description: 'Percentage of customers who cancelled',
        requiredSemanticRoles: ['churn_flag', 'customer_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'churn_flag' },
            { function: 'COUNT_DISTINCT', semanticRole: 'customer_id' },
        ],
        lineageFormulaTemplate: 'COUNT({churn_flag}) / COUNT(DISTINCT {customer_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'saas-004', name: 'Net Revenue Retention', category: 'retention', priority: 4,
        description: 'Retained + expanded revenue as a % of starting revenue',
        requiredSemanticRoles: ['mrr', 'expansion_mrr', 'contraction_mrr'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'mrr' },
            { function: 'SUM', semanticRole: 'expansion_mrr' },
            { function: 'SUM', semanticRole: 'contraction_mrr' },
        ],
        lineageFormulaTemplate: '(SUM({mrr}) + SUM({expansion_mrr}) - SUM({contraction_mrr})) / SUM({mrr})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'saas-005', name: 'Average Revenue Per User', category: 'revenue', priority: 5,
        description: 'MRR divided by unique active users',
        requiredSemanticRoles: ['mrr', 'user_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'mrr' },
            { function: 'COUNT_DISTINCT', semanticRole: 'user_id' },
        ],
        lineageFormulaTemplate: 'SUM({mrr}) / COUNT(DISTINCT {user_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'saas-006', name: 'Trial Conversion Rate', category: 'conversion', priority: 6,
        description: 'Percentage of trials that converted to paid',
        requiredSemanticRoles: ['trial_flag', 'converted_flag'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'converted_flag' },
            { function: 'COUNT', semanticRole: 'trial_flag' },
        ],
        lineageFormulaTemplate: 'COUNT({converted_flag}) / COUNT({trial_flag})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'saas-007', name: 'Active Users', category: 'engagement', priority: 7,
        description: 'Distinct users with login activity',
        requiredSemanticRoles: ['user_id', 'login_date'],
        requiresJoin: false,
        aggregationRules: [{ function: 'COUNT_DISTINCT', semanticRole: 'user_id' }],
        lineageFormulaTemplate: 'COUNT(DISTINCT {user_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'count', // R3
    },
    {
        id: 'saas-008', name: 'Expansion Revenue', category: 'revenue', priority: 8,
        description: 'Additional revenue from plan upgrades and upsells',
        requiredSemanticRoles: ['expansion_mrr'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'expansion_mrr' }],
        lineageFormulaTemplate: 'SUM({expansion_mrr})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'saas-009', name: 'Revenue Growth (MoM)', category: 'growth', priority: 9,
        description: 'MRR trend over time',
        requiredSemanticRoles: ['mrr', 'date'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'mrr' }],
        lineageFormulaTemplate: 'SUM({mrr}) GROUP BY {date}',
        defaultVisualizationHint: 'line_chart',
        unit: 'currency', // R3
    },
    {
        id: 'saas-010', name: 'Customer Acquisition Cost', category: 'marketing', priority: 10,
        description: 'Sales & marketing spend per new customer',
        requiredSemanticRoles: ['marketing_cost', 'customer_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'marketing_cost' },
            { function: 'COUNT_DISTINCT', semanticRole: 'customer_id' },
        ],
        lineageFormulaTemplate: 'SUM({marketing_cost}) / COUNT(DISTINCT {customer_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
];

// ─── EDTECH (10 rules) ────────────────────────────────────────────────────────

const EDTECH_RULES: KPIRule[] = [
    {
        id: 'ed-001', name: 'Total Enrollments', category: 'volume', priority: 1,
        description: 'Total number of course enrollments',
        requiredSemanticRoles: ['enrollment_id'],
        requiresJoin: false,
        aggregationRules: [{ function: 'COUNT', semanticRole: 'enrollment_id' }],
        lineageFormulaTemplate: 'COUNT({enrollment_id})',
        defaultVisualizationHint: 'bar_chart',
        unit: 'count', // R3
    },
    {
        id: 'ed-002', name: 'Course Completion Rate', category: 'engagement', priority: 2,
        description: 'Percentage of enrolled students who completed the course',
        requiredSemanticRoles: ['completion_flag', 'enrollment_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'completion_flag' },
            { function: 'COUNT', semanticRole: 'enrollment_id' },
        ],
        lineageFormulaTemplate: 'COUNT({completion_flag}) / COUNT({enrollment_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'ed-003', name: 'Average Grade', category: 'performance', priority: 3,
        description: 'Mean student grade across all assessments',
        requiredSemanticRoles: ['grade'],
        requiresJoin: false,
        aggregationRules: [{ function: 'AVG', semanticRole: 'grade' }],
        lineageFormulaTemplate: 'AVG({grade})',
        defaultVisualizationHint: 'metric_card',
        unit: 'score', // R3
    },
    {
        id: 'ed-004', name: 'Active Learners', category: 'engagement', priority: 4,
        description: 'Distinct students with recent activity',
        requiredSemanticRoles: ['student_id', 'login_date'],
        requiresJoin: false,
        aggregationRules: [{ function: 'COUNT_DISTINCT', semanticRole: 'student_id' }],
        lineageFormulaTemplate: 'COUNT(DISTINCT {student_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'count', // R3
    },
    {
        id: 'ed-005', name: 'Certification Rate', category: 'performance', priority: 5,
        description: 'Percentage of completions that earned a certificate',
        requiredSemanticRoles: ['certification_flag', 'completion_flag'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'certification_flag' },
            { function: 'COUNT', semanticRole: 'completion_flag' },
        ],
        lineageFormulaTemplate: 'COUNT({certification_flag}) / COUNT({completion_flag})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'ed-006', name: 'Revenue per Course', category: 'revenue', priority: 6,
        description: 'Average revenue generated per course',
        requiredSemanticRoles: ['revenue', 'course_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'revenue' },
            { function: 'COUNT_DISTINCT', semanticRole: 'course_id' },
        ],
        lineageFormulaTemplate: 'SUM({revenue}) / COUNT(DISTINCT {course_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'ed-007', name: 'Dropout Rate', category: 'retention', priority: 7,
        description: 'Percentage of enrolled students who dropped out',
        requiredSemanticRoles: ['status', 'enrollment_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'status' },
            { function: 'COUNT', semanticRole: 'enrollment_id' },
        ],
        lineageFormulaTemplate: 'COUNT({status}[dropped]) / COUNT({enrollment_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'ed-008', name: 'Enrollment by Course', category: 'volume', priority: 8,
        description: 'Number of enrollments per course',
        requiredSemanticRoles: ['enrollment_id', 'course_id'],
        requiresJoin: false,
        aggregationRules: [{ function: 'COUNT', semanticRole: 'enrollment_id' }],
        lineageFormulaTemplate: 'COUNT({enrollment_id}) GROUP BY {course_id}',
        defaultVisualizationHint: 'bar_chart',
        unit: 'count', // R3
    },
    {
        id: 'ed-009', name: 'Revenue Growth (MoM)', category: 'growth', priority: 9,
        description: 'Revenue trend over time',
        requiredSemanticRoles: ['revenue', 'date'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'revenue' }],
        lineageFormulaTemplate: 'SUM({revenue}) GROUP BY {date}',
        defaultVisualizationHint: 'line_chart',
        unit: 'currency', // R3
    },
    {
        id: 'ed-010', name: 'Cross-course Student Analytics', category: 'engagement', priority: 10,
        description: 'Student activity across multiple courses (requires join)',
        requiredSemanticRoles: ['student_id', 'enrollment_id'],
        requiresJoin: true,
        joinedSemanticRoles: ['course_id'],
        aggregationRules: [
            { function: 'COUNT_DISTINCT', semanticRole: 'student_id' },
            { function: 'COUNT', semanticRole: 'enrollment_id' },
        ],
        lineageFormulaTemplate: 'COUNT(DISTINCT {student_id}) JOIN {course_id}',
        defaultVisualizationHint: 'bar_chart',
        unit: 'count', // R3
    },
];

// ─── RETAIL (10 rules) ────────────────────────────────────────────────────────

const RETAIL_RULES: KPIRule[] = [
    {
        id: 'rt-001', name: 'Total Sales', category: 'revenue', priority: 1,
        description: 'Sum of all sales transactions',
        requiredSemanticRoles: ['revenue'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'revenue' }],
        lineageFormulaTemplate: 'SUM({revenue})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'rt-002', name: 'Inventory Turnover', category: 'operations', priority: 2,
        description: 'How quickly inventory is sold relative to stock',
        requiredSemanticRoles: ['cogs', 'inventory'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'cogs' },
            { function: 'AVG', semanticRole: 'inventory' },
        ],
        lineageFormulaTemplate: 'SUM({cogs}) / AVG({inventory})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'rt-003', name: 'Gross Margin', category: 'profitability', priority: 3,
        description: 'Revenue minus cost of goods as a percentage',
        requiredSemanticRoles: ['revenue', 'cogs'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'revenue' },
            { function: 'SUM', semanticRole: 'cogs' },
        ],
        lineageFormulaTemplate: '(SUM({revenue}) - SUM({cogs})) / SUM({revenue})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'rt-004', name: 'Sales per Store', category: 'revenue', priority: 4,
        description: 'Revenue broken down by store or location',
        requiredSemanticRoles: ['revenue', 'store_id'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'revenue' }],
        lineageFormulaTemplate: 'SUM({revenue}) GROUP BY {store_id}',
        defaultVisualizationHint: 'bar_chart',
        unit: 'currency', // R3
    },
    {
        id: 'rt-005', name: 'Average Basket Size', category: 'volume', priority: 5,
        description: 'Average items per transaction',
        requiredSemanticRoles: ['items_in_basket', 'transaction_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'items_in_basket' },
            { function: 'COUNT', semanticRole: 'transaction_id' },
        ],
        lineageFormulaTemplate: 'SUM({items_in_basket}) / COUNT({transaction_id})',
        defaultVisualizationHint: 'bar_chart',
        unit: 'count', // R3
    },
    {
        id: 'rt-006', name: 'Shrinkage Rate', category: 'operations', priority: 6,
        description: 'Inventory loss as a fraction of total stock',
        requiredSemanticRoles: ['shrinkage', 'inventory'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'shrinkage' },
            { function: 'SUM', semanticRole: 'inventory' },
        ],
        lineageFormulaTemplate: 'SUM({shrinkage}) / SUM({inventory})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'rt-007', name: 'Sell-through Rate', category: 'operations', priority: 7,
        description: 'Units sold as a fraction of units received',
        requiredSemanticRoles: ['sold_units', 'received_units'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'sold_units' },
            { function: 'SUM', semanticRole: 'received_units' },
        ],
        lineageFormulaTemplate: 'SUM({sold_units}) / SUM({received_units})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'rt-008', name: 'Sales Growth', category: 'growth', priority: 8,
        description: 'Period-over-period sales growth',
        requiredSemanticRoles: ['revenue', 'date'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'revenue' }],
        lineageFormulaTemplate: 'SUM({revenue}) GROUP BY {date}',
        defaultVisualizationHint: 'line_chart',
        unit: 'currency', // R3
    },
    {
        id: 'rt-009', name: 'Footfall Conversion', category: 'conversion', priority: 9,
        description: 'Buyers as a fraction of store visitors',
        requiredSemanticRoles: ['transaction_id', 'visitor_count'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'transaction_id' },
            { function: 'COUNT', semanticRole: 'visitor_count' },
        ],
        lineageFormulaTemplate: 'COUNT({transaction_id}) / COUNT({visitor_count})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'rt-010', name: 'Revenue by Category', category: 'revenue', priority: 10,
        description: 'Sales broken down by product category',
        requiredSemanticRoles: ['revenue', 'category'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'revenue' }],
        lineageFormulaTemplate: 'SUM({revenue}) GROUP BY {category}',
        defaultVisualizationHint: 'bar_chart',
        unit: 'currency', // R3
    },
];

// ─── SERVICES (10 rules) ──────────────────────────────────────────────────────

const SERVICES_RULES: KPIRule[] = [
    {
        id: 'sv-001', name: 'Total Revenue', category: 'revenue', priority: 1,
        description: 'Sum of all billing amounts',
        requiredSemanticRoles: ['revenue'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'revenue' }],
        lineageFormulaTemplate: 'SUM({revenue})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'sv-002', name: 'Billable Utilization Rate', category: 'efficiency', priority: 2,
        description: 'Billable hours as a fraction of total hours worked',
        requiredSemanticRoles: ['billable_hours', 'total_hours'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'billable_hours' },
            { function: 'SUM', semanticRole: 'total_hours' },
        ],
        lineageFormulaTemplate: 'SUM({billable_hours}) / SUM({total_hours})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'sv-003', name: 'Project Profitability', category: 'profitability', priority: 3,
        description: 'Revenue minus total project cost',
        requiredSemanticRoles: ['revenue', 'project_cost'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'revenue' },
            { function: 'SUM', semanticRole: 'project_cost' },
        ],
        lineageFormulaTemplate: 'SUM({revenue}) - SUM({project_cost})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'sv-004', name: 'Average Billing Rate', category: 'revenue', priority: 4,
        description: 'Revenue per billable hour',
        requiredSemanticRoles: ['revenue', 'billable_hours'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'revenue' },
            { function: 'SUM', semanticRole: 'billable_hours' },
        ],
        lineageFormulaTemplate: 'SUM({revenue}) / SUM({billable_hours})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'sv-005', name: 'Revenue per Client', category: 'revenue', priority: 5,
        description: 'Average revenue per distinct client',
        requiredSemanticRoles: ['revenue', 'client_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'revenue' },
            { function: 'COUNT_DISTINCT', semanticRole: 'client_id' },
        ],
        lineageFormulaTemplate: 'SUM({revenue}) / COUNT(DISTINCT {client_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'sv-006', name: 'Overdue Invoices', category: 'operations', priority: 6,
        description: 'Number of invoices past due date that are unpaid',
        requiredSemanticRoles: ['invoice_id', 'due_date', 'paid_flag'],
        requiresJoin: false,
        aggregationRules: [{ function: 'COUNT', semanticRole: 'invoice_id' }],
        lineageFormulaTemplate: 'COUNT({invoice_id}) WHERE {due_date} < today AND {paid_flag} = false',
        defaultVisualizationHint: 'metric_card',
        unit: 'count', // R3
    },
    {
        id: 'sv-007', name: 'Employee Utilization', category: 'efficiency', priority: 7,
        description: 'Hours worked as a fraction of available hours',
        requiredSemanticRoles: ['hours_worked', 'available_hours'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'hours_worked' },
            { function: 'SUM', semanticRole: 'available_hours' },
        ],
        lineageFormulaTemplate: 'SUM({hours_worked}) / SUM({available_hours})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'sv-008', name: 'Active Projects', category: 'volume', priority: 8,
        description: 'Count of ongoing projects with active status',
        requiredSemanticRoles: ['project_id', 'status'],
        requiresJoin: false,
        aggregationRules: [{ function: 'COUNT', semanticRole: 'project_id' }],
        lineageFormulaTemplate: 'COUNT({project_id}) WHERE {status} = active',
        defaultVisualizationHint: 'bar_chart',
        unit: 'count', // R3
    },
    {
        id: 'sv-009', name: 'Revenue Growth', category: 'growth', priority: 9,
        description: 'Revenue trend over time',
        requiredSemanticRoles: ['revenue', 'date'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'revenue' }],
        lineageFormulaTemplate: 'SUM({revenue}) GROUP BY {date}',
        defaultVisualizationHint: 'line_chart',
        unit: 'currency', // R3
    },
    {
        id: 'sv-010', name: 'Cross-table Client Revenue', category: 'revenue', priority: 10,
        description: 'Revenue linked to client profiles (requires join)',
        requiredSemanticRoles: ['revenue', 'invoice_id'],
        requiresJoin: true,
        joinedSemanticRoles: ['client_id'],
        aggregationRules: [{ function: 'SUM', semanticRole: 'revenue' }],
        lineageFormulaTemplate: 'SUM({revenue}) JOIN {client_id}',
        defaultVisualizationHint: 'bar_chart',
        unit: 'currency', // R3
    },
];

// ─── MANUFACTURING (10 rules) ─────────────────────────────────────────────────

const MANUFACTURING_RULES: KPIRule[] = [
    {
        id: 'mf-001', name: 'Production Output', category: 'volume', priority: 1,
        description: 'Total units produced',
        requiredSemanticRoles: ['units_produced'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'units_produced' }],
        lineageFormulaTemplate: 'SUM({units_produced})',
        defaultVisualizationHint: 'bar_chart',
        unit: 'count', // R3
    },
    {
        id: 'mf-002', name: 'Yield Rate', category: 'quality', priority: 2,
        description: 'Good units as a fraction of total units produced',
        requiredSemanticRoles: ['good_units', 'total_units'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'good_units' },
            { function: 'SUM', semanticRole: 'total_units' },
        ],
        lineageFormulaTemplate: 'SUM({good_units}) / SUM({total_units})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'mf-003', name: 'Defect Rate', category: 'quality', priority: 3,
        description: 'Defective units as a fraction of total units',
        requiredSemanticRoles: ['defects', 'total_units'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'defects' },
            { function: 'SUM', semanticRole: 'total_units' },
        ],
        lineageFormulaTemplate: 'SUM({defects}) / SUM({total_units})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'mf-004', name: 'Overall Equipment Effectiveness', category: 'efficiency', priority: 4,
        description: 'OEE = Availability * Performance * Quality',
        requiredSemanticRoles: ['availability', 'performance', 'quality_ratio'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'AVG', semanticRole: 'availability' },
            { function: 'AVG', semanticRole: 'performance' },
            { function: 'AVG', semanticRole: 'quality_ratio' },
        ],
        lineageFormulaTemplate: 'AVG({availability}) * AVG({performance}) * AVG({quality_ratio})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'mf-005', name: 'Downtime', category: 'operations', priority: 5,
        description: 'Total machine downtime hours',
        requiredSemanticRoles: ['downtime'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'downtime' }],
        lineageFormulaTemplate: 'SUM({downtime})',
        defaultVisualizationHint: 'metric_card',
        unit: 'hours', // R3
    },
    {
        id: 'mf-006', name: 'Cost per Unit', category: 'cost', priority: 6,
        description: 'Total production cost divided by units produced',
        requiredSemanticRoles: ['unit_cost', 'units_produced'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'unit_cost' },
            { function: 'SUM', semanticRole: 'units_produced' },
        ],
        lineageFormulaTemplate: 'SUM({unit_cost}) / SUM({units_produced})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'mf-007', name: 'Machine Utilization', category: 'efficiency', priority: 7,
        description: 'Running time as a fraction of available scheduled time',
        requiredSemanticRoles: ['running_time', 'available_time'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'running_time' },
            { function: 'SUM', semanticRole: 'available_time' },
        ],
        lineageFormulaTemplate: 'SUM({running_time}) / SUM({available_time})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'mf-008', name: 'Scrap Rate', category: 'quality', priority: 8,
        description: 'Waste material as a fraction of total material used',
        requiredSemanticRoles: ['scrap', 'material_used'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'scrap' },
            { function: 'SUM', semanticRole: 'material_used' },
        ],
        lineageFormulaTemplate: 'SUM({scrap}) / SUM({material_used})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'mf-009', name: 'Throughput (Time-based)', category: 'volume', priority: 9,
        description: 'Units produced per time period',
        requiredSemanticRoles: ['units_produced', 'time_period'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'units_produced' }],
        lineageFormulaTemplate: 'SUM({units_produced}) / {time_period}',
        defaultVisualizationHint: 'bar_chart',
        unit: 'count', // R3
    },
    {
        id: 'mf-010', name: 'Lead Time', category: 'operations', priority: 10,
        description: 'Average time from order to delivery',
        requiredSemanticRoles: ['delivery_date', 'order_date'],
        requiresJoin: false,
        aggregationRules: [],
        lineageFormulaTemplate: 'AVG({delivery_date} - {order_date})',
        defaultVisualizationHint: 'metric_card',
        unit: 'days', // R3
    },
];

// ─── HEALTHCARE (10 rules) ────────────────────────────────────────────────────

const HEALTHCARE_RULES: KPIRule[] = [
    {
        id: 'hc-001', name: 'Patient Count', category: 'volume', priority: 1,
        description: 'Total distinct patients served',
        requiredSemanticRoles: ['patient_id'],
        requiresJoin: false,
        aggregationRules: [{ function: 'COUNT_DISTINCT', semanticRole: 'patient_id' }],
        lineageFormulaTemplate: 'COUNT(DISTINCT {patient_id})',
        defaultVisualizationHint: 'bar_chart',
        unit: 'count', // R3
    },
    {
        id: 'hc-002', name: 'Appointment No-show Rate', category: 'operations', priority: 2,
        description: 'Missed appointments as a fraction of total appointments',
        requiredSemanticRoles: ['no_show_flag', 'appointment_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'no_show_flag' },
            { function: 'COUNT', semanticRole: 'appointment_id' },
        ],
        lineageFormulaTemplate: 'COUNT({no_show_flag}) / COUNT({appointment_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'hc-003', name: 'Bed Occupancy Rate', category: 'capacity', priority: 3,
        description: 'Occupied beds as a fraction of total capacity',
        requiredSemanticRoles: ['beds_occupied', 'beds_total'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'beds_occupied' },
            { function: 'SUM', semanticRole: 'beds_total' },
        ],
        lineageFormulaTemplate: 'SUM({beds_occupied}) / SUM({beds_total})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'hc-004', name: 'Average Length of Stay', category: 'operations', priority: 4,
        description: 'Average days per patient admission',
        requiredSemanticRoles: ['discharge_date', 'admission_date'],
        requiresJoin: false,
        aggregationRules: [],
        lineageFormulaTemplate: 'AVG({discharge_date} - {admission_date})',
        defaultVisualizationHint: 'metric_card',
        unit: 'days', // R3
    },
    {
        id: 'hc-005', name: 'Readmission Rate', category: 'quality', priority: 5,
        description: 'Return admissions as a fraction of total discharges',
        requiredSemanticRoles: ['readmission_flag', 'patient_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'readmission_flag' },
            { function: 'COUNT_DISTINCT', semanticRole: 'patient_id' },
        ],
        lineageFormulaTemplate: 'COUNT({readmission_flag}) / COUNT(DISTINCT {patient_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'hc-006', name: 'Claim Approval Rate', category: 'operations', priority: 6,
        description: 'Approved insurance claims as a fraction of submitted',
        requiredSemanticRoles: ['claim_approved_flag', 'claim_submitted_flag'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'claim_approved_flag' },
            { function: 'COUNT', semanticRole: 'claim_submitted_flag' },
        ],
        lineageFormulaTemplate: 'COUNT({claim_approved_flag}) / COUNT({claim_submitted_flag})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'hc-007', name: 'Treatment Success Rate', category: 'quality', priority: 7,
        description: 'Successful treatment outcomes as a fraction of total treated',
        requiredSemanticRoles: ['treatment_success_flag', 'treatment_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'treatment_success_flag' },
            { function: 'COUNT', semanticRole: 'treatment_id' },
        ],
        lineageFormulaTemplate: 'COUNT({treatment_success_flag}) / COUNT({treatment_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'hc-008', name: 'Cost per Treatment', category: 'cost', priority: 8,
        description: 'Total treatment costs divided by number of treatments',
        requiredSemanticRoles: ['treatment_cost', 'treatment_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'treatment_cost' },
            { function: 'COUNT', semanticRole: 'treatment_id' },
        ],
        lineageFormulaTemplate: 'SUM({treatment_cost}) / COUNT({treatment_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'hc-009', name: 'Doctor Utilization', category: 'efficiency', priority: 9,
        description: 'Patient hours as a fraction of total available hours',
        requiredSemanticRoles: ['patient_hours', 'available_hours'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'patient_hours' },
            { function: 'SUM', semanticRole: 'available_hours' },
        ],
        lineageFormulaTemplate: 'SUM({patient_hours}) / SUM({available_hours})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'hc-010', name: 'Revenue per Patient', category: 'revenue', priority: 10,
        description: 'Average revenue generated per patient (requires join)',
        requiredSemanticRoles: ['patient_id'],
        requiresJoin: true,
        joinedSemanticRoles: ['revenue'],
        aggregationRules: [
            { function: 'SUM', semanticRole: 'revenue' },
            { function: 'COUNT_DISTINCT', semanticRole: 'patient_id' },
        ],
        lineageFormulaTemplate: 'SUM({revenue}) / COUNT(DISTINCT {patient_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
];

// ─── FINANCE (10 rules) ───────────────────────────────────────────────────────

const FINANCE_RULES: KPIRule[] = [
    {
        id: 'fn-001', name: 'Total Transactions', category: 'volume', priority: 1,
        description: 'Total number of financial transactions',
        requiredSemanticRoles: ['transaction_id'],
        requiresJoin: false,
        aggregationRules: [{ function: 'COUNT', semanticRole: 'transaction_id' }],
        lineageFormulaTemplate: 'COUNT({transaction_id})',
        defaultVisualizationHint: 'bar_chart',
        unit: 'count', // R3
    },
    {
        id: 'fn-002', name: 'Net Profit', category: 'profitability', priority: 2,
        description: 'Revenue minus expenses',
        requiredSemanticRoles: ['revenue', 'expenses'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'revenue' },
            { function: 'SUM', semanticRole: 'expenses' },
        ],
        lineageFormulaTemplate: 'SUM({revenue}) - SUM({expenses})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'fn-003', name: 'Cash Flow', category: 'liquidity', priority: 3,
        description: 'Net cash movement: inflows minus outflows',
        requiredSemanticRoles: ['inflow', 'outflow'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'inflow' },
            { function: 'SUM', semanticRole: 'outflow' },
        ],
        lineageFormulaTemplate: 'SUM({inflow}) - SUM({outflow})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'fn-004', name: 'Loan Default Rate', category: 'risk', priority: 4,
        description: 'Defaulted loans as a fraction of total loan portfolio',
        requiredSemanticRoles: ['default_flag', 'loan_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'default_flag' },
            { function: 'COUNT', semanticRole: 'loan_id' },
        ],
        lineageFormulaTemplate: 'COUNT({default_flag}) / COUNT({loan_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'fn-005', name: 'Return on Assets', category: 'performance', priority: 5,
        description: 'Net income as a fraction of average total assets',
        requiredSemanticRoles: ['net_income', 'total_assets'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'net_income' },
            { function: 'AVG', semanticRole: 'total_assets' },
        ],
        lineageFormulaTemplate: 'SUM({net_income}) / AVG({total_assets})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'fn-006', name: 'Return on Equity', category: 'performance', priority: 6,
        description: 'Net income as a fraction of average shareholders equity',
        requiredSemanticRoles: ['net_income', 'equity'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'net_income' },
            { function: 'AVG', semanticRole: 'equity' },
        ],
        lineageFormulaTemplate: 'SUM({net_income}) / AVG({equity})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'fn-007', name: 'Liquidity Ratio', category: 'liquidity', priority: 7,
        description: 'Current assets divided by current liabilities',
        requiredSemanticRoles: ['current_assets', 'current_liabilities'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'current_assets' },
            { function: 'SUM', semanticRole: 'current_liabilities' },
        ],
        lineageFormulaTemplate: 'SUM({current_assets}) / SUM({current_liabilities})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'fn-008', name: 'Non-performing Assets Ratio', category: 'risk', priority: 8,
        description: 'NPA as a fraction of total loan portfolio',
        requiredSemanticRoles: ['npa', 'total_loans'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'SUM', semanticRole: 'npa' },
            { function: 'SUM', semanticRole: 'total_loans' },
        ],
        lineageFormulaTemplate: 'SUM({npa}) / SUM({total_loans})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
    {
        id: 'fn-009', name: 'Interest Income', category: 'revenue', priority: 9,
        description: 'Total interest earned on loans and investments',
        requiredSemanticRoles: ['interest_income'],
        requiresJoin: false,
        aggregationRules: [{ function: 'SUM', semanticRole: 'interest_income' }],
        lineageFormulaTemplate: 'SUM({interest_income})',
        defaultVisualizationHint: 'metric_card',
        unit: 'currency', // R3
    },
    {
        id: 'fn-010', name: 'Fraud Rate', category: 'risk', priority: 10,
        description: 'Fraudulent transactions as a fraction of total transactions',
        requiredSemanticRoles: ['fraud_flag', 'transaction_id'],
        requiresJoin: false,
        aggregationRules: [
            { function: 'COUNT', semanticRole: 'fraud_flag' },
            { function: 'COUNT', semanticRole: 'transaction_id' },
        ],
        lineageFormulaTemplate: 'COUNT({fraud_flag}) / COUNT({transaction_id})',
        defaultVisualizationHint: 'metric_card',
        unit: 'ratio', // R3
    },
];

// ─── Master Registry ──────────────────────────────────────────────────────────

export const KPI_RULE_REGISTRY: Record<DomainType, KPIRule[]> = {
    ECOMMERCE: ECOMMERCE_RULES,
    SAAS: SAAS_RULES,
    EDTECH: EDTECH_RULES,
    RETAIL: RETAIL_RULES,
    SERVICES: SERVICES_RULES,
    MANUFACTURING: MANUFACTURING_RULES,
    HEALTHCARE: HEALTHCARE_RULES,
    FINANCE: FINANCE_RULES,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getRulesForDomain(domain: DomainType): KPIRule[] {
    return KPI_RULE_REGISTRY[domain] ?? [];
}

export function getRuleById(domain: DomainType, ruleId: string): KPIRule | undefined {
    return getRulesForDomain(domain).find(r => r.id === ruleId);
}

export function getAllRuleIds(domain: DomainType): string[] {
    return getRulesForDomain(domain).map(r => r.id);
}
