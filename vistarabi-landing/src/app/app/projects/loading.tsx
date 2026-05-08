export default function ProjectsLoading() {
    return (
        <div className="min-h-screen bg-[var(--background)] p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header skeleton */}
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-[var(--border)] rounded-xl animate-pulse" />
                        <div className="h-4 w-64 bg-[var(--border)]/60 rounded-lg animate-pulse" />
                    </div>
                    <div className="h-10 w-36 bg-[var(--border)] rounded-xl animate-pulse" />
                </div>
                {/* Project cards skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-[var(--card)] rounded-3xl p-6 border border-[var(--border)] space-y-4 animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-[var(--border)]" />
                                <div className="space-y-1.5 flex-1">
                                    <div className="h-4 w-3/4 bg-[var(--border)] rounded" />
                                    <div className="h-3 w-1/2 bg-[var(--border)]/60 rounded" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {Array.from({ length: 3 }).map((_, j) => (
                                    <div key={j} className="h-12 bg-[var(--border)]/40 rounded-xl" />
                                ))}
                            </div>
                            <div className="h-9 bg-[var(--border)]/30 rounded-xl" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
