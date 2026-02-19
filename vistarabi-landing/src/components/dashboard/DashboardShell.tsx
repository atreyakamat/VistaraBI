'use client';

// Module 5A — Dashboard Shell
// Full page layout: sidebar + header + content

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { KPIMetricStrip } from './KPIMetricStrip';
import { ChartGrid } from './ChartGrid';
import { SkeletonLoader } from './SkeletonLoader';
import type { KPICardData, KPIExplanationData, DashboardSection } from './types';

interface DashboardShellProps {
    projectId: string;
    projectName: string;
    domainIcon: string;
    domainName: string;
    domainColor: string;
    sections: DashboardSection[];
    kpis: KPICardData[];
    explanations: Record<string, KPIExplanationData>;
    isLoading: boolean;
    isRefreshing: boolean;
    onRefresh: () => void;
}

export function DashboardShell({
    projectId, projectName, domainIcon, domainName, domainColor,
    sections, kpis, explanations, isLoading, isRefreshing, onRefresh,
}: DashboardShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<string | undefined>();

    // Group KPIs by section
    const kpiMap = new Map(kpis.map(k => [k.kpiId, k]));

    return (
        <div className="dashboard-layout">
            <Sidebar
                projectId={projectId}
                projectName={projectName}
                domainIcon={domainIcon}
                domainName={domainName}
                domainColor={domainColor}
                sections={sections.map(s => ({ id: s.id, title: s.title, icon: s.icon }))}
                activeSection={activeSection}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
            />

            <div className="dashboard-main">
                <Header
                    title="Data Intelligence"
                    subtitle={domainName}
                    kpiCount={kpis.length}
                    onRefresh={onRefresh}
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    isRefreshing={isRefreshing}
                />

                <main className="p-6">
                    {isLoading ? (
                        <SkeletonLoader />
                    ) : (
                        <>
                            {/* KPI Metric Strip */}
                            <KPIMetricStrip kpis={kpis} explanations={explanations} />

                            {/* Chart Sections */}
                            {sections.map((section) => {
                                const sectionKpis = section.kpiIds
                                    .map(id => kpiMap.get(id))
                                    .filter((k): k is KPICardData => k !== undefined);

                                if (sectionKpis.length === 0) return null;

                                return (
                                    <div key={section.id} id={`section-${section.id}`} className="mb-8">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-lg">{section.icon}</span>
                                            <div>
                                                <h2 className="text-base font-bold text-gray-900">
                                                    {section.title}
                                                </h2>
                                                <p className="text-xs text-gray-500">{section.description}</p>
                                            </div>
                                        </div>
                                        <ChartGrid kpis={sectionKpis} />
                                    </div>
                                );
                            })}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
