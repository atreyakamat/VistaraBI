import fs from 'fs';
import path from 'path';

const RECORD_COUNT = 10000;
const BASE_DIR = path.join(process.cwd(), 'dummy-data/ultimate');

if (!fs.existsSync(BASE_DIR)) fs.mkdirSync(BASE_DIR, { recursive: true });

function getRandomItem(arr: any[]) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomDate(start: Date, end: Date) {
    const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    const dice = Math.random();
    if (dice < 0.05) return d.getTime().toString(); // Epoch representation
    if (dice < 0.1) return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`; // MM/DD/YYYY representation
    return d.toISOString().split('T')[0]; // Standard ISO
}

function injectDirty(val: any, prob = 0.04) {
    if (Math.random() > prob) return val;
    const dice = Math.random();
    if (dice < 0.3) return ''; // Null representation
    if (dice < 0.5) return 'NULL';
    if (typeof val === 'string' && val.length > 0) return `  ${val.toLowerCase()}  `; // Whitespace padding
    return val;
}

// ─── 1. E-COMMERCE GENERATOR ───────────────────────────────────────────────
function generateEcommerce(fileIndex: number) {
    const columns = [
        'order_id', 'customer_id', 'session_id', 'cart_id', 'order_date',
        'revenue', 'cogs', 'marketing_cost', 'category', 'quantity',
        'status', 'channel', 'region', 'product_id', 'sku',
        'unit_price', 'shipping_cost', 'tax', 'customer_type', 'payment_method'
    ];
    const rows = [columns.join(',')];
    const categories = ['Electronics', 'Home', 'Fashion', 'Beauty', 'Sports'];
    const statuses = ['Completed', 'Pending', 'Shipped', 'Cancelled', 'Returned'];
    const channels = ['Web', 'Mobile App', 'Affiliate', 'Social Media'];
    const regions = ['North', 'South', 'East', 'West', 'International'];

    for (let i = 1; i <= RECORD_COUNT; i++) {
        const id = fileIndex * 10000 + i;
        const rev = Math.random() * 500 + 10;
        const qty = Math.floor(Math.random() * 5) + 1;
        const cost = rev * (0.3 + Math.random() * 0.3);
        
        const row = [
            `ORD-${id}`,
            `CUST-${Math.floor(id / 2.5) + 1}`,
            `SESS-${id + 5000}`,
            `CART-${id + 2000}`,
            getRandomDate(new Date(2023, 0, 1), new Date()),
            injectDirty(rev.toFixed(2)),
            cost.toFixed(2),
            (Math.random() * 50).toFixed(2),
            injectDirty(getRandomItem(categories)),
            injectDirty(qty),
            getRandomItem(statuses),
            getRandomItem(channels),
            getRandomItem(regions),
            `P-${Math.floor(Math.random() * 1000) + 1}`,
            `SKU-${Math.floor(Math.random() * 5000) + 1}`,
            (rev / qty).toFixed(2),
            (Math.random() * 20).toFixed(2),
            (rev * 0.08).toFixed(2),
            getRandomItem(['New', 'Returning', 'VIP']),
            getRandomItem(['Credit Card', 'PayPal', 'Crypto', 'Debit Card'])
        ];
        rows.push(row.map(v => v === null ? '' : String(v).replace(/,/g, '')).join(','));
    }
    fs.writeFileSync(path.join(BASE_DIR, `ecommerce_part_${fileIndex}.csv`), rows.join('\n'));
}

// ─── 2. RETAIL GENERATOR ───────────────────────────────────────────────────
function generateRetail(fileIndex: number) {
    const columns = [
        'transaction_id', 'store_id', 'product_id', 'timestamp', 'sales_value',
        'cogs', 'inventory_level', 'quantity_sold', 'received_units', 'items_in_basket',
        'shrinkage', 'visitor_count', 'department', 'store_location', 'brand',
        'stock_status', 'loyalty_id', 'payment_type', 'weather_context', 'is_weekend'
    ];
    const rows = [columns.join(',')];
    const departments = ['Grocery', 'Produce', 'Dairy', 'Bakery', 'Meat', 'Deli'];
    const locations = ['New York', 'London', 'Tokyo', 'Paris', 'Berlin'];
    const brands = ['Private Label', 'National Brand', 'Premium Brand'];

    for (let i = 1; i <= RECORD_COUNT; i++) {
        const id = fileIndex * 10000 + i;
        const sales = Math.random() * 150 + 2;
        const qty = Math.floor(Math.random() * 10) + 1;
        const cost = sales * (0.5 + Math.random() * 0.2);
        
        const row = [
            `TXN-${id}`,
            `STORE-${(id % 15) + 1}`,
            `P-${Math.floor(Math.random() * 500) + 1}`,
            getRandomDate(new Date(2024, 0, 1), new Date()),
            injectDirty(sales.toFixed(2)),
            cost.toFixed(2),
            Math.floor(Math.random() * 1000),
            injectDirty(qty),
            (qty + Math.floor(Math.random() * 5)).toString(),
            Math.floor(Math.random() * 15) + 1,
            (Math.random() < 0.05 ? Math.random() * 10 : 0).toFixed(2),
            Math.floor(Math.random() * 50) + 10,
            injectDirty(getRandomItem(departments)),
            getRandomItem(locations),
            getRandomItem(brands),
            getRandomItem(['In Stock', 'Low Stock', 'Out of Stock']),
            Math.random() < 0.4 ? `L-${1000 + id}` : '',
            getRandomItem(['Cash', 'Card', 'Mobile Pay']),
            getRandomItem(['Sunny', 'Rainy', 'Cloudy', 'Snowy']),
            Math.random() < 0.3 ? 'TRUE' : 'FALSE'
        ];
        rows.push(row.map(v => v === null ? '' : String(v).replace(/,/g, '')).join(','));
    }
    fs.writeFileSync(path.join(BASE_DIR, `retail_part_${fileIndex}.csv`), rows.join('\n'));
}

// ─── 3. SAAS GENERATOR ─────────────────────────────────────────────────────
function generateSaas(fileIndex: number) {
    const columns = [
        'subscription_id', 'user_id', 'mrr', 'expansion_mrr', 'contraction_mrr',
        'churned', 'plan', 'signup_date', 'last_login', 'successful_charge',
        'charge_attempts', 'failed_payment', 'usage_minutes', 'feature_used',
        'feedback_score', 'session_count', 'renewal_date', 'support_tickets_count',
        'user_role', 'acq_channel'
    ];
    const rows = [columns.join(',')];
    const plans = ['Free', 'Starter', 'Growth', 'Enterprise'];
    const channels = ['Organic Search', 'Google Ads', 'Affiliate', 'Cold Outbound'];

    for (let i = 1; i <= RECORD_COUNT; i++) {
        const id = fileIndex * 10000 + i;
        const plan = getRandomItem(plans);
        let mrr = 0;
        if (plan === 'Starter') mrr = 29;
        else if (plan === 'Growth') mrr = 99;
        else if (plan === 'Enterprise') mrr = 499;

        const isChurned = Math.random() < 0.04 ? 'TRUE' : 'FALSE';
        const failPay = Math.random() < 0.03 ? 'TRUE' : 'FALSE';

        const row = [
            `SUB-${id}`,
            `USER-${id + 3000}`,
            injectDirty(mrr),
            (Math.random() < 0.1 ? mrr * 0.2 : 0).toFixed(2),
            (Math.random() < 0.05 ? mrr * 0.1 : 0).toFixed(2),
            isChurned,
            plan,
            getRandomDate(new Date(2023, 0, 1), new Date()),
            getRandomDate(new Date(2024, 4, 1), new Date()),
            failPay === 'TRUE' ? 'FALSE' : 'TRUE',
            failPay === 'TRUE' ? '2' : '1',
            failPay,
            Math.floor(Math.random() * 2000),
            getRandomItem(['API_Call', 'Dashboard_View', 'PDF_Export', 'CSV_Upload']),
            Math.floor(Math.random() * 5) + 1,
            Math.floor(Math.random() * 45) + 1,
            getRandomDate(new Date(2024, 6, 1), new Date(2025, 6, 1)),
            (Math.random() < 0.2 ? Math.floor(Math.random() * 4) + 1 : 0).toString(),
            getRandomItem(['Owner', 'Developer', 'Analyst']),
            getRandomItem(channels)
        ];
        rows.push(row.map(v => v === null ? '' : String(v).replace(/,/g, '')).join(','));
    }
    fs.writeFileSync(path.join(BASE_DIR, `saas_part_${fileIndex}.csv`), rows.join('\n'));
}

// ─── 4. EDTECH GENERATOR ───────────────────────────────────────────────────
function generateEdTech(fileIndex: number) {
    const columns = [
        'enrollment_id', 'student_id', 'course_id', 'completed', 'enrolled',
        'grade', 'certified', 'passed', 'attempted', 'last_active',
        'minutes', 'date', 'revenue', 'category', 'lessons_watched',
        'quiz_score', 'engagement_score', 'course_rating', 'instructor_id', 'payment_status'
    ];
    const rows = [columns.join(',')];
    const categories = ['Programming', 'Design', 'Marketing', 'Business', 'Languages'];

    for (let i = 1; i <= RECORD_COUNT; i++) {
        const id = fileIndex * 10000 + i;
        const score = Math.floor(Math.random() * 41) + 60; // 60-100
        const isPassed = score >= 70 ? 'TRUE' : 'FALSE';

        const row = [
            `ENR-${id}`,
            `STU-${id + 1000}`,
            `CRS-${Math.floor(Math.random() * 100) + 1}`,
            Math.random() < 0.65 ? 'TRUE' : 'FALSE',
            'TRUE',
            score.toString(),
            Math.random() < 0.5 ? 'TRUE' : 'FALSE',
            isPassed,
            'TRUE',
            getRandomDate(new Date(2024, 0, 1), new Date()),
            Math.floor(Math.random() * 500) + 10,
            getRandomDate(new Date(2023, 0, 1), new Date()),
            injectDirty((Math.random() * 120 + 9).toFixed(2)),
            getRandomItem(categories),
            Math.floor(Math.random() * 25) + 1,
            score.toString(),
            (Math.random() * 100).toFixed(1),
            (Math.random() * 2 + 3).toFixed(1),
            `INST-${(id % 12) + 1}`,
            getRandomItem(['Paid', 'Refunded', 'Scholarship'])
        ];
        rows.push(row.map(v => v === null ? '' : String(v).replace(/,/g, '')).join(','));
    }
    fs.writeFileSync(path.join(BASE_DIR, `edtech_part_${fileIndex}.csv`), rows.join('\n'));
}

// ─── 5. SERVICES GENERATOR ─────────────────────────────────────────────────
function generateServices(fileIndex: number) {
    const columns = [
        'engagement_id', 'client_id', 'hours_billed', 'billable_rate', 'revenue',
        'cogs', 'satisfaction_score', 'project_id', 'employee_id', 'status',
        'service_type', 'date', 'overtime_hours', 'margin_percent', 'invoice_status',
        'lead_source', 'retention_flag', 'escalations_count', 'milestones_completed', 'region'
    ];
    const rows = [columns.join(',')];
    const services = ['Consulting', 'Software Development', 'Marketing Retainer', 'Staff Augment'];

    for (let i = 1; i <= RECORD_COUNT; i++) {
        const id = fileIndex * 10000 + i;
        const hours = Math.random() * 120 + 5;
        const rate = getRandomItem([85, 125, 150, 220]);
        const rev = hours * rate;
        const cost = rev * (0.4 + Math.random() * 0.2);

        const row = [
            `ENG-${id}`,
            `CLI-${id + 100}`,
            hours.toFixed(1),
            rate.toString(),
            injectDirty(rev.toFixed(2)),
            cost.toFixed(2),
            (Math.floor(Math.random() * 5) + 1).toString(),
            `PRJ-${id + 400}`,
            `EMP-${Math.floor(id / 10) + 1}`,
            getRandomItem(['Active', 'Completed', 'Paused', 'Cancelled']),
            getRandomItem(services),
            getRandomDate(new Date(2023, 0, 1), new Date()),
            (Math.random() < 0.15 ? Math.random() * 15 : 0).toFixed(1),
            ((rev - cost) / rev * 100).toFixed(2),
            getRandomItem(['Paid', 'Invoiced', 'Unbilled', 'Written Off']),
            getRandomItem(['Referral', 'Inbound', 'Outbound Sales', 'Partner']),
            Math.random() < 0.05 ? 'FALSE' : 'TRUE',
            (Math.random() < 0.08 ? 1 : 0).toString(),
            (Math.floor(Math.random() * 5) + 1).toString(),
            getRandomItem(['North America', 'EMEA', 'APAC', 'LATAM'])
        ];
        rows.push(row.map(v => v === null ? '' : String(v).replace(/,/g, '')).join(','));
    }
    fs.writeFileSync(path.join(BASE_DIR, `services_part_${fileIndex}.csv`), rows.join('\n'));
}

// ─── 6. MANUFACTURING GENERATOR ────────────────────────────────────────────
function generateManufacturing(fileIndex: number) {
    const columns = [
        'production_id', 'batch_id', 'timestamp', 'units_produced', 'units_defective',
        'downtime_minutes', 'operating_cost', 'efficiency_score', 'raw_material_used_kg', 'energy_consumption_kwh',
        'operator_id', 'shift', 'machine_id', 'maintenance_flag', 'quality_grade',
        'temperature_c', 'vibration_mm_s', 'pressure_bar', 'cycle_time_seconds', 'scrap_rate'
    ];
    const rows = [columns.join(',')];

    for (let i = 1; i <= RECORD_COUNT; i++) {
        const id = fileIndex * 10000 + i;
        const produced = Math.floor(Math.random() * 800) + 200;
        const def = Math.random() < 0.08 ? Math.floor(produced * (0.02 + Math.random() * 0.06)) : 0;
        const cost = produced * (1.2 + Math.random() * 0.6);

        const row = [
            `PRD-${id}`,
            `BAT-${id + 900}`,
            getRandomDate(new Date(2024, 0, 1), new Date()),
            produced.toString(),
            injectDirty(def),
            (Math.random() < 0.12 ? Math.random() * 90 : 0).toFixed(1),
            cost.toFixed(2),
            (80 + Math.random() * 20).toFixed(1),
            (produced * 0.85).toFixed(1),
            (produced * 1.5).toFixed(1),
            `OPR-${(id % 20) + 1}`,
            getRandomItem(['Day', 'Swing', 'Night']),
            `MAC-${(id % 8) + 1}`,
            Math.random() < 0.05 ? 'TRUE' : 'FALSE',
            getRandomItem(['Grade A', 'Grade B', 'Reject']),
            (20 + Math.random() * 15).toFixed(1),
            (1.2 + Math.random() * 3.5).toFixed(2),
            (5.0 + Math.random() * 3.0).toFixed(2),
            (12 + Math.random() * 8).toFixed(1),
            (def / produced * 100).toFixed(2)
        ];
        rows.push(row.map(v => v === null ? '' : String(v).replace(/,/g, '')).join(','));
    }
    fs.writeFileSync(path.join(BASE_DIR, `manufacturing_part_${fileIndex}.csv`), rows.join('\n'));
}

// ─── 7. HEALTHCARE GENERATOR ───────────────────────────────────────────────
function generateHealthcare(fileIndex: number) {
    const columns = [
        'appointment_id', 'patient_id', 'doctor_id', 'timestamp', 'status',
        'revenue', 'cogs', 'admitted', 'readmitted', 'no_show',
        'duration_minutes', 'waiting_time_minutes', 'satisfaction_score', 'prescription_count', 'diagnosis_code',
        'department', 'insurance_provider', 'copay_amount', 'referral_source', 'follow_up_required'
    ];
    const rows = [columns.join(',')];
    const depts = ['Cardiology', 'Pediatrics', 'Orthopedics', 'General Medicine', 'Neurology'];
    const providers = ['Blue Shield', 'Aetna', 'UnitedHealth', 'Cigna', 'Medicare'];

    for (let i = 1; i <= RECORD_COUNT; i++) {
        const id = fileIndex * 10000 + i;
        const copay = getRandomItem([15, 25, 40, 50]);
        const rev = copay + (Math.random() * 300);
        const cost = rev * 0.35;
        const noShow = Math.random() < 0.08 ? 'TRUE' : 'FALSE';

        const row = [
            `APT-${id}`,
            `PAT-${id + 1000}`,
            `DOC-${(id % 15) + 1}`,
            getRandomDate(new Date(2024, 0, 1), new Date()),
            noShow === 'TRUE' ? 'No-Show' : 'Completed',
            injectDirty(rev.toFixed(2)),
            cost.toFixed(2),
            Math.random() < 0.05 ? 'TRUE' : 'FALSE',
            Math.random() < 0.01 ? 'TRUE' : 'FALSE',
            noShow,
            noShow === 'TRUE' ? '0' : (Math.floor(Math.random() * 45) + 15).toString(),
            noShow === 'TRUE' ? '0' : (Math.floor(Math.random() * 60)).toString(),
            (Math.floor(Math.random() * 5) + 1).toString(),
            (Math.random() < 0.7 ? Math.floor(Math.random() * 3) + 1 : 0).toString(),
            `ICD-${Math.floor(Math.random() * 500) + 100}`,
            getRandomItem(depts),
            getRandomItem(providers),
            copay.toString(),
            getRandomItem(['Walk-in', 'Doctor Referral', 'Emergency', 'Web Portal']),
            Math.random() < 0.3 ? 'TRUE' : 'FALSE'
        ];
        rows.push(row.map(v => v === null ? '' : String(v).replace(/,/g, '')).join(','));
    }
    fs.writeFileSync(path.join(BASE_DIR, `healthcare_part_${fileIndex}.csv`), rows.join('\n'));
}

// ─── 8. FINANCE GENERATOR ──────────────────────────────────────────────────
function generateFinance(fileIndex: number) {
    const columns = [
        'transaction_id', 'portfolio_id', 'customer_id', 'amount', 'date',
        'type', 'fee', 'loan_id', 'risk_score', 'interest_rate',
        'status', 'defaulted', 'payment_status', 'category', 'balance',
        'asset_value', 'yield_percent', 'channel', 'currency', 'compliance_grade'
    ];
    const rows = [columns.join(',')];
    const types = ['Deposit', 'Withdrawal', 'Trade', 'Loan Repayment', 'Dividend'];
    const categories = ['Mutual Fund', 'Stock Purchase', 'Savings', 'Real Estate', 'Crypto'];

    for (let i = 1; i <= RECORD_COUNT; i++) {
        const id = fileIndex * 10000 + i;
        const amount = Math.random() * 2000 + 5;
        const fee = amount * 0.015;

        const row = [
            `TXN-${id}`,
            `PORT-${(id % 25) + 1}`,
            `CUST-${Math.floor(id / 3) + 1}`,
            injectDirty(amount.toFixed(2)),
            getRandomDate(new Date(2023, 0, 1), new Date()),
            getRandomItem(types),
            fee.toFixed(2),
            `LN-${id + 8000}`,
            (Math.random() * 100).toFixed(1),
            (3.5 + Math.random() * 12.0).toFixed(2),
            getRandomItem(['Completed', 'Settling', 'Failed']),
            Math.random() < 0.02 ? 'TRUE' : 'FALSE',
            getRandomItem(['Paid', 'Unpaid', 'Late']),
            getRandomItem(categories),
            (amount + Math.random() * 5000).toFixed(2),
            (amount * 5).toFixed(2),
            (2.5 + Math.random() * 8.5).toFixed(2),
            getRandomItem(['Mobile App', 'Web Portal', 'ATM', 'Branch Office']),
            getRandomItem(['USD', 'EUR', 'GBP', 'CAD']),
            getRandomItem(['Grade A', 'Grade B', 'Audit Required'])
        ];
        rows.push(row.map(v => v === null ? '' : String(v).replace(/,/g, '')).join(','));
    }
    fs.writeFileSync(path.join(BASE_DIR, `finance_part_${fileIndex}.csv`), rows.join('\n'));
}

console.log('Generating high-density synthetic datasets for all 8 domains...');
for (let i = 1; i <= 3; i++) {
    generateEcommerce(i);
    generateRetail(i);
    generateSaas(i);
    generateEdTech(i);
    generateServices(i);
    generateManufacturing(i);
    generateHealthcare(i);
    generateFinance(i);
    console.log(`✅ Generated part ${i} for all 8 business domains.`);
}
console.log('🎉 Generation completed successfully.');
