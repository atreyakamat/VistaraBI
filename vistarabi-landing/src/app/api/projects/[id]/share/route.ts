// POST /api/projects/[id]/share — generate a signed share token
// GET  /api/projects/[id]/share — get current share settings

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';

// Share tokens expire after 30 days by default
const TOKEN_TTL_DAYS = 30;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, userId: true, shareToken: true, shareTokenExpiresAt: true },
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (project.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
        hasShareLink: !!project.shareToken,
        shareUrl: project.shareToken ? `${appUrl}/share/${project.shareToken}` : null,
        expiresAt: project.shareTokenExpiresAt,
    });
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    const body = await request.json().catch(() => ({}));
    const { action } = body; // 'generate' | 'revoke'

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, userId: true },
    });

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (project.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    if (action === 'revoke') {
        await prisma.project.update({
            where: { id: projectId },
            data: { shareToken: null, shareTokenExpiresAt: null },
        });
        return NextResponse.json({ revoked: true });
    }

    // Generate a new share token
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);

    await prisma.project.update({
        where: { id: projectId },
        data: { shareToken: token, shareTokenExpiresAt: expiresAt },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
        shareToken: token,
        shareUrl: `${appUrl}/share/${token}`,
        expiresAt,
    });
}
