/**
 * Data Migration: KPIBlueprint JSON → Relational Tables
 *
 * Reads any old-style KPIBlueprint rows that still carry a `kpis` JSON blob
 * stored under the old schema (before the relational migration) and seeds the
 * new ApprovedKPI / AggregationRule / LineageDefinition rows.
 *
 * Run once after `npx prisma migrate dev --name relational_kpi_blueprint`:
 *   npx ts-node --project tsconfig.json prisma/migrate-blueprint.ts
 */

import { PrismaClient, AggregationFunction } from '@prisma/client';

const db = new PrismaClient();

// The old JSON KPI shape stored in the blob
interface OldKPI {
    id?: string;
    kpiId?: string;
    name?: string;
    kpiName?: string;
    category?: string;
    sourceTable?: string;
    aggregations?: { function: string; column: string }[];
    matchedColumns?: string[];
    formula?: string;
    lineage?: {
        formula?: string;
        tables?: string[];
        joins?: unknown[];
    };
}

function toAggregationFunction(fn: string): AggregationFunction {
    const map: Record<string, AggregationFunction> = {
        SUM: AggregationFunction.SUM,
        COUNT: AggregationFunction.COUNT,
        COUNT_DISTINCT: AggregationFunction.COUNT_DISTINCT,
        DISTINCT_COUNT: AggregationFunction.COUNT_DISTINCT,
        AVG: AggregationFunction.AVG,
        AVERAGE: AggregationFunction.AVG,
        MIN: AggregationFunction.MIN,
        MAX: AggregationFunction.MAX,
    };
    return map[fn?.toUpperCase()] ?? AggregationFunction.SUM;
}

async function migrateBlueprint(blueprintId: string, kpisJson: OldKPI[]) {
    let migrated = 0;
    let skipped = 0;

    for (const kpi of kpisJson) {
        const kpiId = kpi.id || kpi.kpiId;
        const kpiName = kpi.name || kpi.kpiName;

        if (!kpiId || !kpiName) {
            console.warn(`  [SKIP] Missing id or name:`, JSON.stringify(kpi).slice(0, 120));
            skipped++;
            continue;
        }

        // Build aggregation rules
        let aggRules: { function: AggregationFunction; column: string }[] = [];

        if (kpi.aggregations && kpi.aggregations.length > 0) {
            aggRules = kpi.aggregations.map(a => ({
                function: toAggregationFunction(a.function),
                column: a.column,
            }));
        } else if (kpi.matchedColumns && kpi.matchedColumns.length > 0) {
            // Derive from matched columns with a best-guess aggregation
            aggRules = kpi.matchedColumns.map(col => ({
                function: AggregationFunction.SUM,
                column: col,
            }));
        } else {
            console.warn(`  [SKIP] KPI "${kpiName}" has no aggregations or columns — cannot migrate.`);
            skipped++;
            continue;
        }

        const formula = kpi.lineage?.formula || kpi.formula || aggRules.map(a => `${a.function}(${a.column})`).join(', ');
        const tables = kpi.lineage?.tables || [kpi.sourceTable || 'unknown'];
        const joins = kpi.lineage?.joins || [];

        try {
            // Check if already migrated (idempotent by kpiLibraryId)
            const existing = await db.approvedKPI.findFirst({
                where: { blueprintId, kpiLibraryId: kpiId },
            });
            if (existing) {
                console.log(`  [EXISTS] "${kpiName}" already migrated, skipping.`);
                migrated++;
                continue;
            }

            await db.approvedKPI.create({
                data: {
                    blueprintId,
                    kpiLibraryId: kpiId,
                    name: kpiName,
                    category: kpi.category || 'general',
                    sourceTable: kpi.sourceTable || 'unknown',
                    aggregations: {
                        create: aggRules,
                    },
                    lineage: {
                        create: {
                            formula,
                            tables,
                            joins: joins as any,
                        },
                    },
                },
            });

            console.log(`  [OK] Migrated "${kpiName}" with ${aggRules.length} aggregation rule(s)`);
            migrated++;
        } catch (err: any) {
            console.error(`  [ERROR] Failed to migrate "${kpiName}":`, err.message);
            skipped++;
        }
    }

    return { migrated, skipped };
}

async function main() {
    console.log('=== KPI Blueprint Data Migration ===\n');

    // Fetch all blueprints with their relational KPIs count
    const blueprints = await db.kPIBlueprint.findMany({
        include: { kpis: { select: { id: true } } },
    });

    console.log(`Found ${blueprints.length} blueprint(s) in database.\n`);

    let totalMigrated = 0;
    let totalSkipped = 0;

    for (const blueprint of blueprints) {
        console.log(`[Blueprint ${blueprint.id}] project: ${blueprint.projectId}`);

        if (blueprint.kpis.length > 0) {
            console.log(`  Already has ${blueprint.kpis.length} relational KPIs — no JSON migration needed.\n`);
            continue;
        }

        // Try to read old JSON from a raw query (column may no longer exist after migration)
        let rawJson: OldKPI[] = [];
        try {
            const rows = await db.$queryRaw<{ kpis: unknown }[]>`
        SELECT kpis FROM "KPIBlueprint" WHERE id = ${blueprint.id}
      `;
            if (rows[0]?.kpis) {
                rawJson = rows[0].kpis as OldKPI[];
            }
        } catch {
            console.log('  Old kpis column no longer present — nothing to migrate.\n');
            continue;
        }

        if (!rawJson || rawJson.length === 0) {
            console.log('  JSON kpis blob is empty — nothing to migrate.\n');
            continue;
        }

        console.log(`  Migrating ${rawJson.length} KPIs from JSON blob...`);
        const { migrated, skipped } = await migrateBlueprint(blueprint.id, rawJson);
        totalMigrated += migrated;
        totalSkipped += skipped;
        console.log(`  Done: ${migrated} migrated, ${skipped} skipped.\n`);
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Total migrated: ${totalMigrated}`);
    console.log(`Total skipped:  ${totalSkipped}`);
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => db.$disconnect());
