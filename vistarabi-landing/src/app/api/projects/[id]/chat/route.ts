import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: projectId } = await params;
        const project = await db.project.findUnique({
            where: { id: projectId, userId: user.userId as string },
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const messages = await db.projectChatMessage.findMany({
            where: { projectId, module: 'module-6' },
            orderBy: { createdAt: 'asc' },
            take: 100, // Fetch last 100 messages
        });

        return NextResponse.json({ messages });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[chat] GET error:', message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
