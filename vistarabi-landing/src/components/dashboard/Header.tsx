'use client';

// Module 5A — Top Navigation Header

interface HeaderProps {
    title: string;
    subtitle: string;
    kpiCount: number;
    onRefresh: () => void;
    onToggleSidebar: () => void;
    isRefreshing: boolean;
}

export function Header({
    title, subtitle, kpiCount, onRefresh, onToggleSidebar, isRefreshing,
}: HeaderProps) {
    return (
        <header className="dashboard-header">
            <div className="flex items-center gap-4">
                {/* Mobile menu toggle */}
                <button
                    className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    onClick={onToggleSidebar}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <div>
                    <h1 className="text-lg font-bold text-gray-900">{title}</h1>
                    <p className="text-xs text-gray-500">{subtitle} • {kpiCount} KPIs tracked</p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Refresh */}
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                    <svg
                        className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>

                {/* Live indicator */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Live
                </div>
            </div>
        </header>
    );
}
