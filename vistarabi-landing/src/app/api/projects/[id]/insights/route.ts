import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateDashboardInsights } from '@/lib/insights';

// GET /api/projects/[id]/insights — Global dashboard insights panel
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

        const insights = await generateDashboardInsights(id);

        return NextResponse.json({
            success: true,
            ...insights,
        });
    } catch (error) {
        console.error('Dashboard insights error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
