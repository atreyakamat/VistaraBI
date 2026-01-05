import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import { getDomainDetection, manuallySelectDomain, DomainType } from '@/lib/domain';
import { getGovernedDomain } from '@/lib/domain/governance';

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

        // Get governed domain (authoritative)
        const governed = await getGovernedDomain(id);

        // Get detection metadata
        const detection = await getDomainDetection(id);

        if (!detection && !governed) {
            return NextResponse.json({
                domain: null,
                message: 'Domain detection not yet run for this project'
            });
        }

        // Construct response combining authoritative domain with detection context
        const responseData = {
            ...detection,
            detectedDomain: governed?.activeDomain || detection?.detectedDomain || null,
            status: governed ? governed.governanceStatus : (detection?.status || 'MANUAL_REQUIRED'),
            confidence: detection?.confidence || 0,
            // If governed manually, the confidence is high
            ...(governed?.governanceStatus === 'MANUAL' || governed?.governanceStatus === 'LOCKED' ? { confidence: 100 } : {})
        };

        return NextResponse.json({ domain: responseData });
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
        const validDomains: (DomainType | string)[] = [
            'ECOMMERCE', 'SAAS', 'EDTECH', 'RETAIL',
            'SERVICES', 'MANUFACTURING', 'HEALTHCARE', 'FINANCE'
        ];

        if (!validDomains.includes(selectedDomain)) {
            return NextResponse.json({ error: 'Invalid domain type' }, { status: 400 });
        }

        console.log('[API] Manually selecting domain:', selectedDomain, 'for project:', id);

        // Use the new manuallySelectDomain helper which also initializes governance
        const result = await manuallySelectDomain(id, selectedDomain as DomainType);

        return NextResponse.json({
            success: true,
            domain: result
        });
    } catch (error) {
        console.error('Select domain error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
