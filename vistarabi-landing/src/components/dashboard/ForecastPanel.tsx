'use client';

// Module 8 — AI Forecasting Panel
// Focused purely on time-series predictive modeling without Goal Strategy overhead

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import StrategyCanvas from '@/components/module-8/StrategyCanvas';
import { resolveForecastHistory, type DashboardKpiExecutionItem } from '@/lib/module-8/kpi-history-resolver';
import { LineChart, X, Download, Bot } from 'lucide-react';
import { DashboardErrorBoundary } from './DashboardErrorBoundary';
import AIChatPanel from '@/components/module-8/AIChatPanel';

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
    const [simulationContext, setSimulationContext] = useState<any>(null);
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

    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const handleGenerateReport = async () => {
        if (!simulationContext) return;
        setIsGeneratingReport(true);
        try {
          let chartImageBase64 = null;
          try {
            const chartElement = document.getElementById('strategy-canvas-container');
            if (chartElement) {
                const { default: html2canvas } = await import('html2canvas');
                const canvasEl = await html2canvas(chartElement, { scale: 2 });
                chartImageBase64 = canvasEl.toDataURL('image/png');
            }
          } catch (e) {
            console.warn("UI capture failed.", e);
          }
          
          const targetGoalVal = Math.round(kpiHistory[kpiHistory.length - 1]?.value * 1.1 || 100);
          const payload = {
            chartImage: chartImageBase64,
            dashboardImage: null,
            domain: "Predictive Analytics",
            selectedKPIs: activeKPIs,
            uploadedDatasets: [],
            cleaningSummary: "Predictive baseline forecast generated for KPI.",
            actions: [{ title: "Baseline AI Projection", impact: "MEDIUM" }],
            forecastData: {
                kpi: selectedKPI,
                trend: simulationContext.probabilityOfSuccess > 0.5 ? 'Upward trajectory' : 'Stagnant or downward trajectory',
                confidence: simulationContext.reliabilityScore > 80 ? 'High' : 'Moderate'
            },
            metrics: {
              probability: simulationContext.probabilityOfSuccess,
              reliability: simulationContext.reliabilityScore,
              gap: 0,
              target: targetGoalVal
            },
            chatSummary: `Baseline projection generated for ${selectedKPI.replace(/_/g, ' ')}. No simulated actions applied.`,
            globalChatSummary: 'No recent exploratory questions logged.',
            module6Question: "",
            module6Answer: "",
            kpiHistory: kpiHistory,
            forecastScenarios: simulationContext?.scenarios,
            strategyCanvas: { goal: { targetMetric: selectedKPI, timeframe: "180 days", targetValue: String(targetGoalVal) } },
            module6ChatHistory: []
          };
    
          const response = await fetch('/api/v1/report/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
    
          if (!response.ok) throw new Error("Failed to generate report");
    
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `VistaraBI_Forecast_${selectedKPI.replace(/_/g, '-')}.pdf`;
          a.click();
        } catch (error) {
          console.error("Report generation failed", error);
          alert("Failed to generate PDF Report.");
        } finally {
          setIsGeneratingReport(false);
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
        <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col font-sans overflow-hidden">
            {/* Header */}
            <div className="h-16 bg-white border-b border-slate-200 px-6 flex justify-between items-center shrink-0 shadow-md z-10 relative">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-sm">
                        <LineChart className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-900 leading-tight">AI Predictive Forecaster Cockpit</h1>
                        <p className="text-xs text-slate-500 font-medium leading-tight">Time-Series Simulation Engine | Module 8</p>
                    </div>
                    {domainModel && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold border border-violet-200">
                            <Bot className="w-3 h-3" />
                            {domainModel.replace('vistara-analytics-', '').toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {showCanvas && (
                        <button
                            onClick={handleExportChart}
                            disabled={exporting}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                            title="Export forecast chart as PNG"
                        >
                            <Download className="w-4 h-4" />
                            {exporting ? 'Exporting...' : 'Export PNG'}
                        </button>
                    )}
                    <div className="w-px h-8 bg-slate-200 mx-2"></div>
                    <button 
                        onClick={onClose}
                        className="flex items-center justify-center w-10 h-10 text-slate-500 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors"
                        title="Close Forecaster"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 max-w-[2000px] mx-auto w-full">
                {!showCanvas ? (
                    <div className="flex flex-col gap-4 max-w-lg mx-auto w-full mt-20 p-8 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                                <LineChart className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Select Metric to Forecast</h3>
                            <p className="text-sm text-slate-500 mt-1">Run non-linear probabilistic models on your KPI history</p>
                        </div>

                        <select 
                            value={selectedKPI} 
                            onChange={e => setSelectedKPI(e.target.value)}
                            className="w-full p-4 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-slate-50"
                        >
                            {activeKPIs.map((kpi, idx) => (
                                <option key={kpi.name || idx} value={kpi.name}>{kpi.name.replace(/_/g, ' ')}</option>
                            ))}
                        </select>

                        <button
                            onClick={handleRunForecast}
                            disabled={loading}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all flex justify-center items-center gap-2 text-sm mt-2"
                        >
                            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LineChart className="w-5 h-5" />}
                            Generate Forecast
                        </button>

                        {error && (
                            <div className="p-4 bg-rose-50 text-rose-600 text-sm rounded-xl border border-rose-100 flex items-start gap-2.5 mt-4">
                                <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full min-h-[750px]">
                        {/* Forecast Chart */}
                        <div ref={canvasRef} className="xl:col-span-2 w-full h-full bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">{selectedKPI.replace(/_/g, ' ')} Forecast</h3>
                                    <p className="text-xs text-slate-400">Additive time-series forecast model</p>
                                </div>
                                <button 
                                    onClick={() => setShowCanvas(false)} 
                                    className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    Select Another KPI
                                </button>
                            </div>
                            <div className="flex-1 w-full relative min-h-[500px]">
                                <DashboardErrorBoundary label="Forecast Canvas">
                                    <StrategyCanvas 
                                        initialContext={{
                                            goalValue: Math.round(kpiHistory[kpiHistory.length - 1]?.value * 1.1 || 100),
                                            actionName: "Baseline AI Projection",
                                            kpiHistory,
                                            uplift: 0,
                                            metricName: selectedKPI
                                        }}
                                        onSimulationComplete={setSimulationContext}
                                    />
                                </DashboardErrorBoundary>
                            </div>
                        </div>

                        {/* Forecast Sidebar / Insights + Chat */}
                        <div className="xl:col-span-1 w-full bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col h-[700px]">
                            <div className="p-6 shrink-0 flex flex-col gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Forecast Insights</h3>
                                    <p className="text-xs text-slate-400">Statistical properties of {selectedKPI.replace(/_/g, ' ')}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Last Value</span>
                                        <span className="text-xl font-extrabold text-slate-900">
                                            {kpiHistory[kpiHistory.length - 1]?.value?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? 'N/A'}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Growth Trend</span>
                                        <span className="text-xl font-extrabold text-emerald-600 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-base">trending_up</span>
                                            +10%
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 min-h-0 border-t border-slate-100 bg-slate-50">
                                <AIChatPanel 
                                    simulationContext={simulationContext} 
                                    onSaveToReport={() => {
                                        toast.success("Conversation context added to Report Memory!");
                                    }}
                                />
                            </div>

                            <div className="p-4 bg-white border-t border-slate-100 flex flex-col gap-2 shrink-0">
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <button
                                        onClick={handleExportChart}
                                        disabled={exporting || isGeneratingReport}
                                        className="py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl shadow-md transition-all flex justify-center items-center gap-2 text-xs"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        {exporting ? 'Saving...' : 'Save PNG'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const forecastData = {
                                                kpi: selectedKPI,
                                                probabilityOfSuccess: simulationContext?.probabilityOfSuccess || 0.85,
                                                reliabilityScore: simulationContext?.reliabilityScore || 80,
                                                scenarios: simulationContext?.scenarios,
                                                history: kpiHistory
                                            };
                                            localStorage.setItem('vistara_saved_forecast', JSON.stringify(forecastData));
                                            toast.success(`${selectedKPI.replace(/_/g, ' ')} baseline forecast added to Report Cart!`);
                                        }}
                                        className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex justify-center items-center gap-2 text-xs"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Save to Report
                                    </button>
                                </div>
                                <button 
                                    onClick={() => setShowCanvas(false)}
                                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-center text-sm"
                                >
                                    Select Another KPI
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
