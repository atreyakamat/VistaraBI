// GET /api/share/[token] — fetch public project data for shared dashboard view
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params;

    const project = await prisma.project.findUnique({
        where: { shareToken: token },
        select: {
            id: true,
            name: true,
            description: true,
            shareTokenExpiresAt: true,
            domainDetection: {
                select: { detectedDomain: true, confidence: true },
            },
            dashboardConfig: {
                select: { sections: true, metadata: true, version: true },
            },
        },
    });

    if (!project) {
        return NextResponse.json({ error: 'Share link not found or has been revoked' }, { status: 404 });
    }

    // Check expiry
    if (project.shareTokenExpiresAt && new Date() > project.shareTokenExpiresAt) {
        return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
    }

    return NextResponse.json({
        projectId: project.id,
        projectName: project.name,
        description: project.description,
        domain: project.domainDetection?.detectedDomain ?? 'GENERAL',
        domainConfidence: project.domainDetection?.confidence ?? 0,
        dashboardConfig: project.dashboardConfig,
        expiresAt: project.shareTokenExpiresAt,
        isReadOnly: true,
    });
}
