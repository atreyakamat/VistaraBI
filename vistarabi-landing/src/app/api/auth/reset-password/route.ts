import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

// POST /api/auth/reset-password
export async function POST(request: NextRequest) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        // Find valid, non-expired token
        const resetToken = await db.passwordResetToken.findUnique({ where: { token } });

        if (!resetToken || resetToken.expiresAt < new Date()) {
            return NextResponse.json({ error: 'Reset link is invalid or has expired' }, { status: 400 });
        }

        // Hash new password and update user
        const hashed = await hashPassword(password);
        await db.user.update({
            where: { id: resetToken.userId },
            data: { password: hashed },
        });

        // Delete the token (single-use)
        await db.passwordResetToken.delete({ where: { token } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[ResetPassword] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
