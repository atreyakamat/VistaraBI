// GET /api/templates/[domain] — download a domain-specific CSV template
// Returns a pre-formatted CSV file with realistic sample headers for the requested domain.

import { NextRequest, NextResponse } from 'next/server';

const TEMPLATES: Record<string, { headers: string[]; sample: string[][] }> = {
    retail: {
        headers: ['date', 'store_id', 'product_id', 'product_name', 'category', 'quantity_sold', 'unit_price', 'revenue', 'cost', 'gross_profit', 'customer_id', 'region'],
        sample: [
            ['2024-01-15', 'STR-001', 'PRD-101', 'Wireless Earbuds', 'Electronics', '12', '89.99', '1079.88', '540.00', '539.88', 'CST-4521', 'North'],
            ['2024-01-15', 'STR-002', 'PRD-205', 'Running Shoes', 'Footwear', '5', '129.99', '649.95', '325.00', '324.95', 'CST-7832', 'South'],
            ['2024-01-16', 'STR-001', 'PRD-310', 'Coffee Maker', 'Appliances', '3', '74.99', '224.97', '112.50', '112.47', 'CST-2341', 'North'],
        ],
    },
    saas: {
        headers: ['date', 'customer_id', 'company_name', 'plan', 'mrr', 'arr', 'status', 'churn_date', 'acquisition_channel', 'cac', 'seats', 'nps_score'],
        sample: [
            ['2024-01-01', 'CUS-001', 'Acme Corp', 'Pro', '499', '5988', 'active', '', 'Google Ads', '320', '10', '8'],
            ['2024-01-01', 'CUS-002', 'Beta Ltd', 'Starter', '49', '588', 'active', '', 'Organic', '0', '2', '9'],
            ['2024-01-15', 'CUS-003', 'Gamma Inc', 'Business', '1499', '17988', 'churned', '2024-02-01', 'Referral', '850', '25', '4'],
        ],
    },
    healthcare: {
        headers: ['date', 'patient_id', 'department', 'diagnosis_code', 'procedure_code', 'provider_id', 'visit_type', 'length_of_stay', 'total_charges', 'insurance_paid', 'patient_paid', 'readmission'],
        sample: [
            ['2024-01-10', 'PAT-10021', 'Cardiology', 'I21.9', 'CPT-99213', 'DR-445', 'Outpatient', '0', '450.00', '360.00', '90.00', 'No'],
            ['2024-01-11', 'PAT-10022', 'Orthopedics', 'M79.3', 'CPT-27447', 'DR-221', 'Inpatient', '3', '28500.00', '22800.00', '5700.00', 'No'],
            ['2024-01-12', 'PAT-10023', 'Emergency', 'S06.0', 'CPT-99285', 'DR-118', 'Emergency', '1', '3200.00', '2560.00', '640.00', 'Yes'],
        ],
    },
    finance: {
        headers: ['date', 'account_id', 'transaction_id', 'type', 'category', 'amount', 'balance', 'currency', 'merchant', 'channel', 'status', 'region'],
        sample: [
            ['2024-01-05', 'ACC-8821', 'TXN-001', 'Debit', 'Payroll', '85000.00', '142500.00', 'USD', 'Internal', 'Bank Transfer', 'Completed', 'US-East'],
            ['2024-01-06', 'ACC-8821', 'TXN-002', 'Credit', 'Office Supplies', '1250.50', '141249.50', 'USD', 'Staples', 'Card', 'Completed', 'US-East'],
            ['2024-01-07', 'ACC-4432', 'TXN-003', 'Credit', 'Software Licenses', '4800.00', '98200.00', 'USD', 'Adobe', 'ACH', 'Completed', 'US-West'],
        ],
    },
    manufacturing: {
        headers: ['date', 'plant_id', 'machine_id', 'product_sku', 'units_produced', 'units_defective', 'downtime_hours', 'oee_percent', 'raw_material_cost', 'labor_cost', 'energy_cost', 'shift'],
        sample: [
            ['2024-01-08', 'PLT-A', 'MCH-101', 'SKU-5521', '1200', '12', '0.5', '88.5', '4800.00', '2400.00', '960.00', 'Morning'],
            ['2024-01-08', 'PLT-A', 'MCH-102', 'SKU-5522', '850', '5', '1.2', '82.3', '3400.00', '2400.00', '680.00', 'Morning'],
            ['2024-01-08', 'PLT-B', 'MCH-201', 'SKU-8831', '2100', '21', '0.0', '95.2', '8400.00', '2400.00', '1680.00', 'Night'],
        ],
    },
    ecommerce: {
        headers: ['date', 'order_id', 'customer_id', 'product_id', 'product_name', 'category', 'quantity', 'unit_price', 'discount_pct', 'shipping_cost', 'total_revenue', 'fulfillment_status', 'return_flag'],
        sample: [
            ['2024-01-10', 'ORD-88201', 'CST-4521', 'PRD-221', 'Yoga Mat', 'Sports', '1', '49.99', '10', '4.99', '49.99', 'Delivered', 'No'],
            ['2024-01-10', 'ORD-88202', 'CST-7823', 'PRD-445', 'Desk Lamp', 'Home Office', '2', '34.99', '0', '0.00', '69.98', 'Shipped', 'No'],
            ['2024-01-11', 'ORD-88203', 'CST-1102', 'PRD-881', 'Blender', 'Kitchen', '1', '89.99', '15', '6.99', '83.49', 'Delivered', 'Yes'],
        ],
    },
    edtech: {
        headers: ['date', 'student_id', 'course_id', 'course_name', 'instructor_id', 'enrollment_date', 'completion_date', 'completion_rate', 'quiz_avg_score', 'video_watch_time_hrs', 'certificate_issued', 'revenue'],
        sample: [
            ['2024-01-05', 'STU-10021', 'CRS-441', 'Python for Data Science', 'INS-55', '2024-01-05', '2024-02-10', '100', '87', '24.5', 'Yes', '199.00'],
            ['2024-01-06', 'STU-10022', 'CRS-552', 'UI/UX Design Fundamentals', 'INS-32', '2024-01-06', '', '45', '72', '8.2', 'No', '149.00'],
            ['2024-01-07', 'STU-10023', 'CRS-441', 'Python for Data Science', 'INS-55', '2024-01-07', '', '20', '65', '5.0', 'No', '199.00'],
        ],
    },
    services: {
        headers: ['date', 'client_id', 'project_id', 'service_type', 'consultant_id', 'hours_billed', 'hourly_rate', 'revenue', 'project_status', 'satisfaction_score', 'contract_value', 'region'],
        sample: [
            ['2024-01-08', 'CLT-221', 'PRJ-5501', 'Strategy Consulting', 'CON-12', '40', '250', '10000.00', 'In Progress', '4.8', '120000.00', 'APAC'],
            ['2024-01-09', 'CLT-334', 'PRJ-5502', 'IT Implementation', 'CON-28', '60', '175', '10500.00', 'Completed', '4.5', '65000.00', 'EMEA'],
            ['2024-01-10', 'CLT-112', 'PRJ-5503', 'Market Research', 'CON-07', '25', '200', '5000.00', 'In Progress', '5.0', '30000.00', 'Americas'],
        ],
    },
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    const { domain } = await params;
    const template = TEMPLATES[domain.toLowerCase()];

    if (!template) {
        return NextResponse.json(
            { error: `No template for domain: ${domain}. Available: ${Object.keys(TEMPLATES).join(', ')}` },
            { status: 404 }
        );
    }

    const lines = [
        template.headers.join(','),
        ...template.sample.map(row => row.join(',')),
    ];
    const csv = lines.join('\n');

    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="vistarabi-${domain}-template.csv"`,
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
