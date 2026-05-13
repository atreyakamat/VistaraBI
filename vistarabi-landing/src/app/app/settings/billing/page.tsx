'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function BillingPage() {
    return (
        <div className="min-h-screen bg-[var(--background)]">
            <header className="border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/app/projects" className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-sm font-medium">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Projects
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-[var(--foreground)]">Platform Access</h1>
                    <p className="text-[var(--muted-foreground)] mt-1">Manage your VistaraBI usage and access</p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <span className="material-symbols-outlined text-9xl text-emerald-600">volunteer_activism</span>
                    </div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-4">
                            Open Source
                        </div>
                        <h2 className="text-xl font-bold text-emerald-950 mb-2">VistaraBI is Completely Free</h2>
                        <p className="text-emerald-800 max-w-xl leading-relaxed mb-6">
                            We believe advanced business intelligence should be accessible to all. There are no pricing tiers, paywalls, or feature limits. You have full access to all platform capabilities.
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-emerald-800 font-medium">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                Unlimited AI-driven Data Processing
                            </div>
                            <div className="flex items-center gap-2 text-emerald-800 font-medium">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                Unlimited Dashboard & PDF Generation
                            </div>
                            <div className="flex items-center gap-2 text-emerald-800 font-medium">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                Advanced Predictive Forecasting
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="text-center text-sm text-[var(--muted-foreground)] mt-12 border-t border-[var(--border)] pt-8">
                    <p>
                        Enjoying VistaraBI? Consider contributing to the project on GitHub.
                    </p>
                </div>
            </main>
        </div>
    );
}