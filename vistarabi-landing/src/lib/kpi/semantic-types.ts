// Module 4.5 — Semantic Type System
// KPI eligibility rules reference semantic roles, NEVER raw column names.
// Raw columns are only resolved at the SemanticResolver stage.

import type { DomainType, RelationshipEntry, AggregationFunction } from '@/lib/prisma';

// ─── Semantic Roles ───────────────────────────────────────────────────────────
// Abstract business concepts. A semantic mapper maps each role -> actual column.

export type SemanticRole =
    // Financial
    | 'revenue' | 'cost' | 'profit' | 'mrr' | 'expenses' | 'inflow' | 'outflow'
    | 'discount' | 'refund' | 'marketing_cost' | 'expansion_mrr' | 'contraction_mrr'
    | 'project_cost' | 'treatment_cost' | 'unit_cost' | 'net_income' | 'interest_income'
    | 'cogs' | 'npa' | 'total_loans' | 'loan_amount' | 'equity'
    | 'current_assets' | 'current_liabilities' | 'total_assets'
    // Identifiers
    | 'order_id' | 'customer_id' | 'product_id' | 'user_id' | 'session_id' | 'cart_id'
    | 'return_id' | 'enrollment_id' | 'student_id' | 'course_id' | 'store_id'
    | 'employee_id' | 'project_id' | 'client_id' | 'invoice_id' | 'patient_id'
    | 'appointment_id' | 'treatment_id' | 'transaction_id' | 'loan_id' | 'machine_id'
    // Temporal
    | 'date' | 'due_date' | 'delivery_date' | 'order_date' | 'login_date'
    | 'discharge_date' | 'admission_date'
    // Quantities / volumes
    | 'quantity' | 'inventory' | 'visitor_count' | 'billable_hours' | 'total_hours'
    | 'units_produced' | 'downtime' | 'scrap' | 'material_used' | 'beds_occupied'
    | 'beds_total' | 'good_units' | 'total_units' | 'defects' | 'sold_units'
    | 'received_units' | 'items_in_basket' | 'hours_worked' | 'available_hours'
    | 'patient_hours' | 'running_time' | 'available_time' | 'time_period' | 'shrinkage'
    // Status / categorical
    | 'category' | 'channel' | 'status' | 'is_new'
    // Boolean flags
    | 'churn_flag' | 'trial_flag' | 'converted_flag' | 'completion_flag'
    | 'certification_flag' | 'paid_flag' | 'no_show_flag' | 'readmission_flag'
    | 'claim_approved_flag' | 'claim_submitted_flag' | 'treatment_success_flag'
    | 'fraud_flag' | 'default_flag'
    // Ratios (pre-aggregated)
    | 'availability' | 'performance' | 'quality_ratio'
    // EdTech
    | 'grade';

// ─── Semantic Column Map ───────────────────────────────────────────────────────
// Output of Module 2 / AI semantic mapping.  role -> real column name.
export type SemanticColumnMap = Partial<Record<SemanticRole, string>>;

// ─── Source Info ───────────────────────────────────────────────────────────────
export interface SourceInfo {
    id: string;
    name: string;       // e.g. "orders.csv"
    columns: string[];  // actual column names
}

// ─── Module 4.5 Input Contract ────────────────────────────────────────────────
export interface SemanticInput {
    projectId: string;
    domain: DomainType;
    semanticColumns: SemanticColumnMap;
    relationships: RelationshipEntry[];
    sources: SourceInfo[];
}

// ─── Eligible KPI ─────────────────────────────────────────────────────────────
export interface EligibleKPIAggregation {
    function: AggregationFunction;
    semanticRole: SemanticRole;
    column: string;          // resolved real column name
    sourceId: string;
    sourceName: string;
}

export interface EligibleKPIJoin {
    leftTable: string;
    leftColumn: string;
    rightTable: string;
    rightColumn: string;
    joinType: 'INNER' | 'LEFT';
    confidence: number;
}

export interface EligibleKPI {
    ruleId: string;
    name: string;
    description: string;
    domain: DomainType;
    category: string;
    sourceTable: string;           // primary source table
    formula: string;               // interpolated with real columns
    unit: string;                  // R3: e.g. "INR", "count", "percent"
    aggregations: EligibleKPIAggregation[];
    joins: EligibleKPIJoin[];
    tables: string[];
    defaultVisualizationHint: string;
    priority: number;
    semanticRolesUsed: SemanticRole[];
}

// ─── Eligibility Log ──────────────────────────────────────────────────────────
export interface EligibilityLogEntry {
    ruleId: string;
    ruleName: string;
    status: 'UNLOCKED' | 'SKIPPED';
    reason?: string;
    missingRoles?: SemanticRole[];
}

// ─── Module 4.5 Output Contract (input to Module 5) ──────────────────────────
export interface DomainContextObject {
    domain: DomainType;
    semanticColumns: SemanticColumnMap;
    relationships: RelationshipEntry[];
    availableKPIs: EligibleKPI[];
    unlockedCount: number;
    skippedCount: number;
    eligibilityLog: EligibilityLogEntry[];
}
