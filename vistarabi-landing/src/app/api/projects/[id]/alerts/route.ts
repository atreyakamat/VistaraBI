import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/projects/[id]/alerts - Get webhook/email alert settings
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id: projectId } = await params;
        const project = await db.project.findUnique({ where: { id: projectId } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const config = await db.dashboardConfig.findUnique({
            where: { projectId },
        });

        if (!config) {
            return NextResponse.json({
                settings: { enabled: false, thresholdPercent: 15 }
            });
        }

        const metadata = (config.metadata || {}) as Record<string, any>;
        const settings = metadata.alertSettings || { enabled: false, thresholdPercent: 15 };

        return NextResponse.json({ settings });
    } catch (error) {
        console.error('[Alert Settings GET] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/projects/[id]/alerts - Update webhook/email alert settings
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id: projectId } = await params;
        const project = await db.project.findUnique({ where: { id: projectId } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const body = await request.json();
        const { slackWebhookUrl, notificationEmail, thresholdPercent, enabled } = body;

        const config = await db.dashboardConfig.findUnique({
            where: { projectId },
        });

        if (!config) {
            return NextResponse.json({ error: 'Dashboard not yet configured' }, { status: 404 });
        }

        const metadata = (config.metadata || {}) as Record<string, any>;
        const updatedMetadata = {
            ...metadata,
            alertSettings: {
                slackWebhookUrl: slackWebhookUrl || '',
                notificationEmail: notificationEmail || '',
                thresholdPercent: typeof thresholdPercent === 'number' ? thresholdPercent : 15,
                enabled: !!enabled,
                lastAlertSentAt: metadata.alertSettings?.lastAlertSentAt || {},
            }
        };

        await db.dashboardConfig.update({
            where: { projectId },
            data: {
                metadata: updatedMetadata as any
            }
        });

        return NextResponse.json({
            success: true,
            settings: updatedMetadata.alertSettings
        });
    } catch (error: any) {
        console.error('[Alert Settings PUT] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
