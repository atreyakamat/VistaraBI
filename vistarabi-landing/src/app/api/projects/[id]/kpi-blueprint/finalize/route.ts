import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import { loadBlueprintWithKPIs, flattenKPI } from '@/lib/kpi/blueprint-loader';

// POST /api/projects/[id]/kpi-blueprint/finalize - Lock the blueprint
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

        // ── Load with relational data ──
        const blueprint = await loadBlueprintWithKPIs(id);
        if (!blueprint) return NextResponse.json({ error: 'No blueprint to finalize' }, { status: 404 });
        if (blueprint.isLocked) return NextResponse.json({ error: 'Already locked' }, { status: 400 });

        // ── Enforce: must have at least one KPI with at least one AggregationRule ──
        const validKPIs = blueprint.kpis.filter(k => k.aggregations.length > 0);
        if (validKPIs.length === 0) {
            return NextResponse.json({
                error: 'Cannot finalize: Blueprint has no KPIs with valid aggregation rules.',
            }, { status: 400 });
        }

        const locked = await db.kPIBlueprint.update({
            where: { projectId: id },
            data: {
                isLocked: true,
                lockedAt: new Date(),
                lockedBy: user.userId,
                version: { increment: 1 },
            },
        });

        await db.kPIBlueprintHistory.create({
            data: {
                projectId: id,
                version: locked.version,
                action: 'LOCK',
                kpiId: 'BLUEPRINT',
                kpiName: `Locked with ${validKPIs.length} KPIs`,
                changedBy: user.userId,
            },
        });

        const finalBlueprint = await loadBlueprintWithKPIs(id);
        return NextResponse.json({
            success: true,
            blueprint: {
                ...locked,
                kpis: finalBlueprint?.kpis.map(flattenKPI) || [],
            },
            message: `Blueprint finalized with ${validKPIs.length} KPIs`,
        });
    } catch (error) {
        console.error('Finalize blueprint error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
