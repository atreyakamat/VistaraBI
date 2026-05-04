import { NextRequest, NextResponse } from 'next/server';
import { buildRateLimitHeaders, checkRateLimit, getIdentifier, RATE_LIMITS, type RateLimitConfig } from '@/lib/security/rate-limiter';

function getRateLimitConfig(pathname: string): RateLimitConfig {
    if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
        return RATE_LIMITS.AUTH;
    }
    if (
        pathname.startsWith('/api/v1/forecast') ||
        pathname.startsWith('/api/v1/module-8/chat') ||
        pathname.startsWith('/api/projects/') && pathname.includes('/ask-ai')
    ) {
        return RATE_LIMITS.AI;
    }
    return RATE_LIMITS.API;
}

export function middleware(request: NextRequest) {
    try {
        const { pathname } = request.nextUrl;

        // ─── Rate Limiting ───
        // Apply Rate Limiting to sensitive routes using the centralized utility
        if (pathname.startsWith('/api') || pathname.startsWith('/login') || pathname.startsWith('/register')) {
            const config = getRateLimitConfig(pathname);
            const rl = checkRateLimit(getIdentifier(request), config);
            
            if (!rl.success) {
                return NextResponse.json(
                    { error: 'Too many requests. Please wait before retrying.' },
                    { status: 429, headers: buildRateLimitHeaders(rl) }
                );
            }
        }

        const token = request.cookies.get('vistarabi-token')?.value;

        // Protected routes that require authentication
        if (pathname.startsWith('/app')) {
            if (!token) {
                return NextResponse.redirect(new URL('/login', request.url));
            }
        }

        // Redirect authenticated users away from auth pages
        if (pathname === '/login' || pathname === '/register') {
            if (token) {
                return NextResponse.redirect(new URL('/app', request.url));
            }
            // For demo mode without database, redirect login to demo
            // Gracefully handle missing environment variables
            const dbUrl = process.env.DATABASE_URL || '';
            if (process.env.DEMO_MODE === 'true' || !dbUrl.includes('localhost:5432')) {
                const response = NextResponse.next();
                response.headers.set('X-Demo-Mode', 'true');
                return response;
            }
        }

        // Add security headers to every response
        const response = NextResponse.next();
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        
        return response;
    } catch (error) {
        console.error('Middleware error:', error);
        // Fallback to allowing the request if middleware fails, to avoid 500ing the whole app
        return NextResponse.next();
    }
}

export const config = {
    matcher: ['/app/:path*', '/api/:path*', '/login', '/register'],
    // Allow larger body size for file uploads
    api: {
        bodyParser: {
            sizeLimit: '100mb',
        },
    },
};
