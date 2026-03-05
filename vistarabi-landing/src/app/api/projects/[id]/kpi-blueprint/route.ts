import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import {
    loadBlueprintWithKPIs,
    validateKPIPayload,
    flattenKPI,
    toAggregationFunction,
} from '@/lib/kpi/blueprint-loader';

// ─── Helper: serialize blueprint for the frontend ───────────────────────────

function serializeBlueprint(blueprint: Awaited<ReturnType<typeof loadBlueprintWithKPIs>>) {
    if (!blueprint) return null;
    return {
        id: blueprint.id,
        projectId: blueprint.projectId,
        domain: blueprint.domain,
        version: blueprint.version,
        isLocked: blueprint.isLocked,
        lockedAt: blueprint.lockedAt,
        kpis: blueprint.kpis.map(flattenKPI),
        createdAt: blueprint.createdAt,
    };
}

// GET /api/projects/[id]/kpi-blueprint
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        if (project.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

        const blueprint = await loadBlueprintWithKPIs(id);
        const history = await db.kPIBlueprintHistory.findMany({
            where: { projectId: id },
            orderBy: { changedAt: 'desc' },
            take: 50,
        });

        return NextResponse.json({ blueprint: serializeBlueprint(blueprint), history });
    } catch (error) {
        console.error('Get blueprint error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/projects/[id]/kpi-blueprint — Add KPI to blueprint
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        if (project.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

        const body = await request.json();
        const { kpi } = body;

        if (!kpi || typeof kpi !== 'object') {
            return NextResponse.json({
                error: 'Payload must be a structured KPI object.',
            }, { status: 400 });
        }

        // ── Enforce Data Contract ──
        try {
            validateKPIPayload(kpi);
        } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
            return NextResponse.json({ error: message }, { status: 400 });
        }

        // ── Get or create Blueprint ──
        let blueprint = await db.kPIBlueprint.findUnique({ where: { projectId: id } });

        if (blueprint?.isLocked) {
            return NextResponse.json({ error: 'Blueprint is locked and cannot be modified.' }, { status: 400 });
        }

        if (!blueprint) {
            blueprint = await db.kPIBlueprint.create({
                data: {
                    projectId: id,
                    domain: kpi.domain || 'GENERAL',
                    version: 1,
                    isLocked: false,
                },
            });
        }

        // ── Check for duplicate (by kpiLibraryId) ──
        const existing = await db.approvedKPI.findFirst({
            where: { blueprintId: blueprint.id, kpiLibraryId: kpi.id },
        });
        if (existing) {
            return NextResponse.json({ error: 'KPI already in blueprint.' }, { status: 400 });
        }

        // ── Create ApprovedKPI with AggregationRules + LineageDefinition ──
        await db.approvedKPI.create({
            data: {
                blueprintId: blueprint.id,
                kpiLibraryId: kpi.id,
                name: kpi.name,
                description: kpi.description || null,
                category: kpi.category || 'general',
                sourceTable: kpi.sourceTable || 'unknown',
                aggregations: {
                    create: kpi.aggregations.map((a: Record<string, string>) => ({
                        function: toAggregationFunction(a.function) as string,
                        column: a.column,
                    })),
                },
                ...(kpi.lineage ? {
                    lineage: {
                        create: {
                            formula: kpi.lineage.formula || '',
                            tables: kpi.lineage.tables || [],
                            joins: kpi.lineage.joins || [],
                        },
                    },
                } : {}),
                ...(kpi.groupBy ? {
                    groupBys: { create: [{ column: kpi.groupBy }] },
                } : {}),
            },
        });

        // ── Bump blueprint version ──
        const updated = await db.kPIBlueprint.update({
            where: { id: blueprint.id },
            data: { version: { increment: 1 } },
        });

        // ── Record history ──
        await db.kPIBlueprintHistory.create({
            data: {
                projectId: id,
                version: updated.version,
                action: 'ADD',
                kpiId: kpi.id,
                kpiName: kpi.name,
                changedBy: user.userId,
            },
        });

        const finalBlueprint = await loadBlueprintWithKPIs(id);
        return NextResponse.json({ success: true, blueprint: serializeBlueprint(finalBlueprint) });
    } catch (error) {
        console.error('Add KPI error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/projects/[id]/kpi-blueprint?kpiId=<libraryId>
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const kpiId = searchParams.get('kpiId');

        if (!kpiId) return NextResponse.json({ error: 'kpiId query param required' }, { status: 400 });

        const blueprint = await db.kPIBlueprint.findUnique({ where: { projectId: id } });
        if (!blueprint) return NextResponse.json({ error: 'No blueprint found' }, { status: 404 });
        if (blueprint.isLocked) return NextResponse.json({ error: 'Blueprint is locked' }, { status: 400 });

        // Find the row by kpiLibraryId (e.g. 'ec-001') — not the internal DB UUID
        const kpiRow = await db.approvedKPI.findFirst({
            where: { blueprintId: blueprint.id, kpiLibraryId: kpiId },
        });

        if (!kpiRow) {
            return NextResponse.json({ error: `KPI '${kpiId}' not found in blueprint.` }, { status: 404 });
        }

        // Cascade deletes AggregationRules, GroupByDefinitions, LineageDefinition automatically
        await db.approvedKPI.delete({ where: { id: kpiRow.id } });

        // Bump version
        const updated = await db.kPIBlueprint.update({
            where: { id: blueprint.id },
            data: { version: { increment: 1 } },
        });

        await db.kPIBlueprintHistory.create({
            data: {
                projectId: id,
                version: updated.version,
                action: 'REMOVE',
                kpiId,
                kpiName: kpiRow.name,
                changedBy: user.userId,
            },
        });

        const finalBlueprint = await loadBlueprintWithKPIs(id);
        return NextResponse.json({ success: true, blueprint: serializeBlueprint(finalBlueprint) });
    } catch (error) {
        console.error('Remove KPI error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
