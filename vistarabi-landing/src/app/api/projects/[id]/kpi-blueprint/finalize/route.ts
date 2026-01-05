import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';

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

        const blueprint = await db.kpiBlueprint.findUnique({ where: { projectId: id } });
        if (!blueprint) return NextResponse.json({ error: 'No blueprint to finalize' }, { status: 404 });
        if (blueprint.isLocked) return NextResponse.json({ error: 'Already locked' }, { status: 400 });
        if (blueprint.kpis.length === 0) return NextResponse.json({ error: 'Cannot lock empty blueprint' }, { status: 400 });

        const locked = await db.kpiBlueprint.update({
            where: { projectId: id },
            data: {
                isLocked: true,
                lockedAt: new Date(),
                lockedBy: user.userId,
                version: blueprint.version + 1,
            },
        });

        await db.kpiBlueprintHistory.create({
            data: {
                id: randomUUID(),
                projectId: id,
                version: locked.version,
                action: 'LOCK',
                kpiId: 'BLUEPRINT',
                kpiName: `Locked with ${blueprint.kpis.length} KPIs`,
                changedBy: user.userId,
                changedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            blueprint: locked,
            message: `Blueprint finalized with ${blueprint.kpis.length} KPIs`,
        });
    } catch (error) {
        console.error('Finalize blueprint error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
