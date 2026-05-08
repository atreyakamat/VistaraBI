'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DemoCTABannerProps {
    demoDomain?: string;
}

/**
 * Sticky CTA banner shown on all /demo/* pages.
 * Converts demo viewers to registered users.
 */
export function DemoCTABanner({ demoDomain }: DemoCTABannerProps) {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Show banner after 5 seconds of demo engagement
        const timer = setTimeout(() => setVisible(true), 5000);
        return () => clearTimeout(timer);
    }, []);

    if (!visible || dismissed) return null;

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-[500] p-4"
            style={{ animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}
        >
            <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div
                className="max-w-4xl mx-auto rounded-2xl flex items-center gap-4 px-6 py-4 shadow-2xl"
                style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
                    border: '1px solid rgba(99,102,241,0.4)',
                    backdropFilter: 'blur(20px)',
                }}
            >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 text-xl">
                    📊
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm leading-tight">
                        Analyzing your {demoDomain ?? 'business'} data? Do it with your own files.
                    </p>
                    <p className="text-indigo-300 text-xs mt-0.5 leading-relaxed">
                        Upload a CSV and get a full AI dashboard like this — free, in under 5 minutes.
                    </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    <Link
                        href="/register"
                        className="px-4 py-2 bg-white text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors whitespace-nowrap"
                    >
                        Try Free →
                    </Link>
                    <Link
                        href="/login"
                        className="px-4 py-2 bg-indigo-500/20 text-indigo-200 rounded-xl font-bold text-sm hover:bg-indigo-500/30 transition-colors whitespace-nowrap border border-indigo-500/30"
                    >
                        Sign In
                    </Link>
                </div>

                {/* Dismiss */}
                <button
                    onClick={() => setDismissed(true)}
                    className="text-indigo-400 hover:text-white transition-colors shrink-0 ml-1"
                    aria-label="Dismiss"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}
