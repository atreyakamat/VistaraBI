import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
        return apiError('VALIDATION_ERROR', 'Verification token is required');
    }

    try {
        const user = await prisma.user.findUnique({
            where: { emailVerifyToken: token },
        });

        if (!user) {
            return apiError('NOT_FOUND', 'Invalid or expired verification token');
        }

        // Mark as verified and clear token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: new Date(),
                emailVerifyToken: null,
            },
        });

        // Redirect to login with success message
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return NextResponse.redirect(`${appUrl}/login?verified=1`);
    } catch (error) {
        console.error('[verify-email] error:', error);
        return apiError('INTERNAL_ERROR', 'Verification failed');
    }
}
