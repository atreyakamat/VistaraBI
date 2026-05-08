'use client';

// Module 8 — AI Forecasting Panel
// Focused purely on time-series predictive modeling without Goal Strategy overhead

import { useState, useEffect, useRef } from 'react';
import StrategyCanvas from '@/components/module-8/StrategyCanvas';
import { resolveForecastHistory, type DashboardKpiExecutionItem } from '@/lib/module-8/kpi-history-resolver';
import { LineChart, X, Download, Bot } from 'lucide-react';
import { DashboardErrorBoundary } from './DashboardErrorBoundary';

interface ForecastPanelProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    activeKPIs: Array<{ name: string; category: string }>;
    domainModel?: string; // active Ollama model name for this project
}

export function ForecastPanel({ projectId, isOpen, onClose, activeKPIs, domainModel }: ForecastPanelProps) {
    const [selectedKPI, setSelectedKPI] = useState<string>('');
    const [kpiHistory, setKpiHistory] = useState<{ date: string; value: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCanvas, setShowCanvas] = useState(false);
    const [exporting, setExporting] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);

    const handleExportChart = async () => {
        if (!canvasRef.current) return;
        setExporting(true);
        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = await html2canvas(canvasRef.current, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
            });
            const link = document.createElement('a');
            link.download = `${selectedKPI.replace(/_/g, '-')}-forecast.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error('Export failed:', e);
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setShowCanvas(false);
            setKpiHistory([]);
            return;
        }
        if (activeKPIs.length > 0 && !selectedKPI) {
            setSelectedKPI(activeKPIs[0].name);
        }
    }, [isOpen, activeKPIs, selectedKPI]);

    const handleRunForecast = async () => {
        if (!selectedKPI) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboard/data`);
            if (!res.ok) throw new Error('Failed to fetch dashboard data');
            const d = await res.json();
            
            const executionKpis = Array.isArray(d?.kpis) ? (d.kpis as DashboardKpiExecutionItem[]) : [];
            const history = resolveForecastHistory(selectedKPI, executionKpis);
            
            if (history.length < 2) {
                throw new Error("Insufficient historical data for accurate forecasting. At least 2 data points required.");
            }
            
            setKpiHistory(history);
            setShowCanvas(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />
            <div className="fixed right-0 top-0 bottom-0 w-[800px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
                {/* Header */}
                <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <LineChart className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">AI Predictive Forecaster</h2>
                            <p className="text-[10px] text-slate-500 font-medium">Time-Series Simulation Engine</p>
                        </div>
                        {domainModel && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold border border-violet-200">
                                <Bot className="w-2.5 h-2.5" />
                                {domainModel}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {showCanvas && (
                            <button
                                onClick={handleExportChart}
                                disabled={exporting}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
                                title="Export forecast chart as PNG"
                            >
                                <Download className="w-3 h-3" />
                                {exporting ? 'Exporting...' : 'Export PNG'}
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                    {!showCanvas ? (
                        <div className="flex flex-col gap-4 max-w-md mx-auto w-full mt-12">
                            <div className="text-center mb-4">
                                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <LineChart className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Select Metric to Forecast</h3>
                                <p className="text-sm text-slate-500 mt-1">Run non-linear probabilistic models on your KPI history</p>
                            </div>

                            <select 
                                value={selectedKPI} 
                                onChange={e => setSelectedKPI(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            >
                                {activeKPIs.map(kpi => (
                                    <option key={kpi.name} value={kpi.name}>{kpi.name.replace(/_/g, ' ')}</option>
                                ))}
                            </select>

                            <button
                                onClick={handleRunForecast}
                                disabled={loading}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                            >
                                {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LineChart className="w-4 h-4" />}
                                Generate Forecast
                            </button>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-start gap-2">
                                    <span className="material-symbols-outlined text-base shrink-0">error</span>
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-[600px]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-slate-800">{selectedKPI.replace(/_/g, ' ')} Forecast</h3>
                                <button onClick={() => setShowCanvas(false)} className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold">
                                    ← Select Another KPI
                                </button>
                            </div>
                            <div ref={canvasRef} className="flex-1 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm p-4">
                                <DashboardErrorBoundary label="Forecast Canvas">
                                    <StrategyCanvas 
                                        initialContext={{
                                            goalValue: kpiHistory[kpiHistory.length - 1].value * 1.1,
                                            actionName: "Baseline AI Projection",
                                            kpiHistory,
                                            uplift: 0
                                        }}
                                    />
                                </DashboardErrorBoundary>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
