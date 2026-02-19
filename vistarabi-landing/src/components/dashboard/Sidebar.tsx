'use client';

// Module 5A — Fixed Left Sidebar

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
                {/* Brand / Project */}
                <div className="p-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                            style={{ background: domainColor + '22', color: domainColor }}
                        >
                            {domainIcon}
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{projectName}</div>
                            <div className="text-xs text-slate-400">{domainName}</div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="p-3 space-y-1">
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Dashboard
                    </div>

                    <button
                        className={`sidebar-nav-item w-full text-left ${!activeSection ? 'active' : ''}`}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                        <span>📊</span>
                        <span>Overview</span>
                    </button>

                    {sections.map((section) => (
                        <button
                            key={section.id}
                            className={`sidebar-nav-item w-full text-left ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => {
                                const el = document.getElementById(`section-${section.id}`);
                                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                        >
                            <span>{section.icon}</span>
                            <span className="truncate">{section.title}</span>
                        </button>
                    ))}

                    <div className="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Actions
                    </div>

                    <button
                        className="sidebar-nav-item w-full text-left"
                        onClick={() => router.push(`/app/projects/${projectId}/kpis`)}
                    >
                        <span>🔧</span>
                        <span>Edit KPIs</span>
                    </button>

                    <button
                        className="sidebar-nav-item w-full text-left"
                        onClick={() => router.push(`/app/projects/${projectId}`)}
                    >
                        <span>← </span>
                        <span>Back to Project</span>
                    </button>
                </nav>

                {/* Version Info */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                    <div className="text-[10px] text-slate-500">
                        VistaraBI • Data Intelligence Interface
                    </div>
                </div>
            </aside>
        </>
    );
}
