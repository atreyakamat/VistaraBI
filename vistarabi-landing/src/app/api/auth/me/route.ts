import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    try {
        const payload = await getCurrentUser();

        if (!payload) {
            // Demo mode fallback: return mock user if no DB configured
            const isDemoMode = process.env.DEMO_MODE === 'true' || !process.env.DATABASE_URL;
            if (isDemoMode) {
                return NextResponse.json({
                    user: {
                        id: 'demo-user-001',
                        name: 'Demo User',
                        email: 'demo@vistarabi.com',
                        preferences: { aiMode: 'auto' },
                        createdAt: new Date().toISOString(),
                    },
                    demo: true,
                });
            }
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
                id: true,
                name: true,
                email: true,
                preferences: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ user });
    } catch (error: any) {
        console.error('Get me error:', error);

        // Handle database connection errors gracefully
        if (
          error?.code === 'P1000' || 
          error?.code === 'P1001' || 
          error?.message?.toLowerCase().includes('connect') ||
          error?.message?.toLowerCase().includes('reach database')
        ) {
            return NextResponse.json(
                { error: 'Authentication service partially unavailable', detail: 'Database connection failed' },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
