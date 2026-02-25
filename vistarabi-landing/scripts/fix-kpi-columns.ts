import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log('Starting migration script...');

    // 1. Update AggregationRule
    const up1 = await prisma.aggregationRule.updateMany({
        where: { column: 'new_customer_id' },
        data: { column: 'customer_id' }
    });
    console.log(`Updated ${up1.count} aggregation rules for new_customer_id`);

    const up2 = await prisma.aggregationRule.updateMany({
        where: { column: 'new_customers' },
        data: { column: 'customer_id' }
    });
    console.log(`Updated ${up2.count} aggregation rules for new_customers`);

    // 2. Update LineageDefinition formulas
    const lineages = await prisma.lineageDefinition.findMany();
    let updatedLineages = 0;
    for (const lineage of lineages) {
        if (lineage.formula && (lineage.formula.includes('new_customer_id') || lineage.formula.includes('new_customers'))) {
            const newFormula = lineage.formula.replace(/new_customer_id/g, 'customer_id').replace(/new_customers/g, 'customer_id');
            await prisma.lineageDefinition.update({
                where: { id: lineage.id },
                data: { formula: newFormula }
            });
            updatedLineages++;
        }
    }
    console.log(`Updated ${updatedLineages} LineageDefinition formulas`);

    // 3. Update KPILineageRegistry entries
    const registries = await prisma.kPILineageRegistry.findMany();
    let updatedRegistries = 0;
    for (const reg of registries) {
        let changed = false;
        const entries: any[] = typeof reg.entries === 'string' ? JSON.parse(reg.entries) : reg.entries;

        if (Array.isArray(entries)) {
            for (const entry of entries) {
                if (entry.formula) {
                    const original = entry.formula;
                    entry.formula = entry.formula.replace(/new_customer_id/g, 'customer_id').replace(/new_customers/g, 'customer_id');
                    if (entry.formula !== original) changed = true;
                }

                if (Array.isArray(entry.aggregations)) {
                    for (const agg of entry.aggregations) {
                        if (agg.column === 'new_customer_id' || agg.column === 'new_customers') {
                            agg.column = 'customer_id';
                            changed = true;
                        }
                    }
                }

                if (Array.isArray(entry.sources)) {
                    for (const src of entry.sources) {
                        if (Array.isArray(src.columns)) {
                            for (let i = 0; i < src.columns.length; i++) {
                                if (src.columns[i] === 'new_customer_id' || src.columns[i] === 'new_customers') {
                                    src.columns[i] = 'customer_id';
                                    changed = true;
                                }
                            }
                        }
                    }
                }
            }
        }

        if (changed) {
            await prisma.kPILineageRegistry.update({
                where: { id: reg.id },
                data: { entries }
            });
            updatedRegistries++;
        }
    }
    console.log(`Updated ${updatedRegistries} KPILineageRegistry documents`);

    console.log('Done mapping existing KPIs');
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
