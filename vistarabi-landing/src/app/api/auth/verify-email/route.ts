import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { apiError, apiSuccess } from '@/lib/api-response';

/**
 * GET /api/auth/verify-email?token=<emailVerifyToken>
 * 
 * Verifies a user's email by token and redirects to /verify-email?success=1
 * This is the endpoint called from the verification email link
 */
export async function GET(request: NextRequest) {
    try {
        const token = request.nextUrl.searchParams.get('token');

        if (!token) {
            return NextResponse.redirect(new URL('/verify-email?error=missing-token', request.url));
        }

        // Find user by verification token
        const user = await prisma.user.findUnique({
            where: { emailVerifyToken: token },
        });

        if (!user) {
            return NextResponse.redirect(new URL('/verify-email?error=invalid-token', request.url));
        }

        if (user.emailVerified) {
            // Already verified
            return NextResponse.redirect(new URL('/verify-email?already=1', request.url));
        }

        // Mark email as verified and clear the token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: new Date(),
                emailVerifyToken: null,
            },
        });

        // Redirect to verification success page
        return NextResponse.redirect(new URL('/verify-email?success=1', request.url));
    } catch (error) {
        console.error('[verify-email] Error:', error);
        return NextResponse.redirect(new URL('/verify-email?error=server', request.url));
    }
}
