'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { KPICardData } from '@/components/dashboard/types';

interface DashboardConfig {
    sections: Array<{
        id: string;
        title: string;
        cards: Array<{ kpiId: string; kpiName: string; chartType: string }>;
    }>;
    metadata: {
        domain: string;
        domainName: string;
        totalKPIs: number;
        totalSections: number;
    };
}

export default function DashboardPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState('Initializing dashboard...');
    const [error, setError] = useState<string | null>(null);
    const [config, setConfig] = useState<DashboardConfig | null>(null);
    const [kpiData, setKpiData] = useState<Map<string, KPICardData>>(new Map());

    useEffect(() => {
        if (projectId) {
            loadDashboard();
        }
    }, [projectId]);

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError(null);

            // Step 1: Try to load existing dashboard config (Module 5A)
            setLoadingStatus('Loading dashboard configuration...');
            let configRes = await fetch(`/api/projects/${projectId}/dashboard`);

            // If not found, auto-generate it first
            if (configRes.status === 404) {
                setLoadingStatus('Generating dashboard layout from your KPIs...');
                const genRes = await fetch(`/api/projects/${projectId}/dashboard`, { method: 'POST' });
                if (!genRes.ok) {
                    const err = await genRes.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to generate dashboard. Make sure your KPI Blueprint is finalized.');
                }
                // Re-fetch the config after generation
                configRes = await fetch(`/api/projects/${projectId}/dashboard`);
            }

            if (!configRes.ok) {
                throw new Error('Failed to load dashboard configuration');
            }
            const dashboardConfig: DashboardConfig = await configRes.json();
            setConfig(dashboardConfig);

            // Step 2: Load KPI data (Module 5B)
            setLoadingStatus('Computing KPI values...');
            const dataRes = await fetch(`/api/projects/${projectId}/dashboard/data`);
            if (!dataRes.ok) {
                const err = await dataRes.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to load dashboard data');
            }
            const dashboardData = await dataRes.json();

            // Transform data into KPICardData format
            const kpiMap = new Map<string, KPICardData>();
            (dashboardData.kpiData || []).forEach((kpi: any) => {
                kpiMap.set(kpi.kpiId, {
                    kpiId: kpi.kpiId,
                    kpiName: kpi.kpiName,
                    value: kpi.result ?? 0,
                    chartType: kpi.chartType || 'metric_card',
                    chartData: kpi.timeSeriesData || kpi.groupedData || [],
                    trend: kpi.trend
                });
            });
            setKpiData(kpiMap);
        } catch (err: any) {
            console.error('[Dashboard] Load failed:', err);
            setError(err.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 font-medium">{loadingStatus}</p>
                    <p className="mt-1 text-gray-400 text-sm">This may take a moment on first load</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Dashboard Error</h2>
                    <p className="text-gray-700">{error}</p>
                    <button
                        onClick={() => router.push(`/app/projects/${projectId}/kpis`)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Back to KPIs
                    </button>
                </div>
            </div>
        );
    }

    if (!config) {
        return null;
    }

    // Format sections for DashboardGrid — sections use `title` and `cards` from Module 5A
    const sections = (config.sections || []).map(section => ({
        id: section.id,
        name: section.title,
        kpis: (section.cards || []).map(k => k.kpiId)
    }));

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                            <p className="text-sm text-gray-500 mt-1">
                                {config.metadata.domainName || config.metadata.domain} • {config.metadata.totalKPIs} KPIs
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={loadDashboard}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                ↻ Refresh
                            </button>
                            <button
                                onClick={() => router.push(`/app/projects/${projectId}/kpis`)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                ← Back to KPIs
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Dashboard Grid */}
                    <div className="lg:col-span-3">
                        <DashboardGrid sections={sections} kpiData={kpiData} />
                    </div>

                    {/* Insights Sidebar */}
                    <div className="lg:col-span-1">
                        <InsightsPanel projectId={projectId} />
                    </div>
                </div>
            </main>
        </div>
    );
}
