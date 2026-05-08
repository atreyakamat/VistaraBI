import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';

// GET /api/projects - List all projects for current user
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            // Demo mode fallback: return empty projects list
            const isDemoMode = process.env.DEMO_MODE === 'true' || !process.env.DATABASE_URL;
            if (isDemoMode) {
                return apiSuccess({ projects: [], demo: true });
            }
            return apiError('UNAUTHORIZED', 'Not authenticated');
        }

        const projects = await db.project.findMany({
            where: { userId: user.userId },
        });

        return apiSuccess({ projects });
    } catch (error: any) {
        console.error('Get projects error:', error);
        // Handle DB connection errors gracefully in demo mode
        const isDemoMode = process.env.DEMO_MODE === 'true' || !process.env.DATABASE_URL;
        if (isDemoMode || error?.code === 'P1001' || error?.message?.includes('connect')) {
            return apiSuccess({ projects: [], demo: true });
        }
        return apiError('INTERNAL_ERROR', 'Failed to fetch projects');
    }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return apiError('UNAUTHORIZED', 'Not authenticated');
        }

        const body = await request.json();
        const { name, description } = body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return apiError('VALIDATION_ERROR', 'Project name is required');
        }

        const project = await db.project.create({
            data: {
                userId: user.userId,
                name: name.trim(),
                description: description?.trim(),
            },
        });

        return apiSuccess({ project }, 201);
    } catch (error) {
        console.error('Create project error:', error);
        return apiError('INTERNAL_ERROR', 'Failed to create project');
    }
}
