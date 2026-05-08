import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '404 — Page Not Found | VistaraBI',
    description: 'The page you were looking for could not be found.',
};

export default function NotFound() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            padding: '2rem',
            fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', color: '#f1f5f9' }}>
                {/* Glowing 404 */}
                <div style={{
                    fontSize: '8rem',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    lineHeight: 1,
                    marginBottom: '1.5rem',
                    letterSpacing: '-4px',
                }}>
                    404
                </div>

                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#f8fafc' }}>
                    This page doesn't exist
                </h1>
                <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: '2.5rem' }}>
                    The page you're looking for may have been moved, deleted, or never existed. 
                    Head back to your dashboard to continue.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link href="/app" style={{
                        padding: '0.875rem 2rem',
                        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                        color: 'white',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        textDecoration: 'none',
                        display: 'inline-block',
                    }}>
                        Go to Dashboard
                    </Link>
                    <Link href="/" style={{
                        padding: '0.875rem 2rem',
                        background: 'rgba(255,255,255,0.08)',
                        color: '#e2e8f0',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        textDecoration: 'none',
                        display: 'inline-block',
                    }}>
                        Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
