'use client';

import { useState, useEffect } from 'react';

interface Anomaly {
    kpiId: string;
    kpiName: string;
    label: string;
    value: number;
    severity: 'info' | 'warning' | 'critical';
    zScore: number;
}

interface InsightsPanelProps {
    projectId: string;
}

export function InsightsPanel({ projectId }: InsightsPanelProps) {
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInsights();
    }, [projectId]);

    const fetchInsights = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/projects/${projectId}/insights`);
            if (res.ok) {
                const data = await res.json();
                // Extract anomalies from insights
                const allAnomalies: Anomaly[] = [];
                data.forEach((insight: any) => {
                    if (insight.anomalies && insight.anomalies.length > 0) {
                        allAnomalies.push(...insight.anomalies.map((a: any) => ({
                            ...a,
                            kpiId: insight.kpiId,
                            kpiName: insight.kpiName
                        })));
                    }
                });
                setAnomalies(allAnomalies);
            }
        } catch (error) {
            console.error('[Insights] Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical': return '🚨';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">AI Insights</h2>
                <button
                    onClick={fetchInsights}
                    className="text-sm text-blue-600 hover:text-blue-700"
                    disabled={loading}
                >
                    {loading ? '⟳' : '↻'} Refresh
                </button>
            </div>

            {loading ? (
                <p className="text-gray-500 text-sm">Loading insights...</p>
            ) : anomalies.length === 0 ? (
                <p className="text-gray-500 text-sm">No anomalies detected</p>
            ) : (
                <div className="space-y-3">
                    {anomalies.slice(0, 5).map((anomaly, idx) => (
                        <div
                            key={idx}
                            className={`p-3 rounded-lg border ${getSeverityColor(anomaly.severity)}`}
                        >
                            <div className="flex items-start gap-2">
                                <span className="text-lg">{getSeverityIcon(anomaly.severity)}</span>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{anomaly.kpiName}</p>
                                    <p className="text-xs mt-1">
                                        {anomaly.label}: <strong>{anomaly.value.toFixed(2)}</strong>
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Z-score: {anomaly.zScore.toFixed(2)}σ
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
