'use client';

// Module 5A — Slim Icon Sidebar (Glassmorphism Redesign)
// Matches premium template: w-20 icon-only nav, Material Symbols, active glow

import { useRouter } from 'next/navigation';
import { InviteButton } from '@/components/app/InviteButton';

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
    onOpenForecast?: () => void;
    onOpenStrategy?: () => void;
    onOpenAskAI?: () => void;
    onOpenGovernance?: () => void;
    isReadOnly?: boolean;
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
    onOpenForecast, onOpenStrategy, onOpenAskAI, onOpenGovernance,
    isReadOnly = false
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
                    
                    {!isReadOnly && (
                        <>
                            <div className="my-2 border-t border-slate-700/50 mx-4"></div>

                            {onOpenForecast && (
                                <button className="sidebar-nav-item" onClick={onOpenForecast} title="Forecast">
                                    <div className="nav-icon-wrapper text-emerald-400">
                                        <span className="material-symbols-outlined">monitoring</span>
                                    </div>
                                </button>
                            )}
                            {onOpenStrategy && (
                                <button className="sidebar-nav-item" onClick={onOpenStrategy} title="Strategy">
                                    <div className="nav-icon-wrapper text-blue-400">
                                        <span className="material-symbols-outlined">target</span>
                                    </div>
                                </button>
                            )}
                            {onOpenAskAI && (
                                <button className="sidebar-nav-item" onClick={onOpenAskAI} title="Ask AI">
                                    <div className="nav-icon-wrapper text-purple-400">
                                        <span className="material-symbols-outlined">auto_awesome</span>
                                    </div>
                                </button>
                            )}
                            {onOpenGovernance && (
                                <button className="sidebar-nav-item" onClick={onOpenGovernance} title="Data Governance & Quality">
                                    <div className="nav-icon-wrapper text-amber-500">
                                        <span className="material-symbols-outlined">health_and_safety</span>
                                    </div>
                                </button>
                            )}
                        </>
                    )}
                </nav>

                {/* Footer Actions */}
                <div className="sidebar-footer">
                    {!isReadOnly && (
                        <>
                            <button
                                className="sidebar-nav-item"
                                onClick={() => router.push(`/app/projects/${projectId}/kpis`)}
                                title="Edit KPIs"
                            >
                                <span className="material-symbols-outlined text-slate-400 hover:text-slate-600 transition-all">
                                    settings
                                </span>
                            </button>

                            <InviteButton referralSource="sidebar" />
                        </>
                    )}

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
