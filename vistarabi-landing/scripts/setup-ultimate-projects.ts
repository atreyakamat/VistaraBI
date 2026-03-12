
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
    const userId = '5d59fdb8-8fd4-4aa4-9833-5b4b205f761b';
    console.log(`\n🚀 Setting up ultimate project: ${name} (${id})`);

    // 1. Create Project
    await db.project.upsert({
        where: { id },
        update: { name, userId },
        create: { id, name, userId, description: `Ultimate ${domain} dataset (30k records) for M6/M7 testing` }
    });

    for (const file of files) {
        const filePath = path.join(process.cwd(), 'dummy-data/ultimate', file);
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
            if (c.includes('revenue') || c.includes('value') || c.includes('cost') || c.includes('quantity') || c.includes('level') || c.includes('amount') || c.includes('tax') || c.includes('discount') || c.includes('count') || c.includes('units') || c.includes('shrinkage')) dataType = 'NUMBER';
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
    // Ultimate Ecommerce Map
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

    // Ultimate Retail Map
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

    const ecFiles = ['ecommerce_part_1.csv', 'ecommerce_part_2.csv', 'ecommerce_part_3.csv'];
    const rtFiles = ['retail_part_1.csv', 'retail_part_2.csv', 'retail_part_3.csv'];

    await setupProject('ecommerce-ultimate', 'Ecommerce Ultimate Dataset', ecFiles, 'ECOMMERCE', ecMap);
    await setupProject('retail-ultimate', 'Retail Ultimate Dataset', rtFiles, 'RETAIL', rtMap);

    await db.$disconnect();
}

main().catch(console.error);
