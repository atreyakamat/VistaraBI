// Domain Keyword Libraries for Business Classification
// 8 domains × 30 keywords each = 240 keywords total

export type DomainType =
    | 'ECOMMERCE'
    | 'SAAS'
    | 'EDTECH'
    | 'RETAIL'
    | 'SERVICES'
    | 'MANUFACTURING'
    | 'HEALTHCARE'
    | 'FINANCE';

export type DomainStatus = 'AUTO_ASSIGNED' | 'MANUAL_REQUIRED' | 'MANUALLY_SELECTED';

export interface DomainInfo {
    type: DomainType;
    name: string;
    icon: string;
    color: string;
    keywords: string[];
}

export const DOMAIN_LIBRARIES: Record<DomainType, DomainInfo> = {
    ECOMMERCE: {
        type: 'ECOMMERCE',
        name: 'E-Commerce',
        icon: 'shopping-cart',
        color: '#f97316', // Orange
        keywords: [
            'order', 'order_id', 'orderid', 'orderdate', 'order_date',
            'product', 'product_id', 'sku', 'item', 'item_id',
            'price', 'unit_price', 'selling_price', 'cost',
            'quantity', 'qty', 'units',
            'customer', 'customer_id', 'user_id',
            'cart', 'checkout', 'payment', 'transaction',
            'shipping', 'address', 'delivery', 'return',
        ],
    },
    SAAS: {
        type: 'SAAS',
        name: 'SaaS',
        icon: 'laptop',
        color: '#3b82f6', // Blue
        keywords: [
            'user', 'user_id', 'account', 'account_id',
            'subscription', 'subscription_id', 'plan', 'tier',
            'mrr', 'arr', 'revenue', 'billing',
            'invoice', 'invoice_id', 'payment',
            'trial', 'churn', 'churn_date', 'renewal',
            'active_users', 'seats', 'licenses',
            'signup_date', 'last_login', 'session',
            'usage', 'api_calls', 'feature_usage',
        ],
    },
    EDTECH: {
        type: 'EDTECH',
        name: 'EdTech',
        icon: 'graduation-cap',
        color: '#8b5cf6', // Purple
        keywords: [
            'student', 'student_id', 'learner', 'learner_id',
            'course', 'course_id', 'module', 'lesson',
            'enrollment', 'enrolled_on', 'batch',
            'instructor', 'teacher', 'faculty',
            'progress', 'completion', 'grade', 'score',
            'exam', 'quiz', 'assignment',
            'certificate', 'result', 'marks',
            'attendance', 'session', 'classroom',
        ],
    },
    RETAIL: {
        type: 'RETAIL',
        name: 'Retail',
        icon: 'store',
        color: '#22c55e', // Green
        keywords: [
            'store', 'store_id', 'outlet', 'branch',
            'order', 'order_id', 'order_total', 'customer', 'customer_id',
            'sku', 'barcode', 'item_code',
            'inventory', 'stock', 'stock_qty',
            'sales', 'bill', 'receipt', 'pos',
            'category', 'aisle', 'shelf',
            'supplier', 'vendor', 'distributor',
            'purchase_order', 'po_number',
            'mrp', 'discount', 'tax', 'gst',
        ],
    },
    SERVICES: {
        type: 'SERVICES',
        name: 'Services',
        icon: 'receipt',
        color: '#06b6d4', // Cyan
        keywords: [
            'client', 'client_id', 'customer',
            'project', 'project_id', 'task',
            'invoice', 'invoice_id', 'billing',
            'hours', 'billable_hours', 'rate',
            'timesheet', 'consultant', 'employee',
            'service_type', 'engagement',
            'start_date', 'end_date',
            'milestone', 'deliverable',
            'contract', 'agreement',
            'status', 'priority',
        ],
    },
    MANUFACTURING: {
        type: 'MANUFACTURING',
        name: 'Manufacturing',
        icon: 'factory',
        color: '#6b7280', // Gray
        keywords: [
            'batch', 'batch_id', 'lot', 'lot_number',
            'production', 'unit', 'output',
            'machine', 'equipment', 'line',
            'quality', 'defect', 'rejection',
            'yield', 'wastage', 'scrap',
            'raw_material', 'material_code',
            'bom', 'assembly', 'process',
            'downtime', 'maintenance',
            'operator', 'supervisor',
            'shift', 'plant',
        ],
    },
    HEALTHCARE: {
        type: 'HEALTHCARE',
        name: 'Healthcare',
        icon: 'hospital',
        color: '#ef4444', // Red
        keywords: [
            'patient', 'patient_id', 'case_id',
            'doctor', 'physician', 'nurse',
            'appointment', 'visit', 'admission',
            'diagnosis', 'symptom', 'treatment',
            'procedure', 'prescription', 'medicine',
            'test', 'lab_result', 'report',
            'department', 'ward', 'bed',
            'insurance', 'claim', 'policy',
            'discharge', 'follow_up', 'referral',
        ],
    },
    FINANCE: {
        type: 'FINANCE',
        name: 'Finance',
        icon: 'dollar-sign',
        color: '#eab308', // Gold
        keywords: [
            'account', 'account_id', 'transaction',
            'txn_id', 'debit', 'credit',
            'balance', 'ledger', 'journal',
            'bank', 'branch', 'ifsc',
            'loan', 'emi', 'interest',
            'principal', 'tenure',
            'investment', 'portfolio',
            'asset', 'liability', 'equity',
            'profit', 'loss', 'statement',
            'audit', 'tax', 'gst',
        ],
    },
};

// Get all domain types
export const ALL_DOMAINS: DomainType[] = Object.keys(DOMAIN_LIBRARIES) as DomainType[];

// Get domain info by type
export function getDomainInfo(type: DomainType): DomainInfo {
    return DOMAIN_LIBRARIES[type];
}

// Get all keywords for a domain
export function getDomainKeywords(type: DomainType): string[] {
    return DOMAIN_LIBRARIES[type].keywords;
}

// Confidence threshold for auto-assignment
export const AUTO_ASSIGN_THRESHOLD = 60;
