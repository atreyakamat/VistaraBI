import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, signToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { apiError, apiSuccess } from '@/lib/api-response';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    // Rate limit: 10 login attempts per minute per IP
    const rl = checkRateLimit(getIdentifier(request, undefined, 'login'), RATE_LIMITS.AUTH);
    const rlHeaders = buildRateLimitHeaders(rl);
    if (!rl.success) {
        return apiError('RATE_LIMITED', 'Too many login attempts. Please wait and try again.');
    }

    try {
        const body = await request.json();
        const { email, password } = body;

        // Validate inputs
        if (!email || !password) {
            return apiError('VALIDATION_ERROR', 'Email and password are required');
        }

        // Check if database is available
        if (!prisma) {
            return apiError('SERVICE_UNAVAILABLE', 'Database connection required. Please ensure PostgreSQL is running.', 503, {
                mode: 'demo',
                note: 'Demo dashboards are available at /demo without authentication'
            });
        }

        // Find user
        let user;
        try {
          user = await prisma.user.findUnique({
              where: { email },
          });
        } catch (dbError: any) {
          if (dbError.code === 'P1000' || dbError.code === 'P1001' || dbError.message?.toLowerCase().includes('connection') || dbError.message?.toLowerCase().includes('reach database')) {
            return apiError('SERVICE_UNAVAILABLE', 'Database connection failed. Demo dashboards are available at /demo.', 503, { mode: 'demo' });
          }
          throw dbError;
        }

        if (!user) {
            return apiError('UNAUTHORIZED', 'Invalid email or password');
        }

        // Compare password
        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            return apiError('UNAUTHORIZED', 'Invalid email or password');
        }

        // Check if email is verified
        if (!user.emailVerified) {
            return apiError('UNAUTHORIZED', 'Please verify your email before logging in. Check your inbox for a verification link.', 403, {
                requiresVerification: true,
                email: user.email,
            });
        }

        // Create JWT and set cookie
        const token = signToken({ userId: user.id, email: user.email });
        await setAuthCookie(token);

        return apiSuccess({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error: any) {
        console.error('Login error:', error);
        
        // Check if it's a database connection error
        if (
          error?.code === 'P1000' || 
          error?.code === 'P1001' || 
          error?.message?.toLowerCase().includes('econnrefused') || 
          error?.message?.toLowerCase().includes('connect') ||
          error?.message?.toLowerCase().includes('reach database')
        ) {
          return apiError('SERVICE_UNAVAILABLE', 'Database connection failed. Demo dashboards available at /demo', 503, { mode: 'demo' });
        }
        
        return apiError('INTERNAL_ERROR', 'Login failed');
    }
}
