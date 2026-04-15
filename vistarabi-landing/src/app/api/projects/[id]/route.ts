import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/projects/[id] - Get project details
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
        console.log('[API] Fetching project:', id);
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            console.log('[API] Project not found:', id);
            // Debug: List all projects for this user
            const allProjects = await db.project.findMany({ where: { userId: user.userId } });
            console.log('[API] Available projects:', allProjects.map(p => ({ id: p.id, name: p.name })));

            return NextResponse.json({
                error: 'Project not found',
                message: 'This project may have been deleted or the server was restarted. The in-memory database loses data on restart. Please create a new project.'
            }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get sources for this project
        const sources = await db.source.findMany({
            where: { projectId: id },
            include: { cleanedDataset: true }
        });

        return NextResponse.json({ project, sources });
    } catch (error) {
        console.error('Get project error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
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

        await db.project.delete({ where: { id } });

        return NextResponse.json({ message: 'Project deleted' });
    } catch (error) {
        console.error('Delete project error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
