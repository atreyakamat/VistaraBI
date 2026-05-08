// POST /api/auth/change-password
// Verifies currentPassword against stored hash, then updates to newPassword.
// Requires a valid JWT session cookie.

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, comparePassword, verifyToken, getAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        // Authenticate via the server cookie
        const token = await getAuthCookie();
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = verifyToken(token);
        if (!payload || !payload.userId) {
            return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Both currentPassword and newPassword are required.' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
        }

        // Fetch the user's current password hash
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, password: true },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Verify the current password
        const isValid = await comparePassword(currentPassword, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
        }

        // Hash and save the new password
        const hashed = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashed },
        });

        return NextResponse.json({ success: true, message: 'Password updated successfully.' });

    } catch (error: any) {
        console.error('[change-password]', error);
        return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
    }
}
