import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import type { ApprovedKPI } from '@/lib/prisma';

// GET /api/projects/[id]/kpi-blueprint - Get current blueprint
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

        const blueprint = await db.kPIBlueprint.findUnique({ where: { projectId: id } });
        const history = await db.kPIBlueprintHistory.findMany({ where: { projectId: id } });

        return NextResponse.json({ blueprint, history });
    } catch (error) {
        console.error('Get blueprint error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/projects/[id]/kpi-blueprint - Add KPI to blueprint
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
        const { kpi } = body as { kpi: ApprovedKPI };

        if (!kpi || typeof kpi !== 'object') {
            return NextResponse.json({ error: 'Fatal Structural Error: Payload must be a structured ApprovedKPI object, not a raw string/column.' }, { status: 400 });
        }

        if (!kpi.id || !kpi.name || !Array.isArray(kpi.aggregations) || !kpi.sourceTable || !kpi.lineage) {
            return NextResponse.json({ error: 'Fatal Structural Error: KPI object must adhere to the Domain Data Contract (missing id, name, aggregations, sourceTable, or lineage).' }, { status: 400 });
        }

        // Get or create blueprint
        let blueprint = await db.kPIBlueprint.findUnique({ where: { projectId: id } });

        if (blueprint?.isLocked) {
            return NextResponse.json({ error: 'Blueprint is locked' }, { status: 400 });
        }

        const newKPI: ApprovedKPI = {
            ...kpi,
            addedAt: new Date(),
        };

        if (!blueprint) {
            const createData = {
                id: randomUUID(),
                projectId: id,
                kpis: [newKPI] as any,
                version: 1,
                isLocked: false,
                lockedAt: null,
                lockedBy: null,
                createdAt: new Date(),
            };

            blueprint = await db.kPIBlueprint.upsert({
                where: { projectId: id },
                create: createData,
                update: {
                    kpis: [newKPI] as any,
                    version: 1,
                },
            });
        } else {
            const currentKpis = (blueprint.kpis as unknown as ApprovedKPI[]) || [];
            if (currentKpis.some((k: ApprovedKPI) => k.id === kpi.id)) {
                return NextResponse.json({ error: 'KPI already in blueprint' }, { status: 400 });
            }

            blueprint = await db.kPIBlueprint.update({
                where: { projectId: id },
                data: {
                    kpis: [...currentKpis, newKPI] as any,
                    version: blueprint.version + 1,
                },
            });
        }

        // Record history
        await db.kPIBlueprintHistory.create({
            data: {
                id: randomUUID(),
                projectId: id,
                version: blueprint?.version || 1,
                action: 'ADD',
                kpiId: kpi.id,
                kpiName: kpi.name,
                changedBy: user.userId,
                changedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true, blueprint });
    } catch (error) {
        console.error('Add KPI error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/projects/[id]/kpi-blueprint - Remove KPI from blueprint
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

        if (!kpiId) return NextResponse.json({ error: 'kpiId required' }, { status: 400 });

        const blueprint = await db.kPIBlueprint.findUnique({ where: { projectId: id } });
        if (!blueprint) return NextResponse.json({ error: 'No blueprint' }, { status: 404 });
        if (blueprint.isLocked) return NextResponse.json({ error: 'Blueprint is locked' }, { status: 400 });

        const kpis = (blueprint.kpis as unknown as ApprovedKPI[]) || [];
        const kpiToRemove = kpis.find((k: ApprovedKPI) => k.id === kpiId);
        const updatedKpis = kpis.filter((k: ApprovedKPI) => k.id !== kpiId);

        const updated = await db.kPIBlueprint.update({
            where: { projectId: id },
            data: { kpis: updatedKpis as any, version: blueprint.version + 1 },
        });

        await db.kPIBlueprintHistory.create({
            data: {
                id: randomUUID(),
                projectId: id,
                version: updated.version,
                action: 'REMOVE',
                kpiId,
                kpiName: kpiToRemove?.name || 'Unknown',
                changedBy: user.userId,
                changedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true, blueprint: updated });
    } catch (error) {
        console.error('Remove KPI error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
