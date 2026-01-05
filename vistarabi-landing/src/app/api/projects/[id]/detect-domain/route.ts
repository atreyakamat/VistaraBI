import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import { detectDomain } from '@/lib/domain';

// POST /api/projects/[id]/detect-domain - Run domain detection
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

        console.log('[API] Running domain detection for project:', id);
        const result = await detectDomain(id);

        return NextResponse.json({
            success: true,
            domain: result
        });
    } catch (error) {
        console.error('Domain detection error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
