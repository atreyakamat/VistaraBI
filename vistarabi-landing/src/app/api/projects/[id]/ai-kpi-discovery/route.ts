import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import { runAIKPIDiscovery, getAIKPIProposals, updateProposalStatus } from '@/lib/kpi/ai-kpi-discovery';

// GET /api/projects/[id]/ai-kpi-discovery - Get AI KPI proposals
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const proposals = await getAIKPIProposals(id);

        return NextResponse.json({
            proposals,
            count: proposals.length,
            summary: {
                invented: proposals.filter(p => p.sourceType === 'AI_INVENTED').length,
                derived: proposals.filter(p => p.sourceType === 'LIBRARY_DERIVED').length,
                pending: proposals.filter(p => p.status === 'PENDING').length,
                approved: proposals.filter(p => p.status === 'APPROVED').length,
            },
        });
    } catch (error) {
        console.error('Get AI KPI proposals error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/projects/[id]/ai-kpi-discovery - Run AI KPI discovery
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        console.log('[API] Running AI KPI Discovery for project:', id);

        const result = await runAIKPIDiscovery(id);

        console.log('[API] Discovery result:', {
            proposalCount: result.proposals.length,
            invented: result.inventedCount,
            derived: result.derivedCount,
        });

        return NextResponse.json({
            success: true,
            proposals: result.proposals,
            inventedCount: result.inventedCount,
            derivedCount: result.derivedCount,
            debug: result.debug,
            message: `Discovered ${result.proposals.length} AI KPI proposals (${result.inventedCount} invented, ${result.derivedCount} from library)`,
        });
    } catch (error) {
        console.error('AI KPI Discovery error:', error);
        return NextResponse.json({ error: 'Discovery failed' }, { status: 500 });
    }
}

// PATCH /api/projects/[id]/ai-kpi-discovery - Update proposal status
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { proposalId, status } = body;

        if (!proposalId || !['APPROVED', 'REJECTED', 'MODIFIED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const project = await db.project.findUnique({ where: { id } });
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }
        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const updated = await updateProposalStatus(proposalId, status, user.userId);

        if (!updated) {
            return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            proposal: updated,
        });
    } catch (error) {
        console.error('Update proposal error:', error);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}
