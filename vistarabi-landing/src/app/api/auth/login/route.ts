import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, signToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
    // Rate limit: 10 login attempts per minute per IP
    const rl = checkRateLimit(getIdentifier(request, undefined, 'login'), RATE_LIMITS.AUTH);
    const rlHeaders = buildRateLimitHeaders(rl);
    if (!rl.success) {
        return NextResponse.json(
            { error: 'Too many login attempts. Please wait and try again.' },
            { status: 429, headers: rlHeaders }
        );
    }

    try {
        const body = await request.json();
        const { email, password } = body;

        // Validate inputs
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        }) as { id: string; name: string; email: string; password: string } | null;

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Compare password
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Create JWT and set cookie
        const token = signToken({ userId: user.id, email: user.email });
        await setAuthCookie(token);

        return NextResponse.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
