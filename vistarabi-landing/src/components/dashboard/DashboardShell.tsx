'use client';

// Module 5 — Dashboard Shell (Premium Glassmorphism Redesign)
// 2×2 KPI grid, AI Insights section, Active Streams, FilterBar, drill-down breadcrumb

import { useState, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { KPIMetricCard } from './KPIMetricCard';
import { ChartGrid } from './ChartGrid';
import { SkeletonLoader } from './SkeletonLoader';
import { InsightPanel } from './InsightPanel';
import { SmartAlertBanner } from './SmartAlertBanner';
import { FilterBar, type DashboardFilters } from './FilterBar';
import { AIFilter } from './AIFilter';
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

    // Get top 4 KPIs for the main grid
    const topKpis = kpis.slice(0, 4);

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

    // Build AI insight summary for welcome subtitle
    const aiSummary = strongestUp
        ? `AI has detected a ${Math.abs(strongestUp.deltaPercent || 0).toFixed(1)}% surge in ${strongestUp.kpiName.replace(/_/g, ' ')} today.`
        : anomalyCount > 0
            ? `${anomalyCount} anomalies detected across your KPIs.`
            : `All ${kpis.length} KPIs are performing within expected range.`;

    return (
        <div className="dashboard-layout dashboard-root">
            {/* Slim Sidebar */}
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

            {/* Main Content */}
            <main className="dashboard-main">
                {/* Frosted Glass Header */}
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
                        <span className="material-symbols-outlined text-base">psychology</span>
                        Insights
                        {anomalyCount > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                {anomalyCount}
                            </span>
                        )}
                    </button>
                </Header>

                <div className="p-8 space-y-8">
                    {/* ── Welcome Section ────────────────────────────── */}
                    <div className="flex justify-between items-end">
                        <div>
                            <h1 className="welcome-title">Executive Overview</h1>
                            <p className="welcome-subtitle">
                                <span className="material-symbols-outlined text-emerald-500 text-sm font-bold">verified</span>
                                {aiSummary}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {/* Filter Bar */}
                            {!isLoading && (
                                <>
                                    <button className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-all flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg text-slate-500">calendar_today</span>
                                        {filters.dateRange === '30d' ? 'Last 30 Days' :
                                            filters.dateRange === '90d' ? 'Last 90 Days' :
                                                filters.dateRange === '7d' ? 'Last 7 Days' : 'All Time'}
                                    </button>
                                    <AIFilter onFilterGenerated={handleFilterChange} />
                                    <button className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-all flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg text-slate-500">ios_share</span>
                                        Export
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Filter Bar (Advanced) ──────────────────────── */}
                    {!isLoading && (
                        <FilterBar
                            filters={filters}
                            onChange={handleFilterChange}
                            loading={isRefreshing}
                        />
                    )}

                    {/* ── Drill-down Breadcrumb ──────────────────────── */}
                    {drillStack.length > 0 && (
                        <div className="drilldown-bar">
                            <span className="drilldown-crumb" onClick={clearDrill} title="Back to overview">
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

                            {/* ── 2×2 KPI Card Grid ──────────────────── */}
                            <div className="dashboard-grid">
                                {topKpis.map((kpi) => (
                                    <KPIMetricCard
                                        key={kpi.kpiId}
                                        data={kpi}
                                        explanation={explanations[kpi.kpiId]}
                                    />
                                ))}
                            </div>

                            {/* ── AI Generated Insights Section ──────── */}
                            {(insightFeed.length > 0 || anomalyCount > 0 || strongestUp || strongestDown) && (
                                <div className="ai-insights-section mt-8">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center"
                                            style={{ background: 'rgba(19, 91, 236, 0.1)' }}>
                                            <span className="material-symbols-outlined" style={{ color: '#135bec' }}>psychology</span>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                                Vistara AI Insights
                                            </h2>
                                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                                Deep learning analysis based on your historical data.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {/* Anomaly Card */}
                                        {anomalyCount > 0 && (
                                            <div className="ai-insight-card">
                                                <span className="ai-insight-label anomaly">Anomaly Detected</span>
                                                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                                                    {insightFeed.find(f => f.type === 'anomaly')?.description
                                                        || `${anomalyCount} anomal${anomalyCount === 1 ? 'y' : 'ies'} detected across your KPIs. Investigate unusual patterns.`}
                                                </p>
                                            </div>
                                        )}

                                        {/* Growth Card */}
                                        {strongestUp && (
                                            <div className="ai-insight-card">
                                                <span className="ai-insight-label growth">Growth Opportunity</span>
                                                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                                                    <span className="font-bold">{strongestUp.kpiName.replace(/_/g, ' ')}</span> surged
                                                    by {Math.abs(strongestUp.deltaPercent || 0).toFixed(1)}%. {strongestUp.description || 'Analyze contributing factors to sustain growth.'}
                                                </p>
                                            </div>
                                        )}

                                        {/* Warning Card */}
                                        {strongestDown && (
                                            <div className="ai-insight-card">
                                                <span className="ai-insight-label warning">Churn Warning</span>
                                                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                                                    <span className="font-bold">{strongestDown.kpiName.replace(/_/g, ' ')}</span> dropped
                                                    by {Math.abs(strongestDown.deltaPercent || 0).toFixed(1)}%. {strongestDown.description || 'AI suggests proactive investigation.'}
                                                </p>
                                            </div>
                                        )}

                                        {/* Fallback cards when no specific insights */}
                                        {anomalyCount === 0 && !strongestUp && !strongestDown && insightFeed.length > 0 && (
                                            insightFeed.slice(0, 3).map((item) => (
                                                <div key={item.id} className="ai-insight-card">
                                                    <span className={`ai-insight-label ${item.type === 'anomaly' ? 'anomaly' :
                                                        item.type === 'movement' ? 'growth' : 'warning'
                                                        }`}>
                                                        {item.title}
                                                    </span>
                                                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                                                        {item.description}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Chart Sections per Domain ──────────── */}
                            {sections.map((section) => {
                                const sectionKpis = section.kpiIds
                                    .map(id => kpiMap.get(id))
                                    .filter((k): k is KPICardData => k !== undefined);

                                if (sectionKpis.length === 0) return null;

                                return (
                                    <div key={section.id} id={`section-${section.id}`} className="mt-8">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-lg">{section.icon}</span>
                                            <div>
                                                <h2 className="section-title">{section.title}</h2>
                                                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                                                    {section.description}
                                                </p>
                                            </div>
                                        </div>
                                        <ChartGrid kpis={sectionKpis} onDrillDown={handleDrillDown} />
                                    </div>
                                );
                            })}

                            {/* ── Active Streams Table ────────────────── */}
                            <div className="pb-12 mt-8">
                                <h3 className="section-title mb-4">Active Streams</h3>
                                <table className="streams-table">
                                    <thead>
                                        <tr>
                                            <th>Data Source</th>
                                            <th>Status</th>
                                            <th>Frequency</th>
                                            <th>Last Sync</th>
                                            <th>Reliability</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                                        <span className="material-symbols-outlined text-sm">api</span>
                                                    </div>
                                                    <span className="font-semibold">PostgreSQL Warehouse</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="stream-status-badge">
                                                    <span className="stream-status-dot" /> Live
                                                </span>
                                            </td>
                                            <td className="text-slate-500">Real-time</td>
                                            <td className="text-slate-500">Just now</td>
                                            <td>
                                                <div className="stream-reliability-bar">
                                                    <div className="stream-reliability-fill" style={{ width: '98%' }} />
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                                        <span className="material-symbols-outlined text-sm">cloud</span>
                                                    </div>
                                                    <span className="font-semibold">Ollama AI Engine</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="stream-status-badge">
                                                    <span className="stream-status-dot" /> Healthy
                                                </span>
                                            </td>
                                            <td className="text-slate-500">On demand</td>
                                            <td className="text-slate-500">2 mins ago</td>
                                            <td>
                                                <div className="stream-reliability-bar">
                                                    <div className="stream-reliability-fill" style={{ width: '92%' }} />
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Insight Panel (right sidebar overlay) */}
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
