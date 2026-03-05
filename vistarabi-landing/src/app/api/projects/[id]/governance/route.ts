import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import {
    getGovernedDomain,
    setGovernedDomain,
    lockDomain,
    unlockDomain,
    reevaluateDomain,
    getDomainHistory,
} from '@/lib/domain/governance';

// GET /api/projects/[id]/governance - Get governed domain and history
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

        const governed = await getGovernedDomain(id);
        const history = await getDomainHistory(id);

        return NextResponse.json({
            governance: governed,
            history,
        });
    } catch (error) {
        console.error('Get governance error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/projects/[id]/governance - Governance actions (set, lock, unlock, reevaluate)
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

        const body = await request.json();
        const { action, domain, reason } = body;

        let result;

        switch (action) {
            case 'set':
                if (!domain) {
                    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
                }
                result = await setGovernedDomain({
                    projectId: id,
                    domain,
                    userId: user.userId,
                    reason: reason || 'Manually selected domain',
                });
                break;

            case 'lock':
                result = await lockDomain({
                    projectId: id,
                    userId: user.userId,
                    reason: reason || 'Locked to prevent auto-reclassification',
                });
                break;

            case 'unlock':
                result = await unlockDomain({
                    projectId: id,
                    userId: user.userId,
                    reason: reason || 'Unlocked for re-evaluation',
                });
                break;

            case 'reevaluate':
                result = await reevaluateDomain(id, user.userId);
                break;

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            governance: result,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Governance action error:', error);
        return NextResponse.json({
            error: message || 'Internal server error'
        }, { status: 500 });
    }
}
