import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import { discoverKPIs, getKPIDiscovery } from '@/lib/kpi';
import { getGovernedDomain } from '@/lib/domain/governance';

// GET /api/projects/[id]/kpis - Get discovered KPIs
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

        const discovery = await getKPIDiscovery(id);

        if (!discovery) {
            return NextResponse.json({
                discovery: null,
                message: 'KPI discovery not yet run'
            });
        }

        return NextResponse.json({ discovery });
    } catch (error) {
        console.error('Get KPIs error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/projects/[id]/kpis - Trigger KPI discovery
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

        // Check domain is set
        const governance = await getGovernedDomain(id);
        if (!governance?.activeDomain) {
            return NextResponse.json({
                error: 'Project domain must be set before KPI discovery',
            }, { status: 400 });
        }

        console.log('[API] Running KPI discovery for project:', id);
        const discovery = await discoverKPIs(id);

        if (!discovery) {
            return NextResponse.json({
                error: 'KPI discovery failed - check server logs',
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            discovery,
            message: `Found ${discovery.computableKPIs.length} computable KPIs`
        });
    } catch (error) {
        console.error('KPI discovery error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
