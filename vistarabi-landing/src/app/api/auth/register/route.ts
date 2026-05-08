import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, signToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { sendEmail, welcomeEmail, verificationEmail } from '@/lib/email';
import { apiError, apiSuccess } from '@/lib/api-response';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
    // Rate limit: 5 registrations per minute per IP
    const rl = checkRateLimit(getIdentifier(request, undefined, 'register'), RATE_LIMITS.REGISTER);
    const rlHeaders = buildRateLimitHeaders(rl);
    if (!rl.success) {
        return apiError('RATE_LIMITED', 'Too many registration attempts. Please try again later.');
    }

    try {
        const body = await request.json();
        const { name, email, password } = body;

        // Validate inputs
        if (!name || !email || !password) {
            return apiError('VALIDATION_ERROR', 'Name, email, and password are required');
        }

        if (password.length < 8) {
            return apiError('VALIDATION_ERROR', 'Password must be at least 8 characters');
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return apiError('CONFLICT', 'User with this email already exists');
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const emailVerifyToken = randomUUID();
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                emailVerifyToken,
                emailVerified: null,
            },
        });

        // Create JWT and set cookie
        const token = signToken({ userId: user.id, email: user.email });
        await setAuthCookie(token);

        // Send verification email (non-blocking)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vistarabi.com';
        const verifyUrl = `${appUrl}/api/auth/verify-email?token=${emailVerifyToken}`;
        sendEmail({
            to: user.email,
            subject: 'Verify your VistaraBI email',
            html: verificationEmail(verifyUrl, user.name),
        }).catch(err => console.error('[register] verification email failed:', err));

        // Send welcome email (non-blocking — don't await in the response path)
        sendEmail({
            to: user.email,
            subject: 'Welcome to VistaraBI 🎉',
            html: welcomeEmail(user.name),
        }).catch(err => console.error('[register] welcome email failed:', err));

        return apiSuccess({
            message: 'User created successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        }, 201);
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
            return apiError('SERVICE_UNAVAILABLE', 'Database connection failed. Please ensure PostgreSQL is running.', 503, { mode: 'demo' });
        }

        return apiError('INTERNAL_ERROR', 'Registration failed. Please try again.');
    }
}
