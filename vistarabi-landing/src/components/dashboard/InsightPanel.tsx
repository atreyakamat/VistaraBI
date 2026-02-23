'use client';

// Module 5C — Insight Panel (Right Sidebar)
// Floating panel: top movers, anomaly alerts, strongest trends, data freshness

import { useState } from 'react';
import type { InsightFeedItem, SmartAlert } from './types';

interface InsightPanelProps {
    feed: InsightFeedItem[];
    alerts: SmartAlert[];
    strongestUp: InsightFeedItem | null;
    strongestDown: InsightFeedItem | null;
    anomalyCount: number;
    trendingUp: number;
    trendingDown: number;
    isOpen: boolean;
    onClose: () => void;
}

export function InsightPanel({
    feed, alerts, strongestUp, strongestDown,
    anomalyCount, trendingUp, trendingDown,
    isOpen, onClose,
}: InsightPanelProps) {
    const [tab, setTab] = useState<'feed' | 'alerts'>('feed');
    const activeAlerts = alerts.filter(a => a.severity !== 'normal');

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="insight-panel-backdrop"
                    onClick={onClose}
                />
            )}

            {/* Panel */}
            <div className={`insight-panel ${isOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🧠</span>
                        <h3 className="text-sm font-bold text-white">Insights</h3>
                        {activeAlerts.length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {activeAlerts.length}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white text-sm transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Summary Strip */}
                <div className="grid grid-cols-3 gap-2 p-3 border-b border-slate-700/50">
                    <div className="text-center">
                        <div className="text-lg font-bold text-red-400">{anomalyCount}</div>
                        <div className="text-[10px] text-slate-400">Anomalies</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-green-400">{trendingUp}</div>
                        <div className="text-[10px] text-slate-400">Trending Up</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-orange-400">{trendingDown}</div>
                        <div className="text-[10px] text-slate-400">Trending Down</div>
                    </div>
                </div>

                {/* Top Movers */}
                {(strongestUp || strongestDown) && (
                    <div className="p-3 border-b border-slate-700/50 space-y-2">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            Top Movers
                        </div>
                        {strongestUp && (
                            <div className="flex items-center gap-2 bg-green-500/10 rounded-lg p-2">
                                <span className="text-sm">📈</span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium text-green-300 truncate">
                                        {strongestUp.kpiName.replace(/_/g, ' ')}
                                    </div>
                                    <div className="text-[10px] text-green-400/70">
                                        +{strongestUp.deltaPercent?.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        )}
                        {strongestDown && (
                            <div className="flex items-center gap-2 bg-red-500/10 rounded-lg p-2">
                                <span className="text-sm">📉</span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium text-red-300 truncate">
                                        {strongestDown.kpiName.replace(/_/g, ' ')}
                                    </div>
                                    <div className="text-[10px] text-red-400/70">
                                        {strongestDown.deltaPercent?.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-slate-700/50">
                    <button
                        className={`flex-1 text-xs py-2 font-medium transition-colors ${tab === 'feed' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        onClick={() => setTab('feed')}
                    >
                        Feed ({feed.length})
                    </button>
                    <button
                        className={`flex-1 text-xs py-2 font-medium transition-colors ${tab === 'alerts' ? 'text-red-400 border-b-2 border-red-400' : 'text-slate-400 hover:text-slate-200'
                            }`}
                        onClick={() => setTab('alerts')}
                    >
                        Alerts ({activeAlerts.length})
                    </button>
                </div>

                {/* Feed / Alerts Content */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {tab === 'feed' ? (
                        feed.length > 0 ? feed.map(item => (
                            <div
                                key={item.id}
                                className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50 insight-fade-in"
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-sm mt-0.5">
                                        {item.type === 'anomaly' ? '⚠️' :
                                            item.type === 'movement' ? '📊' :
                                                item.type === 'trend' ? '📈' : '🔔'}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-slate-200 truncate">
                                            {item.kpiName.replace(/_/g, ' ')}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                                            {item.description}
                                        </div>
                                        {item.deltaPercent !== undefined && (
                                            <span className={`text-[10px] font-semibold mt-1 inline-block ${item.deltaPercent > 0 ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                {item.deltaPercent > 0 ? '+' : ''}{item.deltaPercent.toFixed(1)}%
                                            </span>
                                        )}
                                    </div>
                                    {item.severity !== 'normal' && (
                                        <span className={`severity-dot-sm ${item.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-slate-500 text-xs py-8">
                                No notable insights at this time
                            </div>
                        )
                    ) : (
                        activeAlerts.length > 0 ? activeAlerts.map((alert, i) => (
                            <div
                                key={`alert-${alert.kpiId}-${i}`}
                                className={`rounded-lg p-2.5 border insight-fade-in ${alert.severity === 'critical'
                                        ? 'bg-red-500/10 border-red-500/30'
                                        : 'bg-yellow-500/10 border-yellow-500/30'
                                    }`}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-sm">
                                        {alert.severity === 'critical' ? '🔴' : '🟡'}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-slate-200 truncate">
                                            {alert.kpiName.replace(/_/g, ' ')}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                            {alert.reason}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1">
                                            {new Date(alert.triggeredAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-slate-500 text-xs py-8">
                                ✅ No active alerts
                            </div>
                        )
                    )}
                </div>
            </div>
        </>
    );
}
