'use client';

// Module 5A — Skeleton Loader
// Stage 1 rendering target: <400ms

export function SkeletonLoader() {
    return (
        <div className="p-6 space-y-6 animate-fadeIn">
            {/* KPI Strip Skeleton */}
            <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton min-w-[200px] h-[100px] rounded-xl flex-shrink-0" />
                ))}
            </div>

            {/* Chart Grid Skeleton */}
            <div className="dashboard-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-[320px] rounded-xl" />
                ))}
            </div>
        </div>
    );
}
