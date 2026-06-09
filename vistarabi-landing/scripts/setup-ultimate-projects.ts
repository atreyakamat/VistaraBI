import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { purifyDataset } from '../src/lib/purification';
import { setGovernedDomain } from '../src/lib/domain/governance';
import { discoverKPIs } from '../src/lib/kpi';
import { insertEligibleKPIsIntoBlueprint } from '../src/lib/kpi/blueprint-inserter';
import { KPI_RULE_REGISTRY } from '../src/lib/kpi/kpi-rule-registry';

const db = new PrismaClient();

async function setupProject(id: string, name: string, files: string[], domain: any, semanticMap: any) {
    let user = await db.user.findFirst({ where: { email: 'testbatch@examples.com' } });
    if (!user) {
        user = await db.user.findFirst();
    }
    if (!user) {
        user = await db.user.create({
            data: {
                email: 'testbatch@examples.com',
                name: 'Test Batch User',
                password: 'placeholderpassword',
            }
        });
    }
    const userId = user.id;
    console.log(`\n🚀 Setting up ultimate project: ${name} (${id}) using User ID: ${userId}`);

    // 1. Create Project
    await db.project.upsert({
        where: { id },
        update: { name, userId },
        create: { id, name, userId, description: `Ultimate ${domain} dataset (30k records) for full validation` }
    });

    for (const file of files) {
        const filePath = path.join(process.cwd(), 'dummy-data/ultimate', file);
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            continue;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        const rows = content.trim().split('\n');
        const headers = rows[0].split(',');
        const data = rows.slice(1).map(row => {
            const values = row.split(',');
            const obj: any = {};
            headers.forEach((h, i) => obj[h] = values[i]);
            return obj;
        });

        console.log(`Adding source: ${file} (${data.length} records)`);
        const source = await db.source.findFirst({ where: { projectId: id, fileName: file } });
        let sourceId = '';
        if (source) {
            sourceId = source.id;
            await db.source.update({ where: { id: sourceId }, data: { data, columns: headers, status: 'READY', rowCount: data.length, colCount: headers.length } });
        } else {
            const newSource = await db.source.create({ data: { projectId: id, fileName: file, fileType: 'CSV', status: 'READY', rowCount: data.length, colCount: headers.length, columns: headers, data } });
            sourceId = newSource.id;
        }

        // Cleanup metadata & processing state for fresh run
        await db.columnHealth.deleteMany({ where: { sourceId } });
        await db.outlierRecord.deleteMany({ where: { sourceId } });
        await db.qualityIntelligence.deleteMany({ where: { sourceId } });
        await db.cleaningLog.deleteMany({ where: { sourceId } });
        await db.cleanedDataset.deleteMany({ where: { sourceId } });
        await db.columnMeta.deleteMany({ where: { sourceId } });

        console.log(`Generating ColumnMeta for ${file}...`);
        for (const col of headers) {
            let dataType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' = 'TEXT';
            const c = col.toLowerCase();
            if (
                c.includes('revenue') || c.includes('value') || c.includes('cost') || 
                c.includes('quantity') || c.includes('level') || c.includes('amount') || 
                c.includes('tax') || c.includes('discount') || c.includes('count') || 
                c.includes('units') || c.includes('shrinkage') || c.includes('mrr') || 
                c.includes('grade') || c.includes('score') || c.includes('minutes') || 
                c.includes('lessons') || c.includes('quiz') || c.includes('rating') || 
                c.includes('hours') || c.includes('rate') || c.includes('percent') || 
                c.includes('milestones') || c.includes('produced') || c.includes('defective') || 
                c.includes('downtime') || c.includes('energy') || c.includes('material') || 
                c.includes('temp') || c.includes('vibration') || c.includes('pressure') || 
                c.includes('cycle') || c.includes('waiting') || c.includes('prescriptions') || 
                c.includes('copay') || c.includes('fee') || c.includes('balance') || 
                c.includes('yield') || c.includes('charge_attempts')
            ) dataType = 'NUMBER';

            if (c.includes('date') || c.includes('timestamp') || c.includes('created') || c.includes('time')) dataType = 'DATE';

            await db.columnMeta.create({
                data: { sourceId, originalName: col, normalizedName: c, dataType, nullPercent: 0, uniquePercent: 100, sampleValues: [] }
            });
        }

        console.log(`Purifying ${file}...`);
        await purifyDataset(sourceId);
    }

    // 5. Governance
    console.log(`Locking domain to ${domain}...`);
    await setGovernedDomain({ projectId: id, domain, userId, reason: 'Ultimate Dataset Auto-lock', confidence: 100 });

    // 6. Discovery
    console.log('Discovering KPIs...');
    await discoverKPIs(id);
    
    // 7. Blueprint Insertion
    console.log('Inserting Blueprint...');
    const rules = KPI_RULE_REGISTRY[domain as keyof typeof KPI_RULE_REGISTRY];
    if (!rules) {
        console.error(`No rules found for domain ${domain} in registry.`);
        return;
    }
    const sourceObjects = await db.source.findMany({ where: { projectId: id } });
    const input = {
        semanticColumns: semanticMap,
        sources: sourceObjects.map(s => ({ id: s.id, name: s.fileName, columns: s.columns, semanticMap })),
        relationships: []
    };

    const result = await insertEligibleKPIsIntoBlueprint(id, domain, rules, input as any);
    console.log(`✅ Project ${id} ready! ${result.inserted} KPIs approved.`);
}

async function main() {
    // 1. ECOMMERCE MAP
    const ecMap = {
        'revenue': 'revenue',
        'order_id': 'order_id',
        'customer_id': 'customer_id',
        'session_id': 'session_id',
        'cart_id': 'cart_id',
        'quantity': 'quantity',
        'category': 'category',
        'status': 'status',
        'date': 'order_date',
        'order_date': 'order_date',
        'cogs': 'cogs',
        'marketing_cost': 'marketing_cost'
    };

    // 2. RETAIL MAP
    const rtMap = {
        'revenue': 'sales_value',
        'transaction_id': 'transaction_id',
        'store_id': 'store_id',
        'product_id': 'product_id',
        'quantity': 'quantity_sold',
        'inventory': 'inventory_level',
        'cogs': 'cogs',
        'date': 'timestamp',
        'category': 'department',
        'status': 'stock_status',
        'items_in_basket': 'items_in_basket',
        'shrinkage': 'shrinkage',
        'sold_units': 'quantity_sold',
        'received_units': 'received_units',
        'visitor_count': 'visitor_count'
    };

    // 3. SAAS MAP
    const saasMap = {
        'revenue': 'mrr',
        'subscription_id': 'subscription_id',
        'user_id': 'user_id',
        'mrr': 'mrr',
        'churned': 'churned',
        'date': 'signup_date',
        'signup_date': 'signup_date',
        'last_login': 'last_login',
        'successful_charge': 'successful_charge',
        'charge_attempts': 'charge_attempts',
        'failed_payment': 'failed_payment',
        'usage_minutes': 'usage_minutes',
        'expansion_mrr': 'expansion_mrr',
        'contraction_mrr': 'contraction_mrr',
        'category': 'plan',
        'status': 'successful_charge'
    };

    // 4. EDTECH MAP
    const edtechMap = {
        'enrollment_id': 'enrollment_id',
        'student_id': 'student_id',
        'course_id': 'course_id',
        'completed': 'completed',
        'enrolled': 'enrolled',
        'grade': 'grade',
        'certified': 'certified',
        'passed': 'passed',
        'attempted': 'attempted',
        'last_active': 'last_active',
        'minutes': 'minutes',
        'date': 'date',
        'revenue': 'revenue',
        'category': 'category'
    };

    // 5. SERVICES MAP
    const servicesMap = {
        'revenue': 'revenue',
        'engagement_id': 'engagement_id',
        'client_id': 'client_id',
        'hours_billed': 'hours_billed',
        'billable_rate': 'billable_rate',
        'cogs': 'cogs',
        'satisfaction_score': 'satisfaction_score',
        'project_id': 'project_id',
        'employee_id': 'employee_id',
        'status': 'status',
        'category': 'service_type',
        'date': 'date'
    };

    // 6. MANUFACTURING MAP
    const manufacturingMap = {
        'production_id': 'production_id',
        'batch_id': 'batch_id',
        'date': 'timestamp',
        'timestamp': 'timestamp',
        'units_produced': 'units_produced',
        'units_defective': 'units_defective',
        'downtime_minutes': 'downtime_minutes',
        'operating_cost': 'operating_cost',
        'efficiency_score': 'efficiency_score',
        'category': 'machine_id',
        'status': 'quality_grade',
        'revenue': 'units_produced',
        'cogs': 'operating_cost'
    };

    // 7. HEALTHCARE MAP
    const healthcareMap = {
        'appointment_id': 'appointment_id',
        'patient_id': 'patient_id',
        'doctor_id': 'doctor_id',
        'date': 'timestamp',
        'timestamp': 'timestamp',
        'status': 'status',
        'revenue': 'revenue',
        'cogs': 'cogs',
        'admitted': 'admitted',
        'readmitted': 'readmitted',
        'no_show': 'no_show',
        'duration_minutes': 'duration_minutes',
        'waiting_time_minutes': 'waiting_time_minutes',
        'satisfaction_score': 'satisfaction_score',
        'category': 'department'
    };

    // 8. FINANCE MAP
    const financeMap = {
        'transaction_id': 'transaction_id',
        'portfolio_id': 'portfolio_id',
        'customer_id': 'customer_id',
        'revenue': 'amount',
        'amount': 'amount',
        'date': 'date',
        'cogs': 'fee',
        'fee': 'fee',
        'loan_id': 'loan_id',
        'risk_score': 'risk_score',
        'interest_rate': 'interest_rate',
        'status': 'status',
        'defaulted': 'defaulted',
        'payment_status': 'payment_status',
        'category': 'category'
    };

    const ecFiles = ['ecommerce_part_1.csv', 'ecommerce_part_2.csv', 'ecommerce_part_3.csv'];
    const rtFiles = ['retail_part_1.csv', 'retail_part_2.csv', 'retail_part_3.csv'];
    const saasFiles = ['saas_part_1.csv', 'saas_part_2.csv', 'saas_part_3.csv'];
    const edtechFiles = ['edtech_part_1.csv', 'edtech_part_2.csv', 'edtech_part_3.csv'];
    const servicesFiles = ['services_part_1.csv', 'services_part_2.csv', 'services_part_3.csv'];
    const manufacturingFiles = ['manufacturing_part_1.csv', 'manufacturing_part_2.csv', 'manufacturing_part_3.csv'];
    const healthcareFiles = ['healthcare_part_1.csv', 'healthcare_part_2.csv', 'healthcare_part_3.csv'];
    const financeFiles = ['finance_part_1.csv', 'finance_part_2.csv', 'finance_part_3.csv'];

    await setupProject('ecommerce-ultimate', 'Ecommerce Ultimate Dataset', ecFiles, 'ECOMMERCE', ecMap);
    await setupProject('retail-ultimate', 'Retail Ultimate Dataset', rtFiles, 'RETAIL', rtMap);
    await setupProject('saas-ultimate', 'SaaS Ultimate Dataset', saasFiles, 'SAAS', saasMap);
    await setupProject('edtech-ultimate', 'EdTech Ultimate Dataset', edtechFiles, 'EDTECH', edtechMap);
    await setupProject('services-ultimate', 'Services Ultimate Dataset', servicesFiles, 'SERVICES', servicesMap);
    await setupProject('manufacturing-ultimate', 'Manufacturing Ultimate Dataset', manufacturingFiles, 'MANUFACTURING', manufacturingMap);
    await setupProject('healthcare-ultimate', 'Healthcare Ultimate Dataset', healthcareFiles, 'HEALTHCARE', healthcareMap);
    await setupProject('finance-ultimate', 'Finance Ultimate Dataset', financeFiles, 'FINANCE', financeMap);

    await db.$disconnect();
}

main().catch(console.error);
