import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getIdentifier, RATE_LIMITS } from '@/lib/security/rate-limiter';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const ip = request.ip || 'unknown';

    // ─── Rate Limiting ───
    // Apply Rate Limiting to sensitive routes using the centralized utility
    if (pathname.startsWith('/api') || pathname.startsWith('/login') || pathname.startsWith('/register')) {
        const config = pathname.startsWith('/api/v1/forecast') ? { limit: 20, windowMs: 60000 } : RATE_LIMITS.API;
        const rl = checkRateLimit(getIdentifier(request), config);
        
        if (!rl.success) {
            return new NextResponse('Too many requests. Please wait a minute.', { status: 429 });
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
    }

    // Add security headers to every response
    const response = NextResponse.next();
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
}

export const config = {
    matcher: ['/app/:path*', '/api/:path*', '/login', '/register'],
};
