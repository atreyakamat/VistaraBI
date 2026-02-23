'use client';

// Module 5A — Skeleton Loader (Glassmorphism)
// Stage 1 rendering target: <400ms. Glass-card shapes with shimmer.

export function SkeletonLoader() {
    return (
        <div className="space-y-8">
            {/* KPI Grid Skeleton (2×2) */}
            <div className="dashboard-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton rounded-2xl p-6" style={{ minHeight: '280px' }}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="skeleton h-3 w-24 rounded mb-3" style={{ background: 'rgba(203,213,225,0.5)' }} />
                                <div className="skeleton h-8 w-32 rounded" style={{ background: 'rgba(203,213,225,0.5)' }} />
                            </div>
                            <div className="skeleton h-6 w-16 rounded-lg" style={{ background: 'rgba(203,213,225,0.5)' }} />
                        </div>
                        <div className="skeleton h-28 w-full rounded-xl mt-6" style={{ background: 'rgba(203,213,225,0.3)' }} />
                    </div>
                ))}
            </div>

            {/* AI Insights Skeleton */}
            <div className="skeleton rounded-2xl p-8" style={{ minHeight: '200px' }}>
                <div className="flex items-center gap-4 mb-6">
                    <div className="skeleton w-12 h-12 rounded-full" style={{ background: 'rgba(203,213,225,0.5)' }} />
                    <div>
                        <div className="skeleton h-5 w-40 rounded mb-2" style={{ background: 'rgba(203,213,225,0.5)' }} />
                        <div className="skeleton h-3 w-64 rounded" style={{ background: 'rgba(203,213,225,0.4)' }} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="skeleton h-24 rounded-xl" style={{ background: 'rgba(203,213,225,0.3)' }} />
                    ))}
                </div>
            </div>

            {/* Chart Grid Skeleton */}
            <div className="dashboard-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-[320px] rounded-2xl" />
                ))}
            </div>
        </div>
    );
}
