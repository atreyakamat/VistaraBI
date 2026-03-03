// Module 4.5 — Blueprint Inserter
// Inserts resolved EligibleKPIs into the relational Prisma Blueprint tables.
// Skips any KPI where resolution throws. Never inserts partially-resolved KPIs.

import { randomUUID } from 'crypto';
import db from '@/lib/prisma';
import type { DomainType } from '@/lib/prisma';
import type { EligibleKPI, SemanticInput } from './semantic-types';
import { type KPIRule } from './kpi-rule-registry';
import { resolveKPI, SemanticResolutionError } from './semantic-resolver';

// ─── Insertion Result ──────────────────────────────────────────────────────────

export interface BlueprintInsertionResult {
    blueprintId: string;
    inserted: number;
    skipped: string[];    // IDs of rules that failed resolution
    resolvedKPIs: EligibleKPI[];
}

// ─── Main Inserter ─────────────────────────────────────────────────────────────

/**
 * For each unlocked KPIRule:
 *   1. Resolve it via SemanticResolver (throws on failure → skipped, not inserted)
 *   2. Upsert ApprovedKPI in Blueprint
 *   3. Create AggregationRule records
 *   4. Create LineageDefinition record
 *
 * A KPI is either completely inserted or completely skipped — no partial state.
 */
export async function insertEligibleKPIsIntoBlueprint(
    projectId: string,
    domain: DomainType,
    unlockedRules: KPIRule[],
    input: SemanticInput
): Promise<BlueprintInsertionResult> {
    const prefix = `[BlueprintInserter][${projectId}]`;
    console.log(`${prefix} === Starting Blueprint insertion ===`);
    console.log(`${prefix} Unlocked rules to insert: ${unlockedRules.length}`);

    // ── Step 1: Get or create KPIBlueprint ─────────────────────────────────────
    const blueprint = await db.kPIBlueprint.upsert({
        where: { projectId },
        create: {
            id: `bp-${randomUUID()}`,
            projectId,
            domain,
            version: 1,
            isLocked: false,
        },
        update: {
            domain,
            updatedAt: new Date(),
        },
    });
    console.log(`${prefix} Blueprint: ${blueprint.id} (domain: ${domain})`);

    // ── Step 2: For each rule, attempt resolution then insert ──────────────────
    const resolvedKPIs: EligibleKPI[] = [];
    const skipped: string[] = [];

    for (const rule of unlockedRules) {
        try {
            // Resolve: throws SemanticResolutionError on failure
            const resolved = resolveKPI(
                rule,
                domain,
                input.semanticColumns,
                input.sources,
                input.relationships
            );

            // Upsert ApprovedKPI — schema has no @@unique on [blueprintId,kpiLibraryId],
            // so we use findFirst + create/update manually.
            const existingKPI = await db.approvedKPI.findFirst({
                where: {
                    blueprintId: blueprint.id,
                    kpiLibraryId: rule.id,
                },
            });

            let savedKPI;
            if (existingKPI) {
                savedKPI = await db.approvedKPI.update({
                    where: { id: existingKPI.id },
                    data: {
                        name: resolved.name,
                        description: resolved.description,
                        sourceTable: resolved.sourceTable,
                        category: resolved.category,
                        updatedAt: new Date(),
                    },
                });
            } else {
                savedKPI = await db.approvedKPI.create({
                    data: {
                        id: `kpi-${randomUUID()}`,
                        blueprintId: blueprint.id,
                        kpiLibraryId: rule.id,
                        name: resolved.name,
                        description: resolved.description,
                        sourceTable: resolved.sourceTable,
                        category: resolved.category,
                    },
                });
            }

            // Delete and re-create AggregationRules (clean slate per upsert)
            await db.aggregationRule.deleteMany({ where: { kpiId: savedKPI.id } });
            for (const agg of resolved.aggregations) {
                await db.aggregationRule.create({
                    data: {
                        id: `agg-${randomUUID()}`,
                        kpiId: savedKPI.id,
                        function: agg.function,
                        column: agg.column,
                    },
                });
            }

            // Delete and re-create LineageDefinition
            await db.lineageDefinition.deleteMany({ where: { kpiId: savedKPI.id } });
            await db.lineageDefinition.create({
                data: {
                    id: `lin-${randomUUID()}`,
                    kpiId: savedKPI.id,
                    formula: resolved.formula,
                    tables: resolved.tables as any,
                    joins: resolved.joins as any,
                },
            });

            resolvedKPIs.push(resolved);
            console.log(`${prefix} ✅ Inserted: [${rule.id}] ${rule.name} → table: ${resolved.sourceTable}`);

        } catch (err) {
            if (err instanceof SemanticResolutionError) {
                console.warn(`${prefix} ⚠️  SKIPPED [${rule.id}] ${rule.name}: ${err.detail}`);
            } else {
                console.error(`${prefix} ❌ ERROR inserting [${rule.id}] ${rule.name}:`, err);
            }
            skipped.push(rule.id);
        }
    }

    console.log(`${prefix} === Blueprint insertion complete ===`);
    console.log(`${prefix} Inserted: ${resolvedKPIs.length} | Skipped: ${skipped.length}`);

    return {
        blueprintId: blueprint.id,
        inserted: resolvedKPIs.length,
        skipped,
        resolvedKPIs,
    };
}
