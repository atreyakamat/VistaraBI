// KPI Library - Master definitions for all 8 domains
// Module 4 Phase 4A

import type { DomainType } from '@/lib/prisma';

export interface KPIDefinition {
    id: string;
    name: string;
    domain: DomainType;
    description: string;
    formula: string;
    requiredColumns: string[];
    columnAliases: Record<string, string[]>;
    category: string;
    priority: number;
}

// E-COMMERCE KPIs (20)
export const ECOMMERCE_KPIS: KPIDefinition[] = [
    { id: 'ec-001', name: 'Total Revenue', domain: 'ECOMMERCE', description: 'Sum of all order values', formula: 'SUM(revenue)', requiredColumns: ['revenue'], columnAliases: { revenue: ['total_amount', 'order_value', 'sales', 'amount', 'price', 'order_total'] }, category: 'revenue', priority: 1 },
    { id: 'ec-002', name: 'Orders Count', domain: 'ECOMMERCE', description: 'Total number of orders', formula: 'COUNT(order_id)', requiredColumns: ['order_id'], columnAliases: { order_id: ['order_number', 'transaction_id', 'invoice_id'] }, category: 'volume', priority: 2 },
    { id: 'ec-003', name: 'Average Order Value', domain: 'ECOMMERCE', description: 'Revenue per order', formula: 'SUM(revenue) / COUNT(order_id)', requiredColumns: ['revenue', 'order_id'], columnAliases: { revenue: ['total_amount', 'order_value'], order_id: ['order_number'] }, category: 'revenue', priority: 3 },
    { id: 'ec-004', name: 'Conversion Rate', domain: 'ECOMMERCE', description: 'Orders / Visitors', formula: 'COUNT(order_id) / COUNT(DISTINCT visitor_id)', requiredColumns: ['order_id', 'visitor_id'], columnAliases: { visitor_id: ['session_id', 'user_id'] }, category: 'conversion', priority: 4 },
    { id: 'ec-005', name: 'Cart Abandonment Rate', domain: 'ECOMMERCE', description: 'Abandoned carts vs total', formula: '(COUNT(cart_id) - COUNT(order_id)) / COUNT(cart_id)', requiredColumns: ['cart_id', 'order_id'], columnAliases: { cart_id: ['basket_id'] }, category: 'conversion', priority: 5 },
    { id: 'ec-006', name: 'Customer Lifetime Value', domain: 'ECOMMERCE', description: 'Total value per customer', formula: 'SUM(revenue) / COUNT(DISTINCT customer_id)', requiredColumns: ['revenue', 'customer_id'], columnAliases: { customer_id: ['user_id', 'buyer_id'] }, category: 'customer', priority: 6 },
    { id: 'ec-007', name: 'Customer Acquisition Cost', domain: 'ECOMMERCE', description: 'Marketing spend per new customer', formula: 'SUM(marketing_cost) / COUNT(DISTINCT new_customer_id)', requiredColumns: ['marketing_cost', 'new_customer_id'], columnAliases: { marketing_cost: ['ad_spend', 'acquisition_cost'] }, category: 'marketing', priority: 7 },
    { id: 'ec-008', name: 'Gross Margin', domain: 'ECOMMERCE', description: 'Revenue minus COGS', formula: '(SUM(revenue) - SUM(cogs)) / SUM(revenue)', requiredColumns: ['revenue', 'cogs'], columnAliases: { cogs: ['cost_of_goods', 'product_cost'] }, category: 'profitability', priority: 8 },
    { id: 'ec-009', name: 'Net Profit', domain: 'ECOMMERCE', description: 'Revenue minus all costs', formula: 'SUM(revenue) - SUM(total_cost)', requiredColumns: ['revenue', 'total_cost'], columnAliases: { total_cost: ['expenses', 'costs'] }, category: 'profitability', priority: 9 },
    { id: 'ec-010', name: 'Product Sales Volume', domain: 'ECOMMERCE', description: 'Units sold', formula: 'SUM(quantity)', requiredColumns: ['quantity'], columnAliases: { quantity: ['qty', 'units', 'items_sold'] }, category: 'volume', priority: 10 },
    { id: 'ec-011', name: 'Return Rate', domain: 'ECOMMERCE', description: 'Returns vs orders', formula: 'COUNT(return_id) / COUNT(order_id)', requiredColumns: ['return_id', 'order_id'], columnAliases: { return_id: ['refund_id'] }, category: 'operations', priority: 11 },
    { id: 'ec-012', name: 'Refund Amount', domain: 'ECOMMERCE', description: 'Total refunds issued', formula: 'SUM(refund_amount)', requiredColumns: ['refund_amount'], columnAliases: { refund_amount: ['return_value'] }, category: 'revenue', priority: 12 },
    { id: 'ec-013', name: 'Discount Impact', domain: 'ECOMMERCE', description: 'Total discounts applied', formula: 'SUM(discount_amount)', requiredColumns: ['discount_amount'], columnAliases: { discount_amount: ['promo_value', 'coupon_value'] }, category: 'revenue', priority: 13 },
    { id: 'ec-014', name: 'Revenue by Category', domain: 'ECOMMERCE', description: 'Revenue per product category', formula: 'SUM(revenue) GROUP BY category', requiredColumns: ['revenue', 'category'], columnAliases: { category: ['product_category', 'dept'] }, category: 'revenue', priority: 14 },
    { id: 'ec-015', name: 'Revenue by Channel', domain: 'ECOMMERCE', description: 'Revenue per sales channel', formula: 'SUM(revenue) GROUP BY channel', requiredColumns: ['revenue', 'channel'], columnAliases: { channel: ['source', 'platform'] }, category: 'revenue', priority: 15 },
    { id: 'ec-016', name: 'New vs Returning Customers', domain: 'ECOMMERCE', description: 'Customer type breakdown', formula: 'COUNT(DISTINCT customer_id) GROUP BY is_new', requiredColumns: ['customer_id', 'is_new'], columnAliases: { is_new: ['customer_type', 'new_customer'] }, category: 'customer', priority: 16 },
    { id: 'ec-017', name: 'Revenue Growth Rate', domain: 'ECOMMERCE', description: 'Period over period growth', formula: '(current_revenue - prev_revenue) / prev_revenue', requiredColumns: ['revenue', 'date'], columnAliases: { date: ['order_date', 'created_at'] }, category: 'growth', priority: 17 },
    { id: 'ec-018', name: 'Monthly Active Customers', domain: 'ECOMMERCE', description: 'Unique buyers per month', formula: 'COUNT(DISTINCT customer_id) BY month', requiredColumns: ['customer_id', 'date'], columnAliases: {}, category: 'customer', priority: 18 },
    { id: 'ec-019', name: 'Inventory Turnover', domain: 'ECOMMERCE', description: 'Stock rotation rate', formula: 'SUM(cogs) / AVG(inventory_value)', requiredColumns: ['cogs', 'inventory_value'], columnAliases: { inventory_value: ['stock_value'] }, category: 'operations', priority: 19 },
    { id: 'ec-020', name: 'Top Selling Products', domain: 'ECOMMERCE', description: 'Best performers by revenue', formula: 'SUM(revenue) GROUP BY product ORDER BY DESC LIMIT 10', requiredColumns: ['revenue', 'product'], columnAliases: { product: ['product_name', 'sku'] }, category: 'product', priority: 20 },
];

// SAAS KPIs (20)
export const SAAS_KPIS: KPIDefinition[] = [
    { id: 'saas-001', name: 'Monthly Recurring Revenue', domain: 'SAAS', description: 'Total monthly subscription revenue', formula: 'SUM(mrr)', requiredColumns: ['mrr'], columnAliases: { mrr: ['monthly_revenue', 'subscription_fee', 'plan_price'] }, category: 'revenue', priority: 1 },
    { id: 'saas-002', name: 'Annual Recurring Revenue', domain: 'SAAS', description: 'MRR × 12', formula: 'SUM(mrr) * 12', requiredColumns: ['mrr'], columnAliases: { mrr: ['arr', 'annual_revenue'] }, category: 'revenue', priority: 2 },
    { id: 'saas-003', name: 'Churn Rate', domain: 'SAAS', description: 'Lost customers / Total', formula: 'COUNT(churned) / COUNT(customer_id)', requiredColumns: ['churned', 'customer_id'], columnAliases: { churned: ['cancelled', 'lost'] }, category: 'retention', priority: 3 },
    { id: 'saas-004', name: 'Net Revenue Retention', domain: 'SAAS', description: 'Expansion minus churn', formula: '(start_mrr + expansion - churn) / start_mrr', requiredColumns: ['mrr', 'expansion', 'churn'], columnAliases: {}, category: 'retention', priority: 4 },
    { id: 'saas-005', name: 'Gross Revenue Retention', domain: 'SAAS', description: 'Retained revenue only', formula: '(start_mrr - churn) / start_mrr', requiredColumns: ['mrr', 'churn'], columnAliases: {}, category: 'retention', priority: 5 },
    { id: 'saas-006', name: 'Customer Lifetime Value', domain: 'SAAS', description: 'ARPU / Churn Rate', formula: 'AVG(mrr) / churn_rate', requiredColumns: ['mrr', 'churn_rate'], columnAliases: {}, category: 'customer', priority: 6 },
    { id: 'saas-007', name: 'Customer Acquisition Cost', domain: 'SAAS', description: 'S&M spend per new customer', formula: 'SUM(sales_marketing_cost) / COUNT(new_customers)', requiredColumns: ['sales_marketing_cost', 'new_customers'], columnAliases: { sales_marketing_cost: ['cac', 'acquisition_cost'] }, category: 'marketing', priority: 7 },
    { id: 'saas-008', name: 'Active Users', domain: 'SAAS', description: 'Users with recent activity', formula: 'COUNT(DISTINCT user_id) WHERE last_active > threshold', requiredColumns: ['user_id', 'last_active'], columnAliases: { last_active: ['last_login', 'activity_date'] }, category: 'engagement', priority: 8 },
    { id: 'saas-009', name: 'Trial Conversion Rate', domain: 'SAAS', description: 'Trials to paid', formula: 'COUNT(converted) / COUNT(trials)', requiredColumns: ['converted', 'trials'], columnAliases: { trials: ['trial_started'] }, category: 'conversion', priority: 9 },
    { id: 'saas-010', name: 'Feature Usage Rate', domain: 'SAAS', description: 'Feature adoption', formula: 'COUNT(feature_used) / COUNT(users)', requiredColumns: ['feature_used', 'users'], columnAliases: {}, category: 'engagement', priority: 10 },
    { id: 'saas-011', name: 'Expansion Revenue', domain: 'SAAS', description: 'Upgrade/upsell revenue', formula: 'SUM(expansion_mrr)', requiredColumns: ['expansion_mrr'], columnAliases: { expansion_mrr: ['upsell', 'upgrade_revenue'] }, category: 'revenue', priority: 11 },
    { id: 'saas-012', name: 'Contraction Revenue', domain: 'SAAS', description: 'Downgrade revenue loss', formula: 'SUM(contraction_mrr)', requiredColumns: ['contraction_mrr'], columnAliases: { contraction_mrr: ['downgrade'] }, category: 'revenue', priority: 12 },
    { id: 'saas-013', name: 'Average Revenue Per User', domain: 'SAAS', description: 'MRR / Users', formula: 'SUM(mrr) / COUNT(DISTINCT user_id)', requiredColumns: ['mrr', 'user_id'], columnAliases: {}, category: 'revenue', priority: 13 },
    { id: 'saas-014', name: 'Renewal Rate', domain: 'SAAS', description: 'Renewals / Expiring', formula: 'COUNT(renewed) / COUNT(expiring)', requiredColumns: ['renewed', 'expiring'], columnAliases: {}, category: 'retention', priority: 14 },
    { id: 'saas-015', name: 'Billing Success Rate', domain: 'SAAS', description: 'Successful charges', formula: 'COUNT(successful_charge) / COUNT(charge_attempts)', requiredColumns: ['successful_charge', 'charge_attempts'], columnAliases: {}, category: 'operations', priority: 15 },
    { id: 'saas-016', name: 'Failed Payments', domain: 'SAAS', description: 'Failed billing attempts', formula: 'COUNT(failed_payment)', requiredColumns: ['failed_payment'], columnAliases: { failed_payment: ['payment_failed', 'billing_error'] }, category: 'operations', priority: 16 },
    { id: 'saas-017', name: 'Monthly New Signups', domain: 'SAAS', description: 'New registrations', formula: 'COUNT(signup_id) BY month', requiredColumns: ['signup_id', 'signup_date'], columnAliases: { signup_id: ['registration_id'] }, category: 'growth', priority: 17 },
    { id: 'saas-018', name: 'Revenue Growth Rate', domain: 'SAAS', description: 'MRR growth MoM', formula: '(current_mrr - prev_mrr) / prev_mrr', requiredColumns: ['mrr', 'date'], columnAliases: {}, category: 'growth', priority: 18 },
    { id: 'saas-019', name: 'Customer Count', domain: 'SAAS', description: 'Total paying customers', formula: 'COUNT(DISTINCT customer_id) WHERE status=active', requiredColumns: ['customer_id', 'status'], columnAliases: {}, category: 'customer', priority: 19 },
    { id: 'saas-020', name: 'Usage per User', domain: 'SAAS', description: 'Average platform usage', formula: 'SUM(usage_minutes) / COUNT(DISTINCT user_id)', requiredColumns: ['usage_minutes', 'user_id'], columnAliases: { usage_minutes: ['session_time', 'time_spent'] }, category: 'engagement', priority: 20 },
];

// Remaining domains follow same pattern - will add in next file
export const EDTECH_KPIS: KPIDefinition[] = [
    { id: 'ed-001', name: 'Total Enrollments', domain: 'EDTECH', description: 'Total course enrollments', formula: 'COUNT(enrollment_id)', requiredColumns: ['enrollment_id'], columnAliases: { enrollment_id: ['registration_id', 'signup_id'] }, category: 'volume', priority: 1 },
    { id: 'ed-002', name: 'Course Completion Rate', domain: 'EDTECH', description: 'Completed / Enrolled', formula: 'COUNT(completed) / COUNT(enrolled)', requiredColumns: ['completed', 'enrolled'], columnAliases: {}, category: 'engagement', priority: 2 },
    { id: 'ed-003', name: 'Student Engagement Rate', domain: 'EDTECH', description: 'Active learners ratio', formula: 'COUNT(active_students) / COUNT(total_students)', requiredColumns: ['active_students', 'total_students'], columnAliases: {}, category: 'engagement', priority: 3 },
    { id: 'ed-004', name: 'Dropout Rate', domain: 'EDTECH', description: 'Students who left', formula: 'COUNT(dropped) / COUNT(enrolled)', requiredColumns: ['dropped', 'enrolled'], columnAliases: { dropped: ['withdrawn', 'cancelled'] }, category: 'retention', priority: 4 },
    { id: 'ed-005', name: 'Average Grade', domain: 'EDTECH', description: 'Mean student score', formula: 'AVG(grade)', requiredColumns: ['grade'], columnAliases: { grade: ['score', 'marks', 'percentage'] }, category: 'performance', priority: 5 },
    { id: 'ed-006', name: 'Active Learners', domain: 'EDTECH', description: 'Currently active students', formula: 'COUNT(DISTINCT student_id) WHERE last_active > threshold', requiredColumns: ['student_id', 'last_active'], columnAliases: {}, category: 'engagement', priority: 6 },
    { id: 'ed-007', name: 'Revenue per Course', domain: 'EDTECH', description: 'Average course revenue', formula: 'SUM(revenue) / COUNT(DISTINCT course_id)', requiredColumns: ['revenue', 'course_id'], columnAliases: {}, category: 'revenue', priority: 7 },
    { id: 'ed-008', name: 'Certification Rate', domain: 'EDTECH', description: 'Certified / Completed', formula: 'COUNT(certified) / COUNT(completed)', requiredColumns: ['certified', 'completed'], columnAliases: {}, category: 'performance', priority: 8 },
    { id: 'ed-009', name: 'Quiz Pass Rate', domain: 'EDTECH', description: 'Quizzes passed', formula: 'COUNT(passed) / COUNT(attempted)', requiredColumns: ['passed', 'attempted'], columnAliases: {}, category: 'performance', priority: 9 },
    { id: 'ed-010', name: 'Student Retention Rate', domain: 'EDTECH', description: 'Returning students', formula: 'COUNT(returning) / COUNT(previous_enrolled)', requiredColumns: ['returning', 'previous_enrolled'], columnAliases: {}, category: 'retention', priority: 10 },
];

export const RETAIL_KPIS: KPIDefinition[] = [
    { id: 'rt-001', name: 'Total Sales', domain: 'RETAIL', description: 'Sum of all sales', formula: 'SUM(sales)', requiredColumns: ['sales'], columnAliases: { sales: ['revenue', 'amount', 'total'] }, category: 'revenue', priority: 1 },
    { id: 'rt-002', name: 'Sales Growth', domain: 'RETAIL', description: 'Period over period', formula: '(current - previous) / previous', requiredColumns: ['sales', 'date'], columnAliases: {}, category: 'growth', priority: 2 },
    { id: 'rt-003', name: 'Inventory Turnover', domain: 'RETAIL', description: 'Stock rotation', formula: 'SUM(cogs) / AVG(inventory)', requiredColumns: ['cogs', 'inventory'], columnAliases: { inventory: ['stock', 'stock_value'] }, category: 'operations', priority: 3 },
    { id: 'rt-004', name: 'Stock Level', domain: 'RETAIL', description: 'Current inventory', formula: 'SUM(quantity_on_hand)', requiredColumns: ['quantity_on_hand'], columnAliases: { quantity_on_hand: ['stock_qty', 'inventory_qty'] }, category: 'operations', priority: 4 },
    { id: 'rt-005', name: 'Gross Margin', domain: 'RETAIL', description: 'Revenue minus COGS', formula: '(SUM(sales) - SUM(cogs)) / SUM(sales)', requiredColumns: ['sales', 'cogs'], columnAliases: {}, category: 'profitability', priority: 5 },
    { id: 'rt-006', name: 'Average Basket Size', domain: 'RETAIL', description: 'Items per transaction', formula: 'SUM(items) / COUNT(transaction_id)', requiredColumns: ['items', 'transaction_id'], columnAliases: { items: ['quantity'] }, category: 'volume', priority: 6 },
    { id: 'rt-007', name: 'Sales per Store', domain: 'RETAIL', description: 'Revenue by location', formula: 'SUM(sales) GROUP BY store_id', requiredColumns: ['sales', 'store_id'], columnAliases: { store_id: ['outlet', 'location'] }, category: 'revenue', priority: 7 },
    { id: 'rt-008', name: 'Footfall Conversion', domain: 'RETAIL', description: 'Buyers / Visitors', formula: 'COUNT(transaction_id) / COUNT(visitors)', requiredColumns: ['transaction_id', 'visitors'], columnAliases: { visitors: ['footfall'] }, category: 'conversion', priority: 8 },
    { id: 'rt-009', name: 'Shrinkage Rate', domain: 'RETAIL', description: 'Inventory loss', formula: 'SUM(shrinkage) / SUM(inventory)', requiredColumns: ['shrinkage', 'inventory'], columnAliases: { shrinkage: ['loss', 'theft'] }, category: 'operations', priority: 9 },
    { id: 'rt-010', name: 'Sell-through Rate', domain: 'RETAIL', description: 'Sold vs received', formula: 'SUM(sold) / SUM(received)', requiredColumns: ['sold', 'received'], columnAliases: {}, category: 'operations', priority: 10 },
];

export const SERVICES_KPIS: KPIDefinition[] = [
    { id: 'sv-001', name: 'Total Revenue', domain: 'SERVICES', description: 'Sum of billings', formula: 'SUM(revenue)', requiredColumns: ['revenue'], columnAliases: { revenue: ['billing', 'invoice_amount'] }, category: 'revenue', priority: 1 },
    { id: 'sv-002', name: 'Billable Utilization Rate', domain: 'SERVICES', description: 'Billable / Total hours', formula: 'SUM(billable_hours) / SUM(total_hours)', requiredColumns: ['billable_hours', 'total_hours'], columnAliases: {}, category: 'efficiency', priority: 2 },
    { id: 'sv-003', name: 'Average Billing Rate', domain: 'SERVICES', description: 'Revenue per hour', formula: 'SUM(revenue) / SUM(billable_hours)', requiredColumns: ['revenue', 'billable_hours'], columnAliases: {}, category: 'revenue', priority: 3 },
    { id: 'sv-004', name: 'Project Profitability', domain: 'SERVICES', description: 'Revenue minus cost', formula: 'SUM(revenue) - SUM(project_cost)', requiredColumns: ['revenue', 'project_cost'], columnAliases: {}, category: 'profitability', priority: 4 },
    { id: 'sv-005', name: 'Client Retention Rate', domain: 'SERVICES', description: 'Returning clients', formula: 'COUNT(returning_clients) / COUNT(total_clients)', requiredColumns: ['returning_clients', 'total_clients'], columnAliases: {}, category: 'retention', priority: 5 },
    { id: 'sv-006', name: 'Revenue per Client', domain: 'SERVICES', description: 'Avg client value', formula: 'SUM(revenue) / COUNT(DISTINCT client_id)', requiredColumns: ['revenue', 'client_id'], columnAliases: {}, category: 'revenue', priority: 6 },
    { id: 'sv-007', name: 'Active Projects', domain: 'SERVICES', description: 'Ongoing work', formula: 'COUNT(project_id) WHERE status=active', requiredColumns: ['project_id', 'status'], columnAliases: {}, category: 'volume', priority: 7 },
    { id: 'sv-008', name: 'Overdue Invoices', domain: 'SERVICES', description: 'Late payments', formula: 'COUNT(invoice_id) WHERE due_date < today AND paid=false', requiredColumns: ['invoice_id', 'due_date', 'paid'], columnAliases: {}, category: 'operations', priority: 8 },
    { id: 'sv-009', name: 'Employee Utilization', domain: 'SERVICES', description: 'Staff productivity', formula: 'SUM(hours_worked) / SUM(available_hours)', requiredColumns: ['hours_worked', 'available_hours'], columnAliases: {}, category: 'efficiency', priority: 9 },
    { id: 'sv-010', name: 'Delivery Timeliness', domain: 'SERVICES', description: 'On-time deliveries', formula: 'COUNT(on_time) / COUNT(total_deliveries)', requiredColumns: ['on_time', 'total_deliveries'], columnAliases: {}, category: 'performance', priority: 10 },
];

export const MANUFACTURING_KPIS: KPIDefinition[] = [
    { id: 'mf-001', name: 'Production Output', domain: 'MANUFACTURING', description: 'Units produced', formula: 'SUM(units_produced)', requiredColumns: ['units_produced'], columnAliases: { units_produced: ['output', 'production_qty'] }, category: 'volume', priority: 1 },
    { id: 'mf-002', name: 'Yield Rate', domain: 'MANUFACTURING', description: 'Good units ratio', formula: 'SUM(good_units) / SUM(total_units)', requiredColumns: ['good_units', 'total_units'], columnAliases: {}, category: 'quality', priority: 2 },
    { id: 'mf-003', name: 'Defect Rate', domain: 'MANUFACTURING', description: 'Defective ratio', formula: 'SUM(defects) / SUM(total_units)', requiredColumns: ['defects', 'total_units'], columnAliases: { defects: ['rejects', 'failures'] }, category: 'quality', priority: 3 },
    { id: 'mf-004', name: 'Overall Equipment Effectiveness', domain: 'MANUFACTURING', description: 'OEE metric', formula: 'availability * performance * quality', requiredColumns: ['availability', 'performance', 'quality'], columnAliases: {}, category: 'efficiency', priority: 4 },
    { id: 'mf-005', name: 'Downtime', domain: 'MANUFACTURING', description: 'Non-productive time', formula: 'SUM(downtime_hours)', requiredColumns: ['downtime_hours'], columnAliases: { downtime_hours: ['machine_stop', 'idle_time'] }, category: 'operations', priority: 5 },
    { id: 'mf-006', name: 'Cost per Unit', domain: 'MANUFACTURING', description: 'Production cost', formula: 'SUM(total_cost) / SUM(units_produced)', requiredColumns: ['total_cost', 'units_produced'], columnAliases: {}, category: 'cost', priority: 6 },
    { id: 'mf-007', name: 'Machine Utilization', domain: 'MANUFACTURING', description: 'Running vs available', formula: 'SUM(running_time) / SUM(available_time)', requiredColumns: ['running_time', 'available_time'], columnAliases: {}, category: 'efficiency', priority: 7 },
    { id: 'mf-008', name: 'Throughput', domain: 'MANUFACTURING', description: 'Output rate', formula: 'SUM(units_produced) / time_period', requiredColumns: ['units_produced', 'time_period'], columnAliases: {}, category: 'volume', priority: 8 },
    { id: 'mf-009', name: 'Scrap Rate', domain: 'MANUFACTURING', description: 'Wasted material', formula: 'SUM(scrap) / SUM(material_used)', requiredColumns: ['scrap', 'material_used'], columnAliases: { scrap: ['waste'] }, category: 'quality', priority: 9 },
    { id: 'mf-010', name: 'Lead Time', domain: 'MANUFACTURING', description: 'Order to delivery', formula: 'AVG(delivery_date - order_date)', requiredColumns: ['delivery_date', 'order_date'], columnAliases: {}, category: 'operations', priority: 10 },
];

export const HEALTHCARE_KPIS: KPIDefinition[] = [
    { id: 'hc-001', name: 'Patient Count', domain: 'HEALTHCARE', description: 'Total patients', formula: 'COUNT(DISTINCT patient_id)', requiredColumns: ['patient_id'], columnAliases: { patient_id: ['member_id', 'beneficiary_id'] }, category: 'volume', priority: 1 },
    { id: 'hc-002', name: 'Appointment No-show Rate', domain: 'HEALTHCARE', description: 'Missed appointments', formula: 'COUNT(no_show) / COUNT(appointment_id)', requiredColumns: ['no_show', 'appointment_id'], columnAliases: {}, category: 'operations', priority: 2 },
    { id: 'hc-003', name: 'Bed Occupancy Rate', domain: 'HEALTHCARE', description: 'Beds in use', formula: 'SUM(occupied_beds) / SUM(total_beds)', requiredColumns: ['occupied_beds', 'total_beds'], columnAliases: {}, category: 'capacity', priority: 3 },
    { id: 'hc-004', name: 'Average Length of Stay', domain: 'HEALTHCARE', description: 'Days per admission', formula: 'AVG(discharge_date - admission_date)', requiredColumns: ['discharge_date', 'admission_date'], columnAliases: {}, category: 'operations', priority: 4 },
    { id: 'hc-005', name: 'Readmission Rate', domain: 'HEALTHCARE', description: 'Return admissions', formula: 'COUNT(readmission) / COUNT(discharge)', requiredColumns: ['readmission', 'discharge'], columnAliases: {}, category: 'quality', priority: 5 },
    { id: 'hc-006', name: 'Revenue per Patient', domain: 'HEALTHCARE', description: 'Avg patient value', formula: 'SUM(revenue) / COUNT(DISTINCT patient_id)', requiredColumns: ['revenue', 'patient_id'], columnAliases: {}, category: 'revenue', priority: 6 },
    { id: 'hc-007', name: 'Claim Approval Rate', domain: 'HEALTHCARE', description: 'Approved claims', formula: 'COUNT(approved) / COUNT(submitted)', requiredColumns: ['approved', 'submitted'], columnAliases: {}, category: 'operations', priority: 7 },
    { id: 'hc-008', name: 'Doctor Utilization', domain: 'HEALTHCARE', description: 'Physician productivity', formula: 'SUM(patient_hours) / SUM(available_hours)', requiredColumns: ['patient_hours', 'available_hours'], columnAliases: {}, category: 'efficiency', priority: 8 },
    { id: 'hc-009', name: 'Treatment Success Rate', domain: 'HEALTHCARE', description: 'Positive outcomes', formula: 'COUNT(successful) / COUNT(treated)', requiredColumns: ['successful', 'treated'], columnAliases: {}, category: 'quality', priority: 9 },
    { id: 'hc-010', name: 'Cost per Treatment', domain: 'HEALTHCARE', description: 'Treatment economics', formula: 'SUM(cost) / COUNT(treatment_id)', requiredColumns: ['cost', 'treatment_id'], columnAliases: {}, category: 'cost', priority: 10 },
];

export const FINANCE_KPIS: KPIDefinition[] = [
    { id: 'fn-001', name: 'Total Transactions', domain: 'FINANCE', description: 'Transaction count', formula: 'COUNT(transaction_id)', requiredColumns: ['transaction_id'], columnAliases: { transaction_id: ['txn_id', 'payment_id'] }, category: 'volume', priority: 1 },
    { id: 'fn-002', name: 'Net Profit', domain: 'FINANCE', description: 'Revenue minus expenses', formula: 'SUM(revenue) - SUM(expenses)', requiredColumns: ['revenue', 'expenses'], columnAliases: {}, category: 'profitability', priority: 2 },
    { id: 'fn-003', name: 'Cash Flow', domain: 'FINANCE', description: 'Net cash movement', formula: 'SUM(inflow) - SUM(outflow)', requiredColumns: ['inflow', 'outflow'], columnAliases: { inflow: ['receipts'], outflow: ['payments'] }, category: 'liquidity', priority: 3 },
    { id: 'fn-004', name: 'Loan Default Rate', domain: 'FINANCE', description: 'Defaulted loans', formula: 'COUNT(defaulted) / COUNT(loans)', requiredColumns: ['defaulted', 'loans'], columnAliases: {}, category: 'risk', priority: 4 },
    { id: 'fn-005', name: 'Return on Assets', domain: 'FINANCE', description: 'ROA metric', formula: 'SUM(net_income) / AVG(total_assets)', requiredColumns: ['net_income', 'total_assets'], columnAliases: {}, category: 'performance', priority: 5 },
    { id: 'fn-006', name: 'Return on Equity', domain: 'FINANCE', description: 'ROE metric', formula: 'SUM(net_income) / AVG(equity)', requiredColumns: ['net_income', 'equity'], columnAliases: { equity: ['shareholders_equity'] }, category: 'performance', priority: 6 },
    { id: 'fn-007', name: 'Non-performing Assets', domain: 'FINANCE', description: 'NPA ratio', formula: 'SUM(npa) / SUM(total_loans)', requiredColumns: ['npa', 'total_loans'], columnAliases: { npa: ['bad_debt'] }, category: 'risk', priority: 7 },
    { id: 'fn-008', name: 'Liquidity Ratio', domain: 'FINANCE', description: 'Current ratio', formula: 'SUM(current_assets) / SUM(current_liabilities)', requiredColumns: ['current_assets', 'current_liabilities'], columnAliases: {}, category: 'liquidity', priority: 8 },
    { id: 'fn-009', name: 'Interest Income', domain: 'FINANCE', description: 'Interest earned', formula: 'SUM(interest_income)', requiredColumns: ['interest_income'], columnAliases: { interest_income: ['interest_earned'] }, category: 'revenue', priority: 9 },
    { id: 'fn-010', name: 'Fraud Rate', domain: 'FINANCE', description: 'Fraudulent transactions', formula: 'COUNT(fraud) / COUNT(transaction_id)', requiredColumns: ['fraud', 'transaction_id'], columnAliases: { fraud: ['suspicious', 'flagged'] }, category: 'risk', priority: 10 },
];

// Master library by domain
export const KPI_LIBRARY: Record<DomainType, KPIDefinition[]> = {
    ECOMMERCE: ECOMMERCE_KPIS,
    SAAS: SAAS_KPIS,
    EDTECH: EDTECH_KPIS,
    RETAIL: RETAIL_KPIS,
    SERVICES: SERVICES_KPIS,
    MANUFACTURING: MANUFACTURING_KPIS,
    HEALTHCARE: HEALTHCARE_KPIS,
    FINANCE: FINANCE_KPIS,
};

export function getKPIsForDomain(domain: DomainType): KPIDefinition[] {
    return KPI_LIBRARY[domain] || [];
}

export function getAllKPIs(): KPIDefinition[] {
    return Object.values(KPI_LIBRARY).flat();
}
