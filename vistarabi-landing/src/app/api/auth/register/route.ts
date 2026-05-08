import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { sendEmail, welcomeEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    // Rate limit: 5 registrations per minute per IP
    const rl = checkRateLimit(getIdentifier(request, undefined, 'register'), RATE_LIMITS.REGISTER);
    const rlHeaders = buildRateLimitHeaders(rl);
    if (!rl.success) {
        return NextResponse.json(
            { error: 'Too many registration attempts. Please try again later.' },
            { status: 429, headers: rlHeaders }
        );
    }

    try {
        const body = await request.json();
        const { name, email, password } = body;

        // Validate inputs
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Name, email, and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            );
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            );
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
        });

        // Create JWT and set cookie
        const token = signToken({ userId: user.id, email: user.email });
        await setAuthCookie(token);

        // Send welcome email (non-blocking — don't await in the response path)
        sendEmail({
            to: user.email,
            subject: 'Welcome to VistaraBI 🎉',
            html: welcomeEmail(user.name),
        }).catch(err => console.error('[register] welcome email failed:', err));

        return NextResponse.json(
            {
                message: 'User created successfully',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Register error:', error);
        
        // Handle database connection errors gracefully
        if (
          error?.code === 'P1000' || 
          error?.code === 'P1001' || 
          error?.message?.toLowerCase().includes('connect') ||
          error?.message?.toLowerCase().includes('reach database') ||
          error?.message?.toLowerCase().includes('econnrefused')
        ) {
            return NextResponse.json(
                { 
                  error: 'Registration service temporarily unavailable', 
                  message: 'Database connection failed. Please ensure PostgreSQL is running.',
                  mode: 'demo' 
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
