'use client';

// Module 5 — Data Lineage & Cleaning Audit Transparency Panel
// Slide-out panel matching the premium glassmorphism design system.
// Connects to /api/sources/[id]/[quality|column-health|audit-log|cleaning-summary]

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface PurificationAuditPanelProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    domainColor: string;
}

interface SourceItem {
    id: string;
    fileName: string;
    fileType: string;
    status: string;
    rowCount: number;
    colCount: number;
    columns: string[];
    uploadedAt: string;
}

interface CleaningStats {
    nullsFilled: number;
    duplicatesRemoved: number;
    datesNormalized: number;
    currenciesNormalized: number;
    textsStandardized: number;
    emptyColumnsRemoved: number;
    originalRowCount: number;
    cleanedRowCount: number;
}

interface CleaningSummary {
    sourceId: string;
    fileName: string;
    status: string;
    cleanedAt: string;
    stats: CleaningStats;
}

interface QualityScore {
    id: string;
    sourceId: string;
    overallGrade: string;
    completenessScore: number;
    consistencyScore: number;
    accuracyScore: number;
    riskLevel: string;
    totalRecords: number;
    healthyRecords: number;
    riskyRecords: number;
}

interface ColumnHealthItem {
    id: string;
    columnName: string;
    healthStatus: string;
    completeness: number;
    consistency: number;
    outlierCount: number;
    uniqueness: number;
    issues: string[];
}

interface TransformationAuditItem {
    id: string;
    transformationType: string;
    affectedColumn: string | null;
    affectedRowCount: number;
    beforeValue: string | null;
    afterValue: string | null;
    timestamp: string;
}

export function PurificationAuditPanel({
    projectId,
    isOpen,
    onClose,
    domainColor,
}: PurificationAuditPanelProps) {
    const [sources, setSources] = useState<SourceItem[]>([]);
    const [selectedSourceId, setSelectedSourceId] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'overview' | 'columns' | 'audit' | 'alerts'>('overview');
    const [summary, setSummary] = useState<CleaningSummary | null>(null);
    const [quality, setQuality] = useState<QualityScore | null>(null);
    const [columns, setColumns] = useState<ColumnHealthItem[]>([]);
    const [audits, setAudits] = useState<TransformationAuditItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [alertSettings, setAlertSettings] = useState<{
        enabled: boolean;
        slackWebhookUrl: string;
        notificationEmail: string;
        thresholdPercent: number;
    }>({
        enabled: false,
        slackWebhookUrl: '',
        notificationEmail: '',
        thresholdPercent: 15,
    });
    const [fetchingAlerts, setFetchingAlerts] = useState<boolean>(false);
    const [savingAlerts, setSavingAlerts] = useState<boolean>(false);

    // Fetch project alerts configuration
    const fetchAlertSettings = useCallback(async () => {
        setFetchingAlerts(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/alerts`);
            if (res.ok) {
                const data = await res.json();
                if (data.settings) {
                    setAlertSettings({
                        enabled: !!data.settings.enabled,
                        slackWebhookUrl: data.settings.slackWebhookUrl || '',
                        notificationEmail: data.settings.notificationEmail || '',
                        thresholdPercent: typeof data.settings.thresholdPercent === 'number' ? data.settings.thresholdPercent : 15,
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch alert settings:', err);
        } finally {
            setFetchingAlerts(false);
        }
    }, [projectId]);

    const handleSaveAlertSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingAlerts(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/alerts`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alertSettings),
            });
            if (res.ok) {
                const data = await res.json();
                toast.success('Alert settings updated successfully.');
                if (data.settings) {
                    setAlertSettings({
                        enabled: !!data.settings.enabled,
                        slackWebhookUrl: data.settings.slackWebhookUrl || '',
                        notificationEmail: data.settings.notificationEmail || '',
                        thresholdPercent: typeof data.settings.thresholdPercent === 'number' ? data.settings.thresholdPercent : 15,
                    });
                }
            } else {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to update alert settings.');
            }
        } catch (err: any) {
            console.error('Save alert settings error:', err);
            toast.error(err.message || 'Failed to save alert settings.');
        } finally {
            setSavingAlerts(false);
        }
    };

    // Fetch project sources
    const fetchSources = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${projectId}/sources`);
            if (!res.ok) throw new Error('Failed to retrieve project sources.');
            const data = await res.json();
            const projectSources = data.sources || [];
            setSources(projectSources);
            
            if (projectSources.length > 0) {
                setSelectedSourceId(projectSources[0].id);
            }
        } catch (err: any) {
            console.error('Sources fetch error:', err);
            setError(err.message || 'Failed to load sources.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    // Fetch detailed lineage data for selected source
    const fetchLineageDetails = useCallback(async (sourceId: string) => {
        if (!sourceId) return;
        setLoading(true);
        try {
            // 1. Fetch cleaning summary
            const summaryRes = await fetch(`/api/sources/${sourceId}/cleaning-summary`);
            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                setSummary(summaryData.summary);
            } else {
                setSummary(null);
            }

            // 2. Fetch quality metrics
            const qualityRes = await fetch(`/api/sources/${sourceId}/quality`);
            if (qualityRes.ok) {
                const qualityData = await qualityRes.json();
                setQuality(qualityData.quality);
            } else {
                setQuality(null);
            }

            // 3. Fetch column health profile
            const columnsRes = await fetch(`/api/sources/${sourceId}/column-health`);
            if (columnsRes.ok) {
                const columnsData = await columnsRes.json();
                setColumns(columnsData.columnHealths || []);
            } else {
                setColumns([]);
            }

            // 4. Fetch transformation audit log
            const auditRes = await fetch(`/api/sources/${sourceId}/audit-log`);
            if (auditRes.ok) {
                const auditData = await auditRes.json();
                setAudits(auditData.auditLog || []);
            } else {
                setAudits([]);
            }
        } catch (err: any) {
            console.error('Details fetch error:', err);
            toast.error('Failed to update quality information.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchSources();
            fetchAlertSettings();
        }
    }, [isOpen, fetchSources, fetchAlertSettings]);

    useEffect(() => {
        if (selectedSourceId) {
            fetchLineageDetails(selectedSourceId);
        }
    }, [selectedSourceId, fetchLineageDetails]);

    if (!isOpen) return null;

    // Helper to render health status grade colors
    const getGradeBadgeClass = (grade: string) => {
        switch (grade?.toUpperCase()) {
            case 'A': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
            case 'B': return 'bg-teal-500/20 text-teal-400 border border-teal-500/30';
            case 'C': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
            case 'D': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
            default: return 'bg-red-500/20 text-red-400 border border-red-500/30';
        }
    };

    const getRiskBadgeClass = (risk: string) => {
        switch (risk?.toUpperCase()) {
            case 'LOW': return 'bg-emerald-500/20 text-emerald-400';
            case 'MEDIUM': return 'bg-amber-500/20 text-amber-400';
            default: return 'bg-red-500/20 text-red-400';
        }
    };

    return (
        <>
            {/* Backdrop blur */}
            <div className="insight-panel-backdrop" onClick={onClose} style={{ zIndex: 90 }} />

            {/* Sliding Panel overlay */}
            <div 
                className="insight-panel open" 
                style={{ 
                    width: '480px', 
                    maxWidth: '100%', 
                    zIndex: 100, 
                    background: '#0F172A', 
                    color: '#E2E8F0',
                    fontFamily: '"Fira Sans", sans-serif'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-500 text-xl">health_and_safety</span>
                        <div>
                            <h2 className="text-base font-bold text-white leading-tight">Data Quality & Governance Center</h2>
                            <p className="text-[10px] text-slate-400 font-medium">Cleaning Audits & Lineage Tracker</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-white transition-colors"
                        style={{ fontSize: '18px' }}
                    >
                        ✕
                    </button>
                </div>

                {/* Source Selection Dropdown */}
                <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex flex-col gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Data Source File</label>
                    {sources.length > 0 ? (
                        <div className="relative">
                            <select
                                value={selectedSourceId}
                                onChange={(e) => setSelectedSourceId(e.target.value)}
                                className="w-full bg-slate-850 border border-slate-700 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-slate-500 transition-colors cursor-pointer appearance-none"
                            >
                                {sources.map((src) => (
                                    <option key={src.id} value={src.id}>
                                        {src.fileName} ({src.fileType.toUpperCase()})
                                    </option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-2.5 text-xs text-slate-400 pointer-events-none">
                                keyboard_arrow_down
                            </span>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500 py-1 font-medium">No sources uploaded for this project.</div>
                    )}
                </div>

                {loading && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                        <span className="text-xs text-slate-400 font-medium">Updating Lineage Registry...</span>
                    </div>
                )}

                {error && !loading && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <span className="material-symbols-outlined text-3xl text-red-500 mb-2">error</span>
                        <p className="text-xs text-red-400 font-medium">{error}</p>
                    </div>
                )}

                {!loading && !error && selectedSourceId && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Tabs Selector */}
                        <div className="flex border-b border-slate-800">
                            {(['overview', 'columns', 'audit', 'alerts'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    className={`flex-1 text-xs py-3 font-semibold transition-colors uppercase tracking-wider ${
                                        activeTab === tab 
                                            ? 'text-amber-400 border-b-2 border-amber-400 bg-slate-900/20' 
                                            : 'text-slate-400 hover:text-slate-200'
                                    }`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content Panels */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                            
                            {/* Tab 1: Overview */}
                            {activeTab === 'overview' && (
                                <div className="space-y-5">
                                    {/* Overall Quality Rating Grade Card */}
                                    {quality && (
                                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-inner">
                                            <div className="space-y-1">
                                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Overall Dataset Health</div>
                                                <div className="text-[10px] text-slate-500">Calculated across consistency & correctness parameters</div>
                                                <div className="flex gap-2 items-center mt-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${getRiskBadgeClass(quality.riskLevel)}`}>
                                                        {quality.riskLevel} Risk
                                                    </span>
                                                    <span className="text-[11px] text-slate-400 font-medium">
                                                        {quality.healthyRecords} of {quality.totalRecords} clean rows
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center font-mono font-bold text-2xl ${getGradeBadgeClass(quality.overallGrade)}`}>
                                                {quality.overallGrade}
                                            </div>
                                        </div>
                                    )}

                                    {/* Quality Progress Indicators */}
                                    {quality && (
                                        <div className="bg-slate-900/20 border border-slate-850 rounded-xl p-4 space-y-4">
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wide">Quality Scores</h4>
                                            
                                            {[
                                                { label: 'Completeness', score: quality.completenessScore, desc: 'Presence of expected values across all rows' },
                                                { label: 'Consistency', score: quality.consistencyScore, desc: 'Pattern and structure uniformity across columns' },
                                                { label: 'Accuracy', score: quality.accuracyScore, desc: 'Outlier resistance and validity metrics' }
                                            ].map((item) => (
                                                <div key={item.label} className="space-y-1.5">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-semibold text-slate-300">{item.label}</span>
                                                        <span className="font-mono font-bold" style={{ color: domainColor }}>
                                                            {item.score.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full transition-all duration-500" 
                                                            style={{ 
                                                                width: `${item.score}%`,
                                                                backgroundColor: domainColor 
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-slate-500 font-medium leading-tight">{item.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Purification Stats Summary Card */}
                                    {summary && (
                                        <div className="bg-slate-900/20 border border-slate-850 rounded-xl p-4 space-y-3">
                                            <h4 className="text-xs font-bold text-white uppercase tracking-wide">Purification Operations</h4>
                                            
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-slate-900/30 p-2.5 rounded-lg border border-slate-850 text-center">
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Input Rows</div>
                                                    <div className="text-lg font-mono font-bold text-slate-300">{summary.stats.originalRowCount}</div>
                                                </div>
                                                <div className="bg-slate-900/30 p-2.5 rounded-lg border border-slate-850 text-center">
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase">Sanitized Rows</div>
                                                    <div className="text-lg font-mono font-bold text-slate-300">{summary.stats.cleanedRowCount}</div>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-800/80 pt-3 space-y-2 text-xs">
                                                {[
                                                    { label: 'Imputed Null Fields', val: summary.stats.nullsFilled, icon: 'edit_square' },
                                                    { label: 'Deduplicated Rows', val: summary.stats.duplicatesRemoved, icon: 'content_copy' },
                                                    { label: 'ISO Dates Normalized', val: summary.stats.datesNormalized, icon: 'calendar_today' },
                                                    { label: 'Currencies Standardized', val: summary.stats.currenciesNormalized, icon: 'payments' },
                                                    { label: 'Text Fields Standardized', val: summary.stats.textsStandardized, icon: 'font_download' },
                                                    { label: 'Empty Columns Pruned', val: summary.stats.emptyColumnsRemoved, icon: 'delete_sweep' }
                                                ].map((stat) => (
                                                    <div key={stat.label} className="flex justify-between items-center text-slate-400">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-[14px] text-slate-500">{stat.icon}</span>
                                                            <span>{stat.label}</span>
                                                        </div>
                                                        <span className="font-mono font-bold text-slate-300">{stat.val}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab 2: Columns */}
                            {activeTab === 'columns' && (
                                <div className="space-y-4">
                                    <div className="text-xs text-slate-400 font-medium">Column-level validation grades and structural anomalies:</div>
                                    {columns.length > 0 ? (
                                        <div className="space-y-3">
                                            {columns.map((col) => (
                                                <div key={col.id} className="bg-slate-900/30 border border-slate-850 rounded-xl p-3.5 space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <div className="min-w-0">
                                                            <div className="text-xs font-mono font-bold text-slate-200 truncate">{col.columnName}</div>
                                                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                                Completeness: {col.completeness.toFixed(1)}% | Uniqueness: {col.uniqueness.toFixed(1)}%
                                                            </div>
                                                        </div>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                                            col.healthStatus === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-400' :
                                                            col.healthStatus === 'DEGRADED' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                                                        }`}>
                                                            {col.healthStatus}
                                                        </span>
                                                    </div>

                                                    {col.outlierCount > 0 && (
                                                        <div className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-950/20 border border-red-900/30 rounded p-1 px-2">
                                                            <span className="material-symbols-outlined text-xs">warning</span>
                                                            <span>Detected {col.outlierCount} numeric outliers (IQR filtered).</span>
                                                        </div>
                                                    )}

                                                    {col.issues && col.issues.length > 0 && (
                                                        <div className="space-y-1">
                                                            {col.issues.map((issue, idx) => (
                                                                <div key={idx} className="text-[9px] text-slate-400 flex items-start gap-1">
                                                                    <span className="text-slate-500 font-bold">•</span>
                                                                    <span>{issue}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-500 text-xs py-8">No column health profile available.</div>
                                    )}
                                </div>
                            )}

                            {/* Tab 3: Audit Log */}
                            {activeTab === 'audit' && (
                                <div className="space-y-4">
                                    <div className="text-xs text-slate-400 font-medium">Pipeline execution logs for data normalization:</div>
                                    {audits.length > 0 ? (
                                        <div className="relative border-l border-slate-800 ml-2.5 pl-4 space-y-5">
                                            {audits.map((item) => (
                                                <div key={item.id} className="relative">
                                                    {/* Timeline node */}
                                                    <span 
                                                        className="absolute -left-[22px] mt-1.5 w-3 h-3 rounded-full border-2 border-[#0F172A]"
                                                        style={{ backgroundColor: domainColor }}
                                                    />
                                                    
                                                    <div className="bg-slate-900/20 border border-slate-850 rounded-xl p-3.5 space-y-1.5">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-bold text-white uppercase tracking-wider">{item.transformationType.replace(/_/g, ' ')}</span>
                                                            <span className="text-[9px] text-slate-500 font-mono font-medium">
                                                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-300 leading-tight">
                                                            Purified <span className="font-semibold text-white">{item.affectedRowCount} fields</span>
                                                            {item.affectedColumn && <span> in column <code className="text-amber-400 font-mono text-[10px]">{item.affectedColumn}</code></span>}.
                                                        </p>
                                                        {(item.beforeValue || item.afterValue) && (
                                                            <div className="bg-slate-950/40 p-2 rounded text-[10px] font-mono text-slate-400 space-y-0.5 border border-slate-850">
                                                                {item.beforeValue && <div><span className="text-slate-600 font-bold">Input Pattern:</span> {item.beforeValue}</div>}
                                                                {item.afterValue && <div><span className="text-slate-600 font-bold">Output Pattern:</span> {item.afterValue}</div>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-slate-500 text-xs py-8">No transformation audits recorded for this source.</div>
                                    )}
                                </div>
                            )}

                            {/* Tab 4: Alerts */}
                            {activeTab === 'alerts' && (
                                <form onSubmit={handleSaveAlertSettings} className="space-y-5">
                                    {fetchingAlerts ? (
                                        <div className="flex flex-col items-center justify-center p-8 gap-3">
                                            <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                                            <span className="text-[10px] text-slate-400 font-medium">Loading settings...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-slate-900/20 border border-slate-850 rounded-xl p-4 space-y-4 shadow-inner">
                                                <div className="flex items-center justify-between">
                                                    <div className="space-y-0.5">
                                                        <label htmlFor="alerts-enabled" className="text-xs font-bold text-slate-300 uppercase tracking-wide cursor-pointer">Enable Outbound Alerts</label>
                                                        <p className="text-[10px] text-slate-500 font-medium leading-tight">Dispatch webhooks and emails on anomaly detection</p>
                                                    </div>
                                                    <div className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            id="alerts-enabled"
                                                            className="sr-only peer"
                                                            checked={alertSettings.enabled}
                                                            onChange={(e) => setAlertSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                                                        />
                                                        <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-slate-900 peer-checked:after:border-slate-900"></div>
                                                    </div>
                                                </div>

                                                <hr className="border-slate-850" />

                                                {/* Slack Webhook Input */}
                                                <div className="space-y-1.5">
                                                    <label htmlFor="slack-webhook" className="text-xs font-semibold text-slate-300">Slack Webhook URL</label>
                                                    <input
                                                        type="url"
                                                        id="slack-webhook"
                                                        placeholder="https://hooks.slack.com/services/..."
                                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 outline-none focus:border-slate-700 transition-colors"
                                                        value={alertSettings.slackWebhookUrl}
                                                        onChange={(e) => setAlertSettings(prev => ({ ...prev, slackWebhookUrl: e.target.value }))}
                                                        disabled={!alertSettings.enabled}
                                                    />
                                                    <p className="text-[9px] text-slate-500">Slack incoming webhook endpoint for channel alerts</p>
                                                </div>

                                                {/* Notification Email Input */}
                                                <div className="space-y-1.5">
                                                    <label htmlFor="notification-email" className="text-xs font-semibold text-slate-300">Target Notification Email</label>
                                                    <input
                                                        type="email"
                                                        id="notification-email"
                                                        placeholder="ops@company.com"
                                                        className="w-full bg-slate-950/50 border border-slate-800 rounded-lg py-2 px-3 text-xs text-white placeholder-slate-600 outline-none focus:border-slate-700 transition-colors"
                                                        value={alertSettings.notificationEmail}
                                                        onChange={(e) => setAlertSettings(prev => ({ ...prev, notificationEmail: e.target.value }))}
                                                        disabled={!alertSettings.enabled}
                                                    />
                                                    <p className="text-[9px] text-slate-500">Recipient email address for anomaly alerts</p>
                                                </div>

                                                <hr className="border-slate-850" />

                                                {/* Threshold slider */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-semibold text-slate-300">Anomaly Trigger Threshold</span>
                                                        <span className="font-mono font-bold text-amber-500">{alertSettings.thresholdPercent}%</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="5"
                                                        max="100"
                                                        step="5"
                                                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                        value={alertSettings.thresholdPercent}
                                                        onChange={(e) => setAlertSettings(prev => ({ ...prev, thresholdPercent: parseInt(e.target.value, 10) }))}
                                                        disabled={!alertSettings.enabled}
                                                    />
                                                    <p className="text-[9px] text-slate-500">Trigger notifications when a KPI value deviates by more than this percent</p>
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                className="w-full text-xs py-2.5 px-4 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                                style={{
                                                    backgroundColor: alertSettings.enabled ? domainColor : '#1E293B',
                                                    color: alertSettings.enabled ? '#0F172A' : '#64748B',
                                                    cursor: savingAlerts ? 'not-allowed' : 'pointer'
                                                }}
                                                disabled={savingAlerts}
                                            >
                                                {savingAlerts ? (
                                                    <>
                                                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900/20 border-t-slate-900 animate-spin" />
                                                        Saving Settings...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-sm">save</span>
                                                        Save Alert Settings
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </form>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
