import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
    try {
        const payload = await getCurrentUser();

        if (!payload) {
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
