'use client';

// Module 5A — Frosted Glass Header (Glassmorphism Redesign)
// Sticky frosted header with search, AI button, notifications, refresh

interface HeaderProps {
    title: string;
    subtitle: string;
    kpiCount: number;
    onRefresh: () => void;
    onToggleSidebar: () => void;
    isRefreshing: boolean;
    children?: React.ReactNode;
}

export function Header({
    title, subtitle, kpiCount, onRefresh, onToggleSidebar, isRefreshing, children,
}: HeaderProps) {
    return (
        <header className="dashboard-header">
            {/* Left: Search */}
            <div className="header-search">
                <span className="header-search-icon">
                    <span className="material-symbols-outlined">search</span>
                </span>
                <input
                    type="text"
                    placeholder="Search metrics, datasets or ask AI anything..."
                />
            </div>

            {/* Right: Actions */}
            <div className="header-actions">
                {/* Mobile menu toggle */}
                <button
                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    onClick={onToggleSidebar}
                >
                    <span className="material-symbols-outlined">menu</span>
                </button>

                {/* Gradient AI Button */}
                <button className="gradient-btn px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 shadow-lg"
                    style={{ boxShadow: '0 8px 24px rgba(19, 91, 236, 0.25)' }}
                >
                    <span className="material-symbols-outlined text-lg">magic_button</span>
                    Ask AI
                </button>

                <div className="header-divider hidden sm:block" />

                {/* Refresh */}
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                    title={isRefreshing ? 'Refreshing...' : 'Refresh dashboard'}
                >
                    <span className={`material-symbols-outlined ${isRefreshing ? 'animate-spin' : ''}`}>
                        refresh
                    </span>
                </button>

                {/* Module 5C: Additional header actions */}
                {children}

                {/* Notifications */}
                <button className="header-notification-btn">
                    <span className="material-symbols-outlined">notifications</span>
                    <span className="notification-dot" />
                </button>

                {/* Live indicator */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Live
                </div>
            </div>
        </header>
    );
}
