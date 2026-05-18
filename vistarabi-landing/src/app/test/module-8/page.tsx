"use client";

import React, { useMemo, useState } from 'react';
import StrategyCanvas from '@/components/module-8/StrategyCanvas';
import AIChatPanel from '@/components/module-8/AIChatPanel';
import { PlayCircle, Target, ArrowRight, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StrategyCanvasResult } from '@/lib/module-8/types';
import html2canvas from 'html2canvas';

export default function Module8IntegratedPage() {
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  // Lifted state: Both Canvas and AI Chat now share this context
  const [simulationContext, setSimulationContext] = useState<StrategyCanvasResult | null>(null);
  const demoKpiHistory = useMemo(() => {
    const start = new Date('2026-01-01T00:00:00.000Z');
    return Array.from({ length: 120 }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return {
        date: date.toISOString().slice(0, 10),
        value: Math.round(50000 + index * 120 + Math.sin(index / 6) * 1000),
      };
    });
  }, []);

  const handleGenerateReport = async () => {
    if (!simulationContext) return;
    setIsGeneratingReport(true);

    try {
      // 1. Target the Strategy Canvas DOM element
      const chartElement = document.getElementById('strategy-canvas-container');
      if (!chartElement) throw new Error("Chart element not found");

      // 2. Capture it as a base64 PNG
      const canvas = await html2canvas(chartElement, { scale: 2 });
      const chartImageBase64 = canvas.toDataURL('image/png');

      const gap = Math.max(0, 75000 - simulationContext.scenarios.baseline[simulationContext.scenarios.baseline.length - 1].yhat);

      // 3. Build the Payload
      const payload = {
        chartImage: chartImageBase64,
        metrics: {
          probability: simulationContext.probabilityOfSuccess,
          reliability: simulationContext.reliabilityScore,
          gap: gap
        },
        chatSummary: "User tested various ramp-up periods and uplift percentages to optimize the goal trajectory." // Mock chat summary since we don't lift chat state yet
      };

      // 4. Send to API
      const response = await fetch('/api/v1/report/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to generate report");

      // 5. Trigger File Download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'VistaraBI_Executive_Report.pdf';
      a.click();
    } catch (error) {
      console.error("Report generation failed", error);
      alert("Failed to generate Executive Report.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-200 text-slate-900 font-sans">
      
      {/* INITIAL HERO STATE (Before Opening Canvas) */}
      <AnimatePresence mode="wait">
        {!isCanvasOpen && (
          <motion.div 
            key="hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-gradient-to-b from-slate-100 to-slate-200"
          >
            <div className="w-20 h-20 bg-white text-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/10 border border-slate-100">
              <Target className="w-10 h-10" />
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">
              Strategic Decision <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">Simulator</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mb-10 leading-relaxed font-medium">
              Go beyond BI. Module 8 takes your goals and runs 1,000 Monte Carlo simulations against historical baselines to prove if your strategy will actually work.
            </p>
            
            <button 
              onClick={() => setIsCanvasOpen(true)}
              className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-300 bg-slate-900 border border-transparent rounded-full hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/30 focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-indigo-600 hover:-translate-y-1"
            >
              <PlayCircle className="w-5 h-5 mr-3" />
              <span className="text-lg">Open Simulator</span>
              <ArrowRight className="w-5 h-5 ml-3 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
            </button>
          </motion.div>
        )}

        {/* ACTIVE CANVAS STATE */}
        {isCanvasOpen && (
          <motion.div 
            key="canvas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen overflow-hidden bg-slate-200"
          >
            {/* Top Navigation Bar */}
            <div className="h-16 bg-white border-b border-slate-200 px-6 flex justify-between items-center shrink-0 shadow-sm z-10 relative">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-900 leading-tight">Strategy Canvas</h1>
                  <p className="text-xs text-slate-500 font-medium leading-tight">Module 8 Simulator</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleGenerateReport}
                  disabled={!simulationContext || isGeneratingReport}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg transition-colors shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  {isGeneratingReport ? 'Generating PDF...' : 'Executive Report'}
                </button>
                <div className="w-px h-6 bg-slate-200 mx-2"></div>
                <button 
                  onClick={() => setIsCanvasOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Exit <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Split Layout Container */}
            <div className="flex-1 flex overflow-hidden p-4 gap-4 max-w-[1920px] mx-auto w-full">
              
              {/* Left/Main Area: The Strategy Canvas */}
              <div id="strategy-canvas-container" className="w-[70%] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <StrategyCanvas
                  initialContext={{
                    goalValue: 75000,
                    actionName: 'Expansion Campaign',
                    kpiHistory: demoKpiHistory,
                    uplift: 15,
                  }}
                  onSimulationComplete={(data) => setSimulationContext(data)}
                />
              </div>
              
              {/* Right Area: AI Governance Chat */}
              <div className="w-[30%]">
                <AIChatPanel simulationContext={simulationContext} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
