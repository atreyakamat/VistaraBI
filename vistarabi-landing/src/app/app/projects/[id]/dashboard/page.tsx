'use client';

// Module 5A+5C — Data Intelligence Interface
// Main dashboard page with 4-stage progressive rendering + cognitive insight layer

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { SkeletonLoader } from '@/components/dashboard/SkeletonLoader';
import type { KPICardData, KPIExplanationData, DashboardSection, InsightFeedItem, SmartAlert } from '@/components/dashboard/types';
import type { DashboardExecutionResult, KPIExecutionResult } from '@/lib/execution';
import '@/components/dashboard/dashboard.css';

interface DashboardConfig {
    sections: Array<{
        id: string;
        title: string;
        description: string;
        icon: string;
        cards: Array<{
            kpiId: string;
            kpiName: string;
            formula: string;
            category: string;
            chartSelection?: { chartType: string; chartLibrary: string };
            colorAccent?: string;
        }>;
    }>;
    metadata: {
        domain: string;
        domainName: string;
        domainIcon: string;
        domainColor: string;
        totalKPIs: number;
        totalSections: number;
        kpiExplanations?: Record<string, KPIExplanationData>;
    };
    sidebarConfig: {
        projectName: string;
    };
    projectName: string;
}

export default function DashboardPage() {
    const params = useParams();
    const projectId = params.id as string;

    // Stage states
    const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Data states
    const [config, setConfig] = useState<DashboardConfig | null>(null);
    const [kpis, setKpis] = useState<KPICardData[]>([]);
    const [sections, setSections] = useState<DashboardSection[]>([]);
    const [explanations, setExplanations] = useState<Record<string, KPIExplanationData>>({});

    // Module 5C — Insight states
    const [insightFeed, setInsightFeed] = useState<InsightFeedItem[]>([]);
    const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
    const [strongestUp, setStrongestUp] = useState<InsightFeedItem | null>(null);
    const [strongestDown, setStrongestDown] = useState<InsightFeedItem | null>(null);
    const [anomalyCount, setAnomalyCount] = useState(0);
    const [trendingUp, setTrendingUp] = useState(0);
    const [trendingDown, setTrendingDown] = useState(0);
    const [dataError, setDataError] = useState<string | null>(null);

    // 4-Stage Progressive Loading
    const loadDashboard = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setIsRefreshing(true);
            setError(null);
            setStage(1); // Stage 1: Skeleton

            // ── Stage 2: Load Config ──────────────────────────────────
            let configRes = await fetch(`/api/projects/${projectId}/dashboard`);

            if (configRes.status === 404) {
                // Auto-generate dashboard on first visit
                const genRes = await fetch(`/api/projects/${projectId}/dashboard`, { method: 'POST' });
                if (!genRes.ok) {
                    const err = await genRes.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to generate dashboard. Finalize your KPI Blueprint first.');
                }
                configRes = await fetch(`/api/projects/${projectId}/dashboard`);
            }

            if (!configRes.ok) throw new Error('Failed to load dashboard configuration');

            const dashConfig: DashboardConfig = await configRes.json();
            setConfig(dashConfig);

            // Parse sections
            const parsedSections: DashboardSection[] = (dashConfig.sections || []).map(s => ({
                id: s.id,
                title: s.title,
                description: s.description,
                icon: s.icon,
                kpiIds: (s.cards || []).map(c => c.kpiId),
            }));
            setSections(parsedSections);

            // Extract explanations from cached metadata
            setExplanations(dashConfig.metadata.kpiExplanations || {});

            setStage(2); // Stage 2: Config loaded, KPI cards can render

            // ── Stage 3: Load Computed Data ───────────────────────────
            // The /dashboard/data API returns DashboardExecutionResult:
            //   { projectId, kpis: KPIExecutionResult[], metadata, ... }
            // Each KPIExecutionResult has: primaryValue, previousValue, dataset[],
            //   deltaPercent, deltaDirection, recommendedChartType, recommendedChartLibrary
            const dataRes = await fetch(`/api/projects/${projectId}/dashboard/data${isRefresh ? '?skipCache=true' : ''}`);
            const kpiDataMap: Record<string, KPIExecutionResult> = {};

            if (!dataRes.ok) {
                const errData = await dataRes.json().catch(() => ({ error: 'Failed to load dashboard data' }));
                throw new Error(errData.error || `Dashboard data error: ${dataRes.status}`);
            }

            const dashData: DashboardExecutionResult = await dataRes.json();

            // Map KPI execution results by kpiId for quick lookup
            for (const kpi of (dashData.kpis || [])) {
                kpiDataMap[kpi.kpiId] = kpi;
            }

            // Build KPICardData from config + computed execution results
            const allKpis: KPICardData[] = [];
            for (const section of dashConfig.sections || []) {
                for (const card of section.cards || []) {
                    const exec = kpiDataMap[card.kpiId];

                    // Map dataset (KPIDataPoint[]) to the chart-friendly { label, value } format
                    // KPIDataPoint already has label and value, so just normalize it
                    const dataPoints: Array<{ label: string; value: number }> = (exec?.dataset || []).map((dp) => ({
                        label: dp.label || 'N/A',
                        value: typeof dp.value === 'number' ? dp.value : 0,
                    }));

                    const kpiData: KPICardData = {
                        kpiId: card.kpiId,
                        kpiName: exec?.kpiName || card.kpiName,
                        formula: card.formula,
                        category: exec?.category || card.category,
                        currentValue: exec?.primaryValue ?? 0,
                        previousValue: exec?.previousValue ?? undefined,
                        trend: exec?.deltaDirection ?? undefined,
                        trendPercent: exec?.deltaPercent ?? undefined,
                        // Use the execution engine's recommended chart type, fall back to config
                        chartType: exec?.recommendedChartType || card.chartSelection?.chartType || 'bar',
                        chartLibrary: (exec?.recommendedChartLibrary || card.chartSelection?.chartLibrary || 'chartjs') as 'chartjs' | 'plotly',
                        dataPoints,
                        colorAccent: card.colorAccent || dashConfig.metadata.domainColor,
                    };
                    allKpis.push(kpiData);
                }
            }
            setKpis(allKpis);

            setStage(3); // Stage 3: Charts can render

            // ── Stage 4: AI Insights (async, non-blocking) ────────────
            loadInsights(projectId, allKpis);
            requestAnimationFrame(() => setStage(4));

        } catch (err: any) {
            console.error('[Dashboard] Load failed:', err);
            setError(err.message || 'Failed to load dashboard');
        } finally {
            setIsRefreshing(false);
        }
    }, [projectId]);

    // Module 5C — Load insights asynchronously (non-blocking) with timeout
    const loadInsights = useCallback(async (projId: string, currentKpis: KPICardData[]) => {
        try {
            // Add 3-second timeout to insights loading
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            try {
                const insightRes = await fetch(`/api/projects/${projId}/dashboard/insights`, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (!insightRes.ok) return;

                const data = await insightRes.json();

                setInsightFeed(data.feed || []);
                setSmartAlerts(data.alerts || []);
                setStrongestUp(data.topMovers?.strongest_up ?? null);
                setStrongestDown(data.topMovers?.strongest_down ?? null);
                setAnomalyCount(data.anomalyCount ?? 0);
                setTrendingUp(data.trendingUp ?? 0);
                setTrendingDown(data.trendingDown ?? 0);

                // Enrich KPI cards with insight data
                if (data.insights && Array.isArray(data.insights)) {
                    const insightMap = new Map(data.insights.map((i: any) => [i.kpiId, i]));
                    setKpis(prev => prev.map(kpi => {
                        const insight = insightMap.get(kpi.kpiId) as any;
                        if (!insight) return kpi;
                        return {
                            ...kpi,
                            anomalySeverity: insight.anomaly?.severity || 'normal',
                            anomalyScore: insight.anomaly?.score || 0,
                            anomalyReason: insight.anomaly?.reason || '',
                            insightSummary: insight.attribution?.sentence || insight.trendSummary || '',
                            trendSummary: insight.trendSummary || '',
                            lineageExplanation: insight.lineageExplanation || '',
                            changeAttribution: insight.attribution?.sentence || '',
                            lastUpdated: insight.lastUpdated || '',
                        };
                    }));
                }
            } catch (timeoutErr) {
                if (timeoutErr instanceof TypeError && timeoutErr.name === 'AbortError') {
                    console.warn('[Dashboard] Insights load timed out (>3s), continuing without insights');
                } else {
                    throw timeoutErr;
                }
            }
        } catch (err) {
            console.warn('[Dashboard] Insights load failed (non-critical):', err);
        }
    }, []);

    useEffect(() => {
        if (projectId) loadDashboard();
    }, [projectId, loadDashboard]);

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Dashboard Error</h2>
                    <p className="text-sm text-gray-600 mb-4">{error}</p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => loadDashboard()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                        >
                            Retry
                        </button>
                        <button
                            onClick={() => window.history.back()}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Stage 1: Skeleton
    if (stage === 1 || !config) {
        return (
            <div className="dashboard-layout">
                <div className="dashboard-sidebar">
                    <div className="p-5">
                        <div className="skeleton h-10 w-full rounded-lg mb-6" />
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="skeleton h-8 w-full rounded-lg" />
                            ))}
                        </div>
                    </div>
                </div>
                <div className="dashboard-main">
                    <div className="skeleton h-16 w-full" />
                    <SkeletonLoader />
                </div>
            </div>
        );
    }

    // Stage 2+: Progressive render with 5C insight layer
    return (
        <>
            {dataError && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                    background: '#fef3c7', borderBottom: '2px solid #f59e0b',
                    padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
                    fontSize: 13, color: '#92400e',
                }}>
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <span style={{ flex: 1 }}><strong>Data Error:</strong> {dataError}</span>
                    <button
                        onClick={() => { setDataError(null); loadDashboard(true); }}
                        style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        Retry
                    </button>
                    <button onClick={() => setDataError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#92400e' }}>✕</button>
                </div>
            )}
            <DashboardShell
                projectId={projectId}
                projectName={config.sidebarConfig?.projectName || 'Project'}
                domainIcon={config.metadata.domainIcon || '📊'}
                domainName={config.metadata.domainName || 'General'}
                domainColor={config.metadata.domainColor || '#6366f1'}
                sections={sections}
                kpis={kpis}
                explanations={explanations}
                isLoading={stage < 3}
                isRefreshing={isRefreshing}
                onRefresh={() => loadDashboard(true)}
                // Module 5C props
                insightFeed={insightFeed}
                smartAlerts={smartAlerts}
                strongestUp={strongestUp}
                strongestDown={strongestDown}
                anomalyCount={anomalyCount}
                trendingUp={trendingUp}
                trendingDown={trendingDown}
            />
        </>
    );
}
