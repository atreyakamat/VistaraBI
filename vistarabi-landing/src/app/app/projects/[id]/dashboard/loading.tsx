export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-[var(--background)]">
            {/* Header skeleton */}
            <div className="h-16 border-b border-[var(--border)] bg-[var(--card)]/80 flex items-center px-6 gap-4">
                <div className="h-8 w-8 rounded-lg bg-[var(--border)] animate-pulse" />
                <div className="h-8 flex-1 max-w-xs bg-[var(--border)] rounded-xl animate-pulse" />
                <div className="ml-auto flex gap-3">
                    <div className="h-9 w-24 bg-[var(--border)] rounded-xl animate-pulse" />
                    <div className="h-9 w-20 bg-[var(--border)] rounded-xl animate-pulse" />
                </div>
            </div>
            {/* KPI grid skeleton */}
            <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-[var(--card)] rounded-2xl p-5 border border-[var(--border)] animate-pulse space-y-3">
                            <div className="h-3 w-20 bg-[var(--border)] rounded" />
                            <div className="h-8 w-32 bg-[var(--border)] rounded-lg" />
                            <div className="h-3 w-16 bg-[var(--border)]/60 rounded" />
                        </div>
                    ))}
                </div>
                {/* Chart skeleton */}
                <div className="bg-[var(--card)] rounded-3xl p-6 border border-[var(--border)] animate-pulse">
                    <div className="h-4 w-40 bg-[var(--border)] rounded mb-4" />
                    <div className="h-56 bg-[var(--border)]/30 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
