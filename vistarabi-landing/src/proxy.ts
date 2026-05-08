// VistaraBI — Next.js Proxy (Middleware)
// Handles: auth guard, rate limiting, security headers, demo mode
// This is the ONLY middleware file — middleware.ts must not exist alongside this.

import { NextRequest, NextResponse } from 'next/server';
import { buildRateLimitHeaders, checkRateLimit, getIdentifier, RATE_LIMITS, type RateLimitConfig } from '@/lib/security/rate-limiter';

const COOKIE_NAME = 'vistarabi-token';

// Routes that are always public (no auth required)
const PUBLIC_PREFIXES = [
    '/api/auth/',        // login, register, reset-password, change-password
    '/api/data/',        // demo data endpoints
    '/api/v1/ai/health', // AI health check
    '/api/share/',       // public shared dashboard data
    '/demo/',            // demo pages
    '/share/',           // share token pages
    '/_next/',
    '/favicon',
    '/robots',
    '/sitemap',
    '/manifest',
];

const PUBLIC_EXACT = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

function isPublic(pathname: string): boolean {
    if (PUBLIC_EXACT.includes(pathname)) return true;
    return PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

function getRateLimitConfig(pathname: string): RateLimitConfig {
    if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
        return RATE_LIMITS.AUTH;
    }
    if (
        pathname.startsWith('/api/v1/forecast') ||
        pathname.startsWith('/api/v1/module-8/chat') ||
        (pathname.startsWith('/api/projects/') && pathname.includes('/ask-ai'))
    ) {
        return RATE_LIMITS.AI;
    }
    return RATE_LIMITS.API;
}

// Simple JWT expiry check without full verification (Edge compatible — no crypto)
function isTokenLikelyValid(token: string): boolean {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (!payload.exp) return true; // no expiry = assume valid
        return Date.now() < payload.exp * 1000;
    } catch {
        return false;
    }
}

export function proxy(request: NextRequest) {
    const start = Date.now();

    function logRequest(status: number) {
        const ms = Date.now() - start;
        const { pathname } = request.nextUrl;
        // Only log API calls (pages are logged by Next.js itself)
        if (pathname.startsWith('/api/')) {
            const level = ms > 3000 ? 'SLOW' : ms > 1000 ? 'WARN' : 'INFO';
            console.log(`[${level}] ${request.method} ${pathname} → ${status} (${ms}ms)`);
        }
    }

    try {
        const { pathname } = request.nextUrl;

        // ─── Rate Limiting ───────────────────────────────────────────────────────
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

        // ─── Auth Guard ──────────────────────────────────────────────────────────
        if (!isPublic(pathname)) {
            const token = request.cookies.get(COOKIE_NAME)?.value;
            const isDemoMode = process.env.DEMO_MODE === 'true' || !process.env.DATABASE_URL;

            if (pathname.startsWith('/app') || pathname.startsWith('/api/projects') || pathname.startsWith('/api/v1')) {
                if (!token) {
                    if (isDemoMode && (pathname.startsWith('/app') || pathname.startsWith('/api/'))) {
                        // Demo mode: allow /app and /api access without token
                        const response = NextResponse.next();
                        response.headers.set('X-Demo-Mode', 'true');
                        response.cookies.set('vistarabi-demo', 'true', { path: '/', maxAge: 86400 });
                        return response;
                    }
                    if (pathname.startsWith('/api/')) {
                        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
                    }
                    const loginUrl = new URL('/login', request.url);
                    loginUrl.searchParams.set('redirect', pathname);
                    return NextResponse.redirect(loginUrl);
                }

                // Check token expiry (Edge-safe, no crypto)
                if (!isTokenLikelyValid(token)) {
                    if (pathname.startsWith('/api/')) {
                        return NextResponse.json({ error: 'Session expired' }, { status: 401 });
                    }
                    const loginUrl = new URL('/login', request.url);
                    loginUrl.searchParams.set('redirect', pathname);
                    loginUrl.searchParams.set('expired', '1');
                    const response = NextResponse.redirect(loginUrl);
                    response.cookies.delete(COOKIE_NAME);
                    return response;
                }
            }
        }

        // ─── Redirect authenticated users from auth pages ────────────────────────
        if (pathname === '/login' || pathname === '/register') {
            const token = request.cookies.get(COOKIE_NAME)?.value;
            if (token && isTokenLikelyValid(token)) {
                return NextResponse.redirect(new URL('/app', request.url));
            }
        }

        // ─── Security Headers ────────────────────────────────────────────────────
        const response = NextResponse.next();
        response.headers.set('X-Frame-Options', 'SAMEORIGIN'); // allow iframes for embed feature
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.headers.set('X-XSS-Protection', '1; mode=block');
        response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        return response;
    } catch (error) {
        console.error('[proxy] middleware error:', error);
        return NextResponse.next();
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sitemap.xml|opengraph-image.png).*)',
    ],
    api: {
        bodyParser: { sizeLimit: '100mb' },
    },
};
