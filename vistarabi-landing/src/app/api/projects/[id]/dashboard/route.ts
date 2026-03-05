// Module 5A — Dashboard API Route
// GET: Retrieve existing dashboard config
// POST: Generate/regenerate dashboard config

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { generateDashboardConfig, getDashboardConfig } from '@/lib/dashboard';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const _authProject = await db.project.findUnique({ where: { id: id } });
        if (!_authProject || _authProject.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const config = await getDashboardConfig(id);

        if (!config) {
            return NextResponse.json(
                { error: 'Dashboard not yet generated. POST to generate.' },
                { status: 404 }
            );
        }

        return NextResponse.json(config);
    } catch (error) {
        console.error('Dashboard GET error:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve dashboard configuration' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const _authProject = await db.project.findUnique({ where: { id: id } });
        if (!_authProject || _authProject.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const config = await generateDashboardConfig(id);

        return NextResponse.json({
            message: `Dashboard generated with ${config.metadata.totalSections} sections and ${config.metadata.totalKPIs} KPIs`,
            ...config,
        });
    } catch (error) {
        console.error('Dashboard POST error:', error);
        return NextResponse.json(
            { error: 'Failed to generate dashboard configuration' },
            { status: 500 }
        );
    }
}
