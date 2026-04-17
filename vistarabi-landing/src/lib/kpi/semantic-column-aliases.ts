// Module 4.5 — Semantic Column Aliases
// Comprehensive role → column alias table for all 8 domains.
// This is used by the AI KPI Discovery pipeline and semantic mapping stage
// to expand raw column names into recognised SemanticRoles.
//
// Format: role alias arrays use lowercase with common real-world variant spellings,
// Indian business conventions, and ERP/CRM system export column names.

import type { SemanticRole } from './semantic-types';

export type AliasMap = Partial<Record<SemanticRole, string[]>>;

// ─── UNIVERSAL roles (present across all domains) ─────────────────────────────

const UNIVERSAL_ALIASES: AliasMap = {
    // Financial — revenue
    revenue: [
        'total_amount', 'order_value', 'sales', 'sales_amount', 'amount',
        'order_total', 'gross_revenue', 'income', 'net_sales', 'total_sales',
        'billing_amount', 'invoice_amount', 'contract_value', 'sale_value',
        'selling_price', 'price', 'total_price', 'total_value',
    ],
    // Financial — cost
    cost: [
        'total_cost', 'expenses', 'costs', 'expenditure', 'spend',
        'total_expenses', 'operational_cost', 'operating_cost', 'expense_amount',
    ],
    // Financial — profit
    profit: [
        'net_profit', 'gross_profit', 'profit_amount', 'net_income',
        'earnings', 'operating_profit', 'ebit', 'ebitda',
    ],
    // Identifiers — customer
    customer_id: [
        'user_id', 'buyer_id', 'client_id', 'account_id', 'cust_id',
        'member_id', 'consumer_id', 'patron_id', 'shopper_id',
    ],
    // Temporal — date
    date: [
        'order_date', 'created_at', 'created_date', 'txn_date', 'transaction_date',
        'sale_date', 'invoice_date', 'entry_date', 'record_date', 'event_date',
        'timestamp', 'date_created', 'bill_date', 'payment_date',
    ],
    // Status/Categorical
    status: [
        'state', 'order_status', 'project_status', 'current_status',
        'stage', 'phase', 'condition',
    ],
    // Marketing cost
    marketing_cost: [
        'ad_spend', 'advertising_spend', 'marketing_spend', 'acquisition_cost',
        'campaign_cost', 'promotion_cost', 'ad_cost', 'promo_spend',
    ],
};

// ─── E-COMMERCE ───────────────────────────────────────────────────────────────

export const ECOMMERCE_ALIASES: AliasMap = {
    ...UNIVERSAL_ALIASES,
    order_id: [
        'order_number', 'transaction_id', 'invoice_id', 'receipt_id',
        'bill_no', 'order_ref', 'purchase_id', 'txn_id', 'payment_ref',
    ],
    product_id: [
        'sku', 'item_id', 'product_code', 'prod_id', 'item_code',
        'catalogue_id', 'variant_id', 'barcode',
    ],
    session_id: ['visitor_id', 'browsing_id', 'visit_id', 'user_session'],
    cart_id: ['basket_id', 'shopping_cart_id', 'checkout_id'],
    return_id: ['refund_id', 'return_order_id', 'rma_id', 'return_ref'],
    quantity: ['qty', 'units', 'items_sold', 'ordered_qty', 'item_count'],
    cogs: ['cost_of_goods', 'product_cost', 'item_cost', 'cog', 'cost_price', 'purchase_price'],
    discount: ['promo_value', 'coupon_value', 'discount_amount', 'offer_amount', 'rebate'],
    category: ['product_category', 'dept', 'department', 'segment', 'product_type'],
    channel: ['source', 'platform', 'sales_channel', 'acquisition_channel', 'referral_source'],
    is_new: ['customer_type', 'new_customer', 'first_purchase', 'new_buyer'],
};

// ─── SAAS ─────────────────────────────────────────────────────────────────────

export const SAAS_ALIASES: AliasMap = {
    ...UNIVERSAL_ALIASES,
    mrr: [
        'monthly_revenue', 'subscription_fee', 'plan_price', 'monthly_amount',
        'recurring_revenue', 'subscription_amount', 'monthly_arr',
    ],
    expansion_mrr: ['upsell', 'upgrade_revenue', 'expansion_revenue', 'add_on_revenue'],
    contraction_mrr: ['downgrade', 'downgrade_revenue', 'contraction_revenue'],
    user_id: ['account_id', 'subscriber_id', 'tenant_id', 'org_id', 'workspace_id'],
    churn_flag: [
        'churned', 'cancelled', 'lost', 'inactive', 'is_churned',
        'subscription_cancelled', 'has_churned', 'churn_indicator',
    ],
    trial_flag: ['is_trial', 'in_trial', 'trial_user', 'trial_started', 'free_trial'],
    converted_flag: ['converted', 'is_paid', 'premium', 'has_converted', 'paid_conversion'],
    login_date: ['last_login', 'last_active', 'activity_date', 'last_seen', 'login_timestamp'],
    paid_flag: ['is_paid', 'payment_received', 'has_paid', 'paid'],
};

// ─── EDTECH ───────────────────────────────────────────────────────────────────

export const EDTECH_ALIASES: AliasMap = {
    ...UNIVERSAL_ALIASES,
    student_id: ['learner_id', 'participant_id', 'attendee_id', 'trainee_id', 'member_id'],
    enrollment_id: ['registration_id', 'signup_id', 'enrolment_id', 'admission_id'],
    course_id: ['module_id', 'programme_id', 'class_id', 'subject_id', 'lesson_id'],
    completion_flag: [
        'completed', 'course_completed', 'finished', 'is_complete', 'done',
        'graduated', 'passed_out', 'course_done',
    ],
    certification_flag: ['certified', 'has_certificate', 'certificate_issued', 'credentialed'],
    grade: ['score', 'marks', 'percentage', 'result', 'grade_score', 'exam_score', 'test_score'],
    login_date: ['last_activity', 'last_login', 'last_seen', 'last_access_date'],
    status: ['enrollment_status', 'course_status', 'student_status', 'state'],
};

// ─── RETAIL ───────────────────────────────────────────────────────────────────

export const RETAIL_ALIASES: AliasMap = {
    ...UNIVERSAL_ALIASES,
    order_id: [
        'order_number', 'transaction_id', 'receipt_id', 'bill_no', 'sale_id',
        'invoiceno', 'invoice_id', 'venda_id',
    ],
    customer_id: [
        'user_id', 'buyer_id', 'shopper_id', 'customer_name', 'phone',
        'customerid', 'cliente_id',
    ],
    store_id: [
        'outlet', 'outlet_id', 'location', 'location_id', 'branch',
        'branch_id', 'shop_id', 'pos_id', 'store_code', 'loja_id', 'store',
    ],
    revenue: [
        ...(UNIVERSAL_ALIASES.revenue ?? []),
        'order_total', 'sales_amount', 'weekly_sales', 'retail_sales', 'warehouse_sales',
    ],
    // unit_price is not a top-level SemanticRole; merge its aliases into cost
    // so SQL compiler can cast price columns as NUMERIC.
    cost: [
        ...(UNIVERSAL_ALIASES.cost ?? []),
        'price', 'rate', 'unit_cost', 'unitprice', 'preço unitário', 'valor_unitario',
    ],
    inventory: [
        'stock', 'stock_value', 'inventory_value', 'stock_amount',
        'on_hand_value', 'warehouse_value', 'stockcode',
    ],
    items_in_basket: [
        'quantity', 'basket_qty', 'items', 'basket_items', 'units_per_transaction',
        'quantidade',
    ],
    transaction_id: [
        'bill_no', 'receipt_id', 'pos_txn_id', 'sale_id', 'invoice_no',
        'till_id', 'register_id', 'venda_id',
    ],
    sold_units: ['qty_sold', 'units_sold', 'quantity_sold', 'items_sold', 'quantidade'],
    received_units: ['qty_received', 'inward_qty', 'purchase_qty', 'received_qty', 'stock_received'],
    shrinkage: ['loss', 'theft', 'spoilage', 'wastage', 'shrinkage_qty', 'pilferage', 'damaged_stock'],
    visitor_count: ['footfall', 'walk_ins', 'store_visitors', 'traffic', 'footfall_count', 'numwebvisitsmonth'],
    cogs: [
        'cost_of_goods', 'cost_price', 'purchase_cost', 'item_cost',
        'landed_cost', 'cost_of_sales',
    ],
};

// ─── SERVICES ─────────────────────────────────────────────────────────────────

export const SERVICES_ALIASES: AliasMap = {
    ...UNIVERSAL_ALIASES,
    client_id: ['customer_id', 'account_id', 'company_id', 'org_id', 'customer_code'],
    project_id: ['engagement_id', 'work_order_id', 'job_id', 'assignment_id', 'case_id'],
    invoice_id: ['bill_id', 'bill_no', 'invoice_no', 'receipt_id', 'billing_ref'],
    billable_hours: [
        'billed_hrs', 'chargeable_hours', 'billable_hrs', 'charged_hours',
        'productive_hours', 'client_hours',
    ],
    total_hours: [
        'logged_hours', 'worked_hours', 'gross_hours', 'total_hrs',
        'hours_logged', 'time_logged',
    ],
    hours_worked: ['actual_hours', 'worked_hrs', 'effort_hours', 'time_spent_hours'],
    available_hours: ['capacity_hours', 'planned_hours', 'scheduled_hours', 'total_capacity'],
    project_cost: [
        'engagement_cost', 'delivery_cost', 'job_cost', 'project_expense',
        'resource_cost', 'project_budget_used',
    ],
    due_date: ['payment_due', 'due_on', 'invoice_due_date', 'payable_by'],
    paid_flag: ['is_paid', 'payment_status', 'settled', 'cleared', 'received'],
};

// ─── MANUFACTURING ────────────────────────────────────────────────────────────

export const MANUFACTURING_ALIASES: AliasMap = {
    ...UNIVERSAL_ALIASES,
    machine_id: ['equipment_id', 'asset_id', 'line_id', 'station_id', 'machine_code'],
    units_produced: [
        'output', 'production_qty', 'produced_qty', 'total_output',
        'qty_produced', 'manufactured_qty', 'batch_output',
    ],
    good_units: ['ok_units', 'passed_units', 'accepted_qty', 'quality_passed', 'conforming_units'],
    total_units: ['total_produced', 'gross_output', 'batch_size', 'production_total'],
    defects: ['rejections', 'fails', 'failures', 'non_conforming', 'rejected_units', 'defective_qty'],
    scrap: ['waste', 'wastage', 'scrap_qty', 'material_waste', 'scrap_weight'],
    material_used: ['raw_material_qty', 'input_material', 'material_consumed', 'rm_used'],
    downtime: [
        'machine_stop', 'idle_time', 'breakdown_time', 'unplanned_downtime',
        'stoppage_hours', 'downtime_hrs', 'machine_downtime',
    ],
    running_time: [
        'machine_running_hrs', 'ops_time', 'operating_time', 'productive_time',
        'uptime', 'run_time', 'machine_hours',
    ],
    available_time: [
        'scheduled_time', 'planned_time', 'shift_hours', 'capacity_hours',
        'total_shift_time', 'available_hrs',
    ],
    availability: ['machine_availability', 'uptime_ratio', 'availability_rate'],
    performance: ['performance_rate', 'efficiency_rate', 'speed_ratio'],
    quality_ratio: ['quality_rate', 'first_pass_yield', 'pass_rate', 'fpy'],
    unit_cost: ['cost_per_unit', 'manufacturing_cost', 'production_cost_per_unit'],
    delivery_date: ['dispatch_date', 'ship_date', 'shipped_on', 'actual_delivery'],
    order_date: ['production_order_date', 'work_order_date', 'po_date', 'planned_start'],
};

// ─── HEALTHCARE ───────────────────────────────────────────────────────────────

export const HEALTHCARE_ALIASES: AliasMap = {
    ...UNIVERSAL_ALIASES,
    patient_id: ['member_id', 'beneficiary_id', 'case_id', 'uhid', 'patient_code', 'mr_no'],
    appointment_id: ['visit_id', 'opd_id', 'booking_id', 'slot_id', 'consultation_id'],
    treatment_id: ['procedure_id', 'service_id', 'episode_id', 'case_episode_id'],
    no_show_flag: [
        'missed', 'cancelled', 'did_not_attend', 'dna', 'is_no_show',
        'absent', 'no_show', 'failed_attendance',
    ],
    admission_date: ['admit_date', 'admitted_on', 'ipd_start', 'hospitalisation_date'],
    discharge_date: ['discharge_on', 'released_date', 'ipd_end', 'exit_date'],
    beds_occupied: [
        'occupied_beds', 'patients_in_bed', 'inpatients', 'bed_days_used',
        'census', 'daily_census',
    ],
    beds_total: ['total_beds', 'bed_capacity', 'bed_strength', 'sanctioned_beds'],
    treatment_cost: ['procedure_cost', 'service_cost', 'care_cost', 'clinical_cost'],
    claim_submitted_flag: ['claim_raised', 'has_claim', 'is_claimed', 'claim_filed'],
    claim_approved_flag: ['claim_approved', 'insurance_approved', 'claim_settled', 'approved'],
    readmission_flag: ['readmitted', 'is_readmission', 'bounce_back', 'repeat_admission'],

    patient_hours: ['physician_hours', 'doctor_hours', 'consultation_time'],
};

// ─── FINANCE ──────────────────────────────────────────────────────────────────

export const FINANCE_ALIASES: AliasMap = {
    ...UNIVERSAL_ALIASES,
    transaction_id: [
        'txn_id', 'payment_id', 'transfer_id', 'ref_no', 'utr_no',
        'rrn', 'cheque_no', 'dd_no', 'neft_ref',
    ],
    inflow: ['receipts', 'credit_amount', 'credit', 'money_in', 'incoming'],
    outflow: ['payments', 'debit_amount', 'debit', 'money_out', 'outgoing'],
    loan_id: ['account_no', 'loan_account', 'credit_account', 'loan_ref'],
    loan_amount: ['sanctioned_amount', 'principal', 'disbursed_amount', 'loan_value'],
    total_loans: ['loan_portfolio', 'total_credit', 'gross_advances', 'total_lending'],
    interest_income: ['interest_earned', 'interest_received', 'finance_income'],
    default_flag: ['is_defaulter', 'has_defaulted', 'default', 'payment_default'],
    fraud_flag: [
        'suspicious_flag', 'is_fraud', 'flagged_txn', 'anomaly_flag',
        'suspect', 'fraud_indicator', 'is_suspicious',
    ],
    npa: ['bad_debt', 'non_performing', 'npa_amount', 'npa_balance', 'stressed_asset'],
    net_income: ['net_earnings', 'pat', 'profit_after_tax', 'net_profit'],
    total_assets: ['gross_assets', 'asset_base', 'balance_sheet_total'],
    current_assets: ['short_term_assets', 'liquid_assets', 'working_assets'],
    current_liabilities: ['short_term_liabilities', 'current_obligations'],
    equity: ['shareholders_equity', 'net_worth', 'book_value', 'owners_equity'],
};

// ─── Domain alias registry ─────────────────────────────────────────────────────

import type { DomainType } from '@/lib/prisma';

export const DOMAIN_ALIASES: Record<DomainType, AliasMap> = {
    ECOMMERCE:     ECOMMERCE_ALIASES,
    SAAS:          SAAS_ALIASES,
    EDTECH:        EDTECH_ALIASES,
    RETAIL:        RETAIL_ALIASES,
    SERVICES:      SERVICES_ALIASES,
    MANUFACTURING: MANUFACTURING_ALIASES,
    HEALTHCARE:    HEALTHCARE_ALIASES,
    FINANCE:       FINANCE_ALIASES,
};

/**
 * Given a raw column name and a domain, try to resolve it to a SemanticRole.
 * Returns the matching role or null if no match found.
 */
export function resolveColumnToRole(
    columnName: string,
    domain: DomainType
): SemanticRole | null {
    const aliasMap = DOMAIN_ALIASES[domain];
    if (!aliasMap) return null;

    const normalized = columnName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/, '');

    for (const [role, aliases] of Object.entries(aliasMap) as [SemanticRole, string[]][]) {
        if (!aliases) continue;

        // Exact match against canonical role name
        if (normalized === role.replace(/_/g, '_')) {
            return role;
        }

        // Match against each alias
        for (const alias of aliases) {
            const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/, '');
            if (normalized === normalizedAlias) {
                return role;
            }
            // Loose contains match (lower confidence)
            if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
                if (normalizedAlias.length >= 4 && normalized.length >= 4) { // avoid false positives on short tokens
                    return role;
                }
            }
        }
    }

    return null;
}

/**
 * Build a SemanticColumnMap from a set of raw columns for a given domain.
 * Used by the AI KPI discovery pipeline to auto-populate semantic roles.
 */
export function buildSemanticColumnMapFromAliases(
    rawColumns: string[],
    domain: DomainType
): Partial<Record<SemanticRole, string>> {
    const result: Partial<Record<SemanticRole, string>> = {};

    for (const col of rawColumns) {
        const role = resolveColumnToRole(col, domain);
        if (role && !result[role]) {
            // First match wins (highest confidence)
            result[role] = col;
        }
    }

    return result;
}
