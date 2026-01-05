import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import { getDomainDetection, manuallySelectDomain, DomainType } from '@/lib/domain';

// GET /api/projects/[id]/domain - Get current domain detection result
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

        const domain = await getDomainDetection(id);

        if (!domain) {
            return NextResponse.json({
                domain: null,
                message: 'Domain detection not yet run for this project'
            });
        }

        return NextResponse.json({ domain });
    } catch (error) {
        console.error('Get domain error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/projects/[id]/domain - Manually select domain
export async function PUT(
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
        const { domain: selectedDomain } = body;

        if (!selectedDomain) {
            return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
        }

        // Validate domain type
        const validDomains: DomainType[] = [
            'ECOMMERCE', 'SAAS', 'EDTECH', 'RETAIL',
            'SERVICES', 'MANUFACTURING', 'HEALTHCARE', 'FINANCE'
        ];

        if (!validDomains.includes(selectedDomain)) {
            return NextResponse.json({ error: 'Invalid domain type' }, { status: 400 });
        }

        console.log('[API] Manually selecting domain:', selectedDomain, 'for project:', id);
        const result = await manuallySelectDomain(id, selectedDomain);

        return NextResponse.json({
            success: true,
            domain: result
        });
    } catch (error) {
        console.error('Select domain error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
