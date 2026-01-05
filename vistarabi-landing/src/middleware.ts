import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('vistarabi-token')?.value;
    const { pathname } = request.nextUrl;

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

    return NextResponse.next();
}

export const config = {
    matcher: ['/app/:path*', '/login', '/register'],
};
