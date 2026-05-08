'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[VistaraBI Error]', error);
    }, [error]);

    return (
        <html lang="en">
            <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#0f172a' }}>
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                }}>
                    <div style={{
                        maxWidth: '480px',
                        width: '100%',
                        textAlign: 'center',
                        color: '#f1f5f9',
                    }}>
                        {/* Icon */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '24px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 2rem',
                            fontSize: '2rem',
                        }}>
                            ⚡
                        </div>

                        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: '#f8fafc' }}>
                            Something went wrong
                        </h1>
                        <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: '2rem' }}>
                            VistaraBI encountered an unexpected error. Your data is safe — this was likely a temporary issue.
                        </p>

                        {error.digest && (
                            <div style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '0.75rem 1rem',
                                marginBottom: '2rem',
                                fontSize: '0.75rem',
                                color: '#64748b',
                                fontFamily: 'monospace',
                            }}>
                                Error ID: {error.digest}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                                onClick={reset}
                                style={{
                                    padding: '0.875rem 2rem',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                }}
                            >
                                Try again
                            </button>
                            <a
                                href="/app"
                                style={{
                                    padding: '0.875rem 2rem',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#e2e8f0',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    textDecoration: 'none',
                                    display: 'inline-block',
                                }}
                            >
                                Go to Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
