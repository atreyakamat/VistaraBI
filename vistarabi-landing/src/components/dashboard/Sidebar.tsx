'use client';

// Module 5A — Slim Icon Sidebar (Glassmorphism Redesign)
// Matches premium template: w-20 icon-only nav, Material Symbols, active glow

import { useRouter } from 'next/navigation';

interface SidebarProps {
    projectId: string;
    projectName: string;
    domainIcon: string;
    domainName: string;
    domainColor: string;
    sections: Array<{ id: string; title: string; icon: string }>;
    activeSection?: string;
    isOpen: boolean;
    onToggle: () => void;
}

// Map section icons to Material Symbols (fallback to emoji)
const MATERIAL_ICONS: Record<string, string> = {
    '📊': 'grid_view',
    '💰': 'payments',
    '👥': 'group',
    '📈': 'trending_up',
    '🎯': 'target',
    '🔧': 'build',
    '⚡': 'bolt',
    '🏦': 'account_balance',
    '🛒': 'shopping_cart',
    '📦': 'inventory_2',
    '🏥': 'local_hospital',
    '🎓': 'school',
};

function getMaterialIcon(emoji: string): string {
    return MATERIAL_ICONS[emoji] || 'analytics';
}

export function Sidebar({
    projectId, projectName, domainIcon, domainName, domainColor,
    sections, activeSection, isOpen, onToggle,
}: SidebarProps) {
    const router = useRouter();

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden"
                    onClick={onToggle}
                />
            )}

            <aside className={`dashboard-sidebar ${isOpen ? 'open' : ''}`}>
                {/* Brand Logo */}
                <div className="sidebar-logo">
                    <span className="material-symbols-outlined text-3xl font-bold">query_stats</span>
                </div>

                {/* Main Navigation */}
                <nav className="sidebar-nav">
                    {/* Overview (always first) */}
                    <button
                        className={`sidebar-nav-item ${!activeSection ? 'active' : ''}`}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        title="Overview"
                    >
                        <div className="nav-icon-wrapper">
                            <span className="material-symbols-outlined">grid_view</span>
                        </div>
                    </button>

                    {/* Section nav items */}
                    {sections.slice(0, 4).map((section) => (
                        <button
                            key={section.id}
                            className={`sidebar-nav-item ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => {
                                const el = document.getElementById(`section-${section.id}`);
                                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            title={section.title}
                        >
                            <div className="nav-icon-wrapper">
                                <span className="material-symbols-outlined">
                                    {getMaterialIcon(section.icon)}
                                </span>
                            </div>
                        </button>
                    ))}
                </nav>

                {/* Footer Actions */}
                <div className="sidebar-footer">
                    <button
                        className="sidebar-nav-item"
                        onClick={() => router.push(`/app/projects/${projectId}/kpis`)}
                        title="Edit KPIs"
                    >
                        <span className="material-symbols-outlined text-slate-400 hover:text-slate-600 transition-all">
                            settings
                        </span>
                    </button>

                    <div className="sidebar-avatar">
                        <div
                            className="w-full h-full rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ background: domainColor + '22', color: domainColor }}
                        >
                            {projectName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
