'use client';

// Module 5 — Dashboard Shell (Enhanced)
// Includes FilterBar, drill-down breadcrumb, wired to onFilterChange callback

import { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { KPIMetricStrip } from './KPIMetricStrip';
import { ChartGrid } from './ChartGrid';
import { SkeletonLoader } from './SkeletonLoader';
import { InsightPanel } from './InsightPanel';
import { SmartAlertBanner } from './SmartAlertBanner';
import { FilterBar, type DashboardFilters } from './FilterBar';
import type { KPICardData, KPIExplanationData, DashboardSection, InsightFeedItem, SmartAlert } from './types';

interface DrillState {
    kpiId: string;
    kpiName: string;
    dimensionLabel: string;
    value: number;
}

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
    onFilterChange?: (filters: DashboardFilters) => void;
    // Module 5C additions
    insightFeed?: InsightFeedItem[];
    smartAlerts?: SmartAlert[];
    strongestUp?: InsightFeedItem | null;
    strongestDown?: InsightFeedItem | null;
    anomalyCount?: number;
    trendingUp?: number;
    trendingDown?: number;
}

export function DashboardShell({
    projectId, projectName, domainIcon, domainName, domainColor,
    sections, kpis, explanations, isLoading, isRefreshing, onRefresh,
    onFilterChange,
    insightFeed = [], smartAlerts = [],
    strongestUp = null, strongestDown = null,
    anomalyCount = 0, trendingUp = 0, trendingDown = 0,
}: DashboardShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<string | undefined>();
    const [insightPanelOpen, setInsightPanelOpen] = useState(false);
    const [drillStack, setDrillStack] = useState<DrillState[]>([]);
    const [filters, setFilters] = useState<DashboardFilters>({
        granularity: 'monthly',
        dateRange: '90d',
    });

    const kpiMap = new Map(kpis.map(k => [k.kpiId, k]));

    // ── Filter Change ──────────────────────────────────────────────
    const handleFilterChange = useCallback((f: DashboardFilters) => {
        setFilters(f);
        onFilterChange?.(f);
    }, [onFilterChange]);

    // ── Drill-down ─────────────────────────────────────────────────
    const handleDrillDown = useCallback((kpiId: string, label: string, value: number) => {
        const kpi = kpiMap.get(kpiId);
        if (!kpi) return;
        setDrillStack(prev => [...prev, { kpiId, kpiName: kpi.kpiName, dimensionLabel: label, value }]);
    }, [kpiMap]);

    const handleDrillUp = (index: number) => {
        setDrillStack(prev => prev.slice(0, index));
    };

    const clearDrill = () => setDrillStack([]);

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
                >
                    {/* Insight Panel Toggle */}
                    <button
                        onClick={() => setInsightPanelOpen(!insightPanelOpen)}
                        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                                   bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="Open Insights Panel"
                    >
                        🧠 Insights
                        {anomalyCount > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                {anomalyCount}
                            </span>
                        )}
                    </button>
                </Header>

                <main className="p-6">
                    {/* ── Filter Bar ─────────────────────────────────── */}
                    {!isLoading && (
                        <div className="mb-4">
                            <FilterBar
                                filters={filters}
                                onChange={handleFilterChange}
                                loading={isRefreshing}
                            />
                        </div>
                    )}

                    {/* ── Drill-down Breadcrumb ──────────────────────── */}
                    {drillStack.length > 0 && (
                        <div className="drilldown-bar mb-4">
                            <span
                                className="drilldown-crumb"
                                onClick={clearDrill}
                                title="Back to overview"
                            >
                                Overview
                            </span>
                            {drillStack.map((crumb, i) => (
                                <span key={i} style={{ display: 'contents' }}>
                                    <span className="drilldown-sep">›</span>
                                    {i < drillStack.length - 1 ? (
                                        <span className="drilldown-crumb" onClick={() => handleDrillUp(i + 1)}>
                                            {crumb.kpiName}: {crumb.dimensionLabel}
                                        </span>
                                    ) : (
                                        <span className="drilldown-current">
                                            {crumb.kpiName}: {crumb.dimensionLabel}
                                        </span>
                                    )}
                                </span>
                            ))}
                            <button className="drilldown-reset-btn" onClick={clearDrill}>
                                ✕ Clear
                            </button>
                        </div>
                    )}

                    {isLoading ? (
                        <SkeletonLoader />
                    ) : (
                        <>
                            {/* Smart Alert Banner */}
                            <SmartAlertBanner
                                alerts={smartAlerts}
                                onViewAll={() => setInsightPanelOpen(true)}
                            />

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
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-lg">{section.icon}</span>
                                            <div>
                                                <h2 className="text-base font-bold text-gray-900">
                                                    {section.title}
                                                </h2>
                                                <p className="text-xs text-gray-500">{section.description}</p>
                                            </div>
                                        </div>
                                        <ChartGrid kpis={sectionKpis} onDrillDown={handleDrillDown} />
                                    </div>
                                );
                            })}
                        </>
                    )}
                </main>
            </div>

            {/* Insight Panel (right sidebar) */}
            <InsightPanel
                feed={insightFeed}
                alerts={smartAlerts}
                strongestUp={strongestUp}
                strongestDown={strongestDown}
                anomalyCount={anomalyCount}
                trendingUp={trendingUp}
                trendingDown={trendingDown}
                isOpen={insightPanelOpen}
                onClose={() => setInsightPanelOpen(false)}
            />
        </div>
    );
}
