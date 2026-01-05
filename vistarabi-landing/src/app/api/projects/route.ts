import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/projects - List all projects for current user
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const projects = await db.project.findMany({
            where: { userId: user.userId },
        });

        return NextResponse.json({ projects });
    } catch (error) {
        console.error('Get projects error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const body = await request.json();
        const { name, description } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
        }

        const project = await db.project.create({
            data: {
                userId: user.userId,
                name: name.trim(),
                description: description?.trim(),
            },
        });

        return NextResponse.json({ project }, { status: 201 });
    } catch (error) {
        console.error('Create project error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
