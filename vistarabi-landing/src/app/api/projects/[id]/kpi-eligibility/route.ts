// Module 4.5 — KPI Eligibility API Route
// POST /api/projects/[id]/kpi-eligibility
//
// Accepts semantic column mappings, runs Module 4.5, returns DomainContextObject.

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import type { RelationshipEntry } from '@/lib/prisma';
import { runModule4_5, evaluateKPIEligibilityOnly } from '@/lib/kpi/module-4-5';
import type { SemanticColumnMap, SourceInfo } from '@/lib/kpi/semantic-types';

// ─── POST — Run Module 4.5 ─────────────────────────────────────────────────────

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    const projectId = params.id;

    try {
        const body = await req.json();
        const { semanticColumns, dryRun = false } = body as {
            semanticColumns: SemanticColumnMap;
            dryRun?: boolean;
        };

        if (!semanticColumns || typeof semanticColumns !== 'object') {
            return NextResponse.json(
                { error: 'semanticColumns is required and must be an object mapping semantic roles to column names' },
                { status: 400 }
            );
        }

        // Load domain from governance
        const governance = await db.domainGovernance.findUnique({ where: { projectId } });
        if (!governance?.activeDomain) {
            return NextResponse.json(
                { error: 'No governed domain found. Run domain detection first.' },
                { status: 400 }
            );
        }
        const domain = governance.activeDomain as any;

        // Load sources
        const dbSources = await db.source.findMany({
            where: { projectId, status: 'READY' },
        });
        const sources: SourceInfo[] = dbSources.map(s => ({
            id: s.id,
            name: s.fileName,
            columns: s.columns ?? [],
        }));

        // Load relationship registry
        const relRegistry = await db.relationshipRegistry.findUnique({ where: { projectId } });
        const relationships: RelationshipEntry[] = relRegistry
            ? (relRegistry.entries as unknown as RelationshipEntry[])
            : [];

        if (dryRun) {
            // Dry run: no DB writes, just evaluate and resolve
            const result = evaluateKPIEligibilityOnly({
                domain,
                semanticColumns,
                relationships,
                sources,
            });

            return NextResponse.json({
                dryRun: true,
                domain,
                eligibleCount: result.eligible.length,
                skippedCount: result.skipped.length,
                eligibleKPIs: result.eligible.map(k => ({
                    id: k.ruleId,
                    name: k.name,
                    category: k.category,
                    formula: k.formula,
                    tables: k.tables,
                    aggregations: k.aggregations.map(a => ({ function: a.function, column: a.column })),
                })),
                skippedKPIs: result.skipped,
                log: result.log,
            });
        }

        // Full run: evaluate + resolve + insert into Blueprint
        const domainContext = await runModule4_5({
            projectId,
            domain,
            semanticColumns,
            relationships,
            sources,
        });

        return NextResponse.json({
            success: true,
            domain: domainContext.domain,
            unlockedCount: domainContext.unlockedCount,
            skippedCount: domainContext.skippedCount,
            availableKPIs: domainContext.availableKPIs.map(k => ({
                id: k.ruleId,
                name: k.name,
                category: k.category,
                formula: k.formula,
                tables: k.tables,
                visualizationHint: k.defaultVisualizationHint,
                aggregations: k.aggregations.map(a => ({
                    function: a.function,
                    column: a.column,
                    sourceName: a.sourceName,
                })),
                joins: k.joins,
            })),
            eligibilityLog: domainContext.eligibilityLog,
        });

    } catch (err: any) {
        console.error('[Module4.5 API] Error:', err);
        return NextResponse.json(
            { error: err.message || 'Internal error running KPI eligibility engine' },
            { status: 500 }
        );
    }
}

// ─── GET — Retrieve current eligibility state ──────────────────────────────────

export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    const projectId = params.id;

    try {
        const blueprint = await db.kPIBlueprint.findUnique({
            where: { projectId },
            include: {
                kpis: {
                    include: {
                        aggregations: true,
                        lineage: true,
                    },
                },
            },
        });

        if (!blueprint) {
            return NextResponse.json({
                message: 'No blueprint found. POST to /kpi-eligibility to run Module 4.5.',
                availableKPIs: [],
            });
        }

        return NextResponse.json({
            blueprintId: blueprint.id,
            domain: blueprint.domain,
            kpiCount: blueprint.kpis.length,
            kpis: blueprint.kpis.map(k => ({
                id: k.id,
                name: k.name,
                category: k.category,
                sourceTable: k.sourceTable,
                aggregations: k.aggregations,
                hasLineage: !!k.lineage,
                formula: k.lineage?.formula ?? null,
            })),
        });

    } catch (err: any) {
        console.error('[Module4.5 API GET] Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
