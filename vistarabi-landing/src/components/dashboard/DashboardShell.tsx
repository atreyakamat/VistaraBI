'use client';

// Module 5 — Dashboard Shell (Premium Glassmorphism Redesign)
// 2×2 KPI grid, AI Insights section, Active Streams, FilterBar, drill-down breadcrumb

import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { KPIMetricCard } from './KPIMetricCard';
import { ChartGrid } from './ChartGrid';
import { SkeletonLoader } from './SkeletonLoader';
import { InsightPanel } from './InsightPanel';
import { SmartAlertBanner } from './SmartAlertBanner';
import { FilterBar, type DashboardFilters } from './FilterBar';
import { AIFilter } from './AIFilter';
import { AskAIPanel } from './AskAIPanel';
import { GoalStrategyPanel } from './GoalStrategyPanel';
import { ForecastPanel } from './ForecastPanel';
import { OllamaHealthBanner } from './OllamaHealthBanner';
import type { KPICardData, KPIExplanationData, DashboardSection, InsightFeedItem, SmartAlert } from './types';
import { getAvailableRanges, type DateRange, type Granularity } from './ChartContainer';
import type { StrategyCanvasResult } from '@/lib/module-8/types';
import { DashboardErrorBoundary } from './DashboardErrorBoundary';
import { SharePanel } from './SharePanel';
import { ExportButton } from './ExportButton';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { useAIMode } from '@/lib/ai/use-ai-mode';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

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
    domainModel?: string; // active Ollama model (e.g. vistara-analytics-saas)
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
    isReadOnly?: boolean;
}

export function DashboardShell({
    projectId, projectName, domainIcon, domainName, domainColor, domainModel, isReadOnly,
    sections, kpis, explanations, isLoading, isRefreshing, onRefresh,
    onFilterChange,
    insightFeed = [], smartAlerts = [],
    strongestUp = null, strongestDown = null,
    anomalyCount = 0, trendingUp = 0, trendingDown = 0,
}: DashboardShellProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<string | undefined>();
    const [insightPanelOpen, setInsightPanelOpen] = useState(false);
    const [askAiOpen, setAskAiOpen] = useState(false);
    const [goalPanelOpen, setGoalPanelOpen] = useState(false);
    const [forecastPanelOpen, setForecastPanelOpen] = useState(false);
    const [goalQuery, setGoalQuery] = useState('');
    const [kpiSearchQuery, setKpiSearchQuery] = useState('');
    const [showSharePanel, setShowSharePanel] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    // Active StrategyCanvasResult shared between GoalStrategyPanel and AskAIPanel
    // (implements the State Injection Pipeline from MODULE_6_7_8_INTEGRATION_PLAN.md)
    const [activeStrategyContext, setActiveStrategyContext] = useState<StrategyCanvasResult | null>(null);
    const [askAiMessages, setAskAiMessages] = useState<{ role: string; text: string }[]>([]);
    const [drillStack, setDrillStack] = useState<DrillState[]>([]);
    const [filters, setFilters] = useState<DashboardFilters>({
        granularity: 'monthly',
        dateRange: '90d',
    });

    // Bulk selection & filtering state
    const [selectedKpis, setSelectedKpis] = useState<Set<string>>(new Set());
    const [externalFilters, setExternalFilters] = useState<Record<string, { range: DateRange; gran: Granularity; ts: number }>>({});

    // UI state for bottom bar
    const [bottomDateRange, setBottomDateRange] = useState<DateRange>('90d');
    const [bottomGranularity, setBottomGranularity] = useState<Granularity>('monthly');
    const { preferLocal, setPreferLocal } = useAIMode();

    // Auto-trigger insight panel if anomalies are detected
    useEffect(() => {
        if (anomalyCount > 0 && !isReadOnly) {
            setInsightPanelOpen(true);
            toast.warning(`Detected ${anomalyCount} anomal${anomalyCount === 1 ? 'y' : 'ies'} in your data.`);
        }
    }, [anomalyCount, isReadOnly]);

    const handleExportPDF = async () => {
        setIsGeneratingReport(true);
        try {
            let dashboardImageBase64 = null;
            let chartImageBase64 = null;

            // Capture the Dashboard Grid
            try {
                const dashboardElement = document.getElementById('dashboard-grid-container');
                if (dashboardElement) {
                    const dashCanvas = await html2canvas(dashboardElement, { scale: 1.5 });
                    dashboardImageBase64 = dashCanvas.toDataURL('image/png');
                }
                
                // If strategy simulator was ever opened, we might have a canvas container to capture
                const chartElement = document.getElementById('strategy-canvas-container');
                if (chartElement) {
                    const chartCanvas = await html2canvas(chartElement, { scale: 1.5 });
                    chartImageBase64 = chartCanvas.toDataURL('image/png');
                }
            } catch (e) {
                console.warn("UI capture failed for report", e);
            }

            const targetVal = 75000;
            
            const chatHistoryPairs = [];
            for (let i = 0; i < askAiMessages.length; i++) {
                if (askAiMessages[i].role.toLowerCase() === 'user') {
                    const q = askAiMessages[i].text;
                    let ans = "No response recorded.";
                    for (let j = i + 1; j < askAiMessages.length; j++) {
                        if (askAiMessages[j].role.toLowerCase() === 'assistant' || askAiMessages[j].role.toLowerCase() === 'system') {
                            ans = askAiMessages[j].text;
                            break;
                        }
                    }
                    chatHistoryPairs.push({ question: q, answer: ans });
                }
            }

            const payload = {
                domain: domainName,
                metrics: {
                    probability: activeStrategyContext?.probabilityOfSuccess || 0.85,
                    gap: activeStrategyContext ? Math.max(0, targetVal - activeStrategyContext.scenarios.baseline[activeStrategyContext.scenarios.baseline.length - 1].yhat) : 5000,
                    target: targetVal
                },
                chartImage: chartImageBase64 || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==",
                dashboardImage: dashboardImageBase64,
                selectedKPIs: topKpis.map(k => ({ name: k.kpiName, category: k.category, value: String(k.currentValue) })),
                actions: activeStrategyContext?.topActions?.map(a => ({ title: a.actionName, impact: a.tier })) || [],
                globalChatSummary: askAiMessages.length > 0 ? askAiMessages[askAiMessages.length - 1].text : undefined,
                module6ChatHistory: chatHistoryPairs,
                forecastData: activeStrategyContext ? {
                    kpi: topKpis[0]?.kpiName || 'Primary Metric',
                    trend: activeStrategyContext.probabilityOfSuccess > 0.6 ? 'Positive' : 'At Risk',
                    confidence: '95%'
                } : undefined
            };

            const response = await fetch('/api/v1/report/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to generate report');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `VistaraBI_Executive_Report_${domainName}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Executive Report generated successfully!');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to generate Executive Report. Please try again.');
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const toggleKpiSelection = useCallback((kpiId: string) => {
        setSelectedKpis(prev => {
            const next = new Set(prev);
            if (next.has(kpiId)) next.delete(kpiId);
            else next.add(kpiId);
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => setSelectedKpis(new Set()), []);
    const selectAll = useCallback(() => setSelectedKpis(new Set(kpis.map(k => k.kpiId))), [kpis]);

    const applyFilterToSelected = useCallback(() => {
        const ts = Date.now();
        setExternalFilters(prev => {
            const next = { ...prev };
            selectedKpis.forEach(id => {
                next[id] = { range: bottomDateRange, gran: bottomGranularity, ts };
            });
            return next;
        });
        clearSelection(); // Optional: clears selection after applying
    }, [selectedKpis, bottomDateRange, bottomGranularity, clearSelection]);

    const kpiMap = new Map(kpis.map(k => [k.kpiId, k]));

    // Filter KPIs by search query (client-side, instant)
    const filteredKpis = kpiSearchQuery.trim()
        ? kpis.filter(k => k.kpiName.toLowerCase().includes(kpiSearchQuery.toLowerCase()))
        : kpis;

    // Get top 4 KPIs for the main grid (respects search filter)
    const topKpis = filteredKpis.slice(0, 4);

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

    const handleGoalSimulationComplete = useCallback((ctx: StrategyCanvasResult) => {
        setActiveStrategyContext(ctx);
    }, []);

    const handleOpenGoalEngine = useCallback((query: string) => {
        setGoalQuery(query);
        setAskAiOpen(false);
        setGoalPanelOpen(true);
    }, []);

    // Build AI insight summary for welcome subtitle
    const aiSummary = strongestUp
        ? `AI has detected a ${Math.abs(strongestUp.deltaPercent || 0).toFixed(1)}% surge in ${strongestUp.kpiName.replace(/_/g, ' ')} today.`
        : anomalyCount > 0
            ? `${anomalyCount} anomalies detected across your KPIs.`
            : `All ${kpis.length} KPIs are performing within expected range.`;

    return (
        <div className="dashboard-layout dashboard-root">
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
                onOpenForecast={() => setForecastPanelOpen(true)}
                onOpenStrategy={() => setGoalPanelOpen(true)}
                onOpenAskAI={() => setAskAiOpen(true)}
                isReadOnly={isReadOnly}
            />

            {/* Main Content */}
            <main className="dashboard-main">
                {isReadOnly && (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-amber-800 text-sm font-medium z-50">
                        <span className="material-symbols-outlined text-base">visibility</span>
                        Read-only view — shared by project owner
                    </div>
                )}
                {/* Ollama Health Banner — shows only when AI is offline */}
                <OllamaHealthBanner />
                {/* Frosted Glass Header */}
                <Header
                    title="Data Intelligence"
                    subtitle={domainName}
                    kpiCount={kpis.length}
                    onRefresh={onRefresh}
                    onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    isRefreshing={isRefreshing}
                    onAskAI={() => setAskAiOpen(true)}
                    onOpenNotifications={() => setInsightPanelOpen(true)}
                    kpiSearchQuery={kpiSearchQuery}
                    onSearchChange={setKpiSearchQuery}
                >
                    <button
                        onClick={() => setPreferLocal(!preferLocal)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            preferLocal
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                        }`}
                        title={preferLocal ? 'Using Local AI (Ollama)' : 'Using Cloud AI (Groq)'}
                    >
                        <span className="material-symbols-outlined text-base">
                            {preferLocal ? 'nest_remote_iris' : 'cloud'}
                        </span>
                        {preferLocal ? 'Local' : 'Cloud'}
                    </button>
                    {/* Share Button */}
                    {!isReadOnly && (
                        <button
                            onClick={() => setShowSharePanel(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors"
                            title="Share Dashboard"
                        >
                            <span className="material-symbols-outlined text-base">share</span>
                            Share
                        </button>
                    )}

                    {/* Export CSV */}
                    {!isReadOnly && (
                        <ExportButton
                            projectId={projectId}
                            label="Export CSV"
                            className="bg-sky-100 hover:bg-sky-200 text-sky-700"
                        />
                    )}

                    {/* Insight Panel Toggle */}
                    <button
                        onClick={() => setInsightPanelOpen(!insightPanelOpen)}
                        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
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

                    {/* Goal Strategy Engine Toggle */}
                    {!isReadOnly && (
                        <button
                            onClick={() => setGoalPanelOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-100 hover:bg-violet-200 text-violet-700 transition-colors"
                            title="Goal Strategy Engine"
                        >
                            <span className="material-symbols-outlined text-base">target</span>
                            Strategy
                        </button>
                    )}

                    {/* Active AI Model Indicator */}
                    {domainModel && (
                        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500" title={`Active AI model: ${domainModel}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {domainModel.replace('vistara-analytics-', '').toUpperCase()}
                        </div>
                    )}
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
                                    <button 
                                        onClick={handleExportPDF}
                                        disabled={isGeneratingReport}
                                        className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-lg text-slate-500">
                                            {isGeneratingReport ? 'hourglass_empty' : 'ios_share'}
                                        </span>
                                        {isGeneratingReport ? 'Generating...' : 'Export Executive Report'}
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
                            <div id="dashboard-grid-container" className="dashboard-grid">
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
                                        <ChartGrid
                                            kpis={sectionKpis}
                                            projectId={projectId}
                                            selectedKpis={selectedKpis}
                                            onToggleSelection={toggleKpiSelection}
                                            externalFilters={externalFilters}
                                            onDrillDown={handleDrillDown}
                                        />
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

            {/* ── Bottom Floating Filter Bar for Selected Cards ──────────── */}
            {selectedKpis.size > 0 && (
                <div className="bottom-filter-bar-wrapper">
                    <div className="bottom-filter-bar">
                        <div className="bottom-filter-bar-header">
                            <div className="flex items-center gap-3">
                                <span className="bottom-filter-selection-count">
                                    {selectedKpis.size} chart{selectedKpis.size > 1 ? 's' : ''} selected
                                </span>
                                <button className="bottom-filter-clear-btn" onClick={clearSelection}>Clear</button>
                                <button className="bottom-filter-clear-btn" onClick={selectAll}>Select All</button>
                            </div>
                        </div>

                        <div className="bottom-filter-bar-controls">
                            <div className="flex items-center gap-2 border-r border-slate-200/50 pr-4">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Range</span>
                                <div className="flex gap-1">
                                    {(['7d', '30d', '90d', '1y', 'all'] as DateRange[]).map(d => {
                                        // Compute available ranges for the entire selection.
                                        // If any chart has data for this range, we allow it.
                                        const selectedData = Array.from(selectedKpis).map(id => kpis.find(k => k.kpiId === id)).filter(Boolean) as KPICardData[];
                                        const availableRanges = getAvailableRanges(selectedData);
                                        const isAvailable = availableRanges.includes(d);

                                        return (
                                            <button
                                                key={d}
                                                className={`bottom-filter-preset-btn ${bottomDateRange === d ? 'active' : ''} ${!isAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                onClick={() => isAvailable && setBottomDateRange(d)}
                                                disabled={!isAvailable}
                                            >
                                                {d === '7d' ? '7D' : d === '30d' ? '30D' : d === '90d' ? '90D' : d === '1y' ? '1Y' : 'All'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pl-2">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Group</span>
                                <div className="flex gap-1">
                                    {(['daily', 'weekly', 'monthly', 'quarterly'] as Granularity[]).map(g => (
                                        <button
                                            key={g}
                                            className={`bottom-filter-preset-btn ${bottomGranularity === g ? 'active' : ''}`}
                                            onClick={() => setBottomGranularity(g)}
                                        >
                                            {g === 'daily' ? 'D' : g === 'weekly' ? 'W' : g === 'monthly' ? 'M' : 'Q'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button className="bottom-filter-apply-btn" onClick={applyFilterToSelected}>
                                Apply Filter
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ask AI FAB */}
            <div className="fixed bottom-8 right-8 flex flex-col gap-3 items-end z-40">
                {!isReadOnly && (
                    <>
                        <button
                            className={`ask-ai-fab${forecastPanelOpen ? ' open' : ''}`}
                            onClick={() => setForecastPanelOpen(true)}
                            aria-label="Forecasting"
                            title="Forecasting Engine"
                            style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', position: 'static' }}
                        >
                            <span className="material-symbols-outlined text-base">monitoring</span>
                            Forecast
                        </button>

                        <button
                            className={`ask-ai-fab${goalPanelOpen ? ' open' : ''}`}
                            onClick={() => setGoalPanelOpen(true)}
                            aria-label="Target Goals"
                            title="Goal Strategy Engine"
                            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', position: 'static' }}
                        >
                            <span className="material-symbols-outlined text-base">target</span>
                            Strategy
                        </button>
                    </>
                )}

                <button
                    className={`ask-ai-fab${askAiOpen ? ' open' : ''}`}
                    onClick={() => setAskAiOpen(true)}
                    aria-label="Ask AI"
                    title="Ask AI"
                    style={{ position: 'static' }}
                >
                    <span className="material-symbols-outlined text-base">auto_awesome</span>
                    Ask AI
                </button>
            </div>

            {/* Forecast Panel */}
            {!isReadOnly && (
                <DashboardErrorBoundary label="Forecast Panel">
                    <ForecastPanel
                        projectId={projectId}
                        isOpen={forecastPanelOpen}
                        onClose={() => setForecastPanelOpen(false)}
                        activeKPIs={kpis.map(k => ({ name: k.kpiName, category: k.category || 'Metric' }))}
                        domainModel={domainModel}
                    />
                </DashboardErrorBoundary>
            )}

            {/* Goal Strategy Panel — single instance, wired to state injection */}
            {!isReadOnly && (
                <DashboardErrorBoundary label="Goal Strategy Engine">
                    <GoalStrategyPanel
                        projectId={projectId}
                        isOpen={goalPanelOpen}
                        onClose={() => setGoalPanelOpen(false)}
                        initialQuery={goalQuery}
                        onSimulationComplete={handleGoalSimulationComplete}
                        domainName={domainName}
                        activeKPIs={kpis.map(k => ({ name: k.kpiName, category: k.category || 'Metric' }))}
                        askAiMessages={askAiMessages}
                    />
                </DashboardErrorBoundary>
            )}

            {/* Ask AI Panel — receives live strategy context for state injection */}
            <DashboardErrorBoundary label="Ask AI Panel">
                <AskAIPanel
                    projectId={projectId}
                    isOpen={askAiOpen}
                    onClose={() => setAskAiOpen(false)}
                    onCommandSuccess={onRefresh}
                    strategyContext={activeStrategyContext ?? undefined}
                    onMessagesChange={setAskAiMessages}
                    onOpenGoalEngine={handleOpenGoalEngine}
                />
            </DashboardErrorBoundary>

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
            {/* Share Panel */}
            <SharePanel
                projectId={projectId}
                projectName={projectName}
                isOpen={showSharePanel}
                onClose={() => setShowSharePanel(false)}
            />
        </div>
    );
}
