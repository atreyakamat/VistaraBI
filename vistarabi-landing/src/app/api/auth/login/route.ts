import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, signToken, setAuthCookie } from '@/lib/auth';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter';
import prisma from '@/lib/prisma';

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

        // Check if database is available
        if (!prisma) {
            return NextResponse.json(
                { 
                  error: 'Authentication service unavailable',
                  message: 'Database connection required. Please ensure PostgreSQL is running on localhost:5432',
                  mode: 'demo',
                  note: 'Demo dashboards are available at /demo without authentication'
                },
                { status: 503 }
            );
        }

        // Find user
        let user;
        try {
          user = await prisma.user.findUnique({
              where: { email },
          }) as { id: string; name: string; email: string; password: string } | null;
        } catch (dbError: any) {
          if (dbError.code === 'P1000' || dbError.code === 'P1001' || dbError.message?.toLowerCase().includes('connection') || dbError.message?.toLowerCase().includes('reach database')) {
            return NextResponse.json(
                { 
                  error: 'Database connection failed',
                  message: 'PostgreSQL is not running on localhost:5432. Demo dashboards are available at /demo without authentication',
                  mode: 'demo'
                },
                { status: 503 }
            );
          }
          throw dbError;
        }

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
          return NextResponse.json(
              { 
                error: 'Database connection failed',
                message: 'PostgreSQL is not running. Demo dashboards available at /demo',
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
