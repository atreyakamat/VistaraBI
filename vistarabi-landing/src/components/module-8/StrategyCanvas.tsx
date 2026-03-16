"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area, ComposedChart, ReferenceLine
} from 'recharts';
import { Activity, AlertTriangle, TrendingUp, CheckCircle, Settings, SlidersHorizontal } from 'lucide-react';
import { ForecastRequest, StrategyCanvasResult } from '@/lib/module-8/types';
import { motion } from 'framer-motion';

interface StrategyCanvasProps {
  onSimulationComplete?: (data: StrategyCanvasResult) => void;
  initialContext?: {
    goalValue: number;
    actionName: string;
    kpiHistory: { date: string, value: number }[];
    uplift: number;
  };
}

export default function StrategyCanvas({ onSimulationComplete, initialContext }: StrategyCanvasProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StrategyCanvasResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [goalValue, setGoalValue] = useState(initialContext?.goalValue ?? 75000);
  const [horizonDays, setHorizonDays] = useState(180);
  const [actionName, setActionName] = useState(initialContext?.actionName ?? "Email Campaign");
  const [uplift, setUplift] = useState(initialContext?.uplift ?? 15); // Percentage
  const [rampDays, setRampDays] = useState(30);
  const [startDay, setStartDay] = useState(14);

  // Generate some dummy historical data for the simulation or use initialContext
  const [history] = useState(() => {
    if (initialContext?.kpiHistory && initialContext.kpiHistory.length > 0) {
      return initialContext.kpiHistory;
    }
    const pts = [];
    let val = 50000;
    const now = new Date();
    for (let i = 180; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      val += (Math.random() - 0.4) * 500; // General upward trend
      pts.push({ date: d.toISOString().split('T')[0], value: val });
    }
    return pts;
  });

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: ForecastRequest = {
        kpiHistory: history,
        goalValue,
        horizonDays,
        confidenceLevel: 0.95,
        actions: [
          {
            id: '1',
            name: actionName,
            expectedUplift: uplift / 100,
            rampDays,
            startDayOffset: startDay
          }
        ]
      };

      const res = await fetch('/api/v1/forecast/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const result: StrategyCanvasResult = await res.json();
      setData(result);
      if (onSimulationComplete) {
        onSimulationComplete(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run simulation');
    } finally {
      setLoading(false);
    }
  }, [history, goalValue, horizonDays, actionName, uplift, rampDays, startDay, onSimulationComplete]);

  // Auto-run simulation on mount and when sliders change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      runSimulation();
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [runSimulation]);

  // Format data for Recharts
  const chartData = React.useMemo(() => {
    if (!data) return [];
    return data.scenarios.baseline.map((base, i) => {
      const opt = data.scenarios.optimistic[i];
      const cons = data.scenarios.conservative[i];
      return {
        day: base.day,
        date: base.date,
        Baseline: base.yhat,
        ConfidenceLower: base.yhatLower,
        ConfidenceUpper: base.yhatUpper,
        Optimistic: opt.yhat,
        Conservative: cons.yhat
      };
    });
  }, [data]);

  return (
    <div className="flex flex-col lg:flex-row h-full">
      
      {/* LEFT PANEL: Sliders & Controls */}
      <div className="w-full lg:w-80 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">Strategy Levers</h2>
        </div>

        <div className="space-y-5">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target KPI</label>
            <div className="flex items-center">
              <span className="text-slate-400 font-medium mr-2">$</span>
              <input 
                type="number" 
                value={goalValue} 
                onChange={(e) => setGoalValue(Number(e.target.value))}
                className="w-full text-lg font-bold text-slate-900 focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Primary Action</label>
            <input 
              type="text" 
              value={actionName} 
              onChange={(e) => setActionName(e.target.value)}
              className="w-full font-medium text-slate-900 focus:outline-none bg-transparent"
            />
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700">Expected Uplift</label>
                <span className="text-sm px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold">+{uplift}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="50" step="1"
                value={uplift} 
                onChange={(e) => setUplift(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700">Ramp-up (Days)</label>
                <span className="text-sm text-slate-600 font-medium">{rampDays}d</span>
              </div>
              <input 
                type="range" 
                min="1" max="90" step="1"
                value={rampDays} 
                onChange={(e) => setRampDays(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700">Launch Delay</label>
                <span className="text-sm text-slate-600 font-medium">Day {startDay}</span>
              </div>
              <input 
                type="range" 
                min="0" max="90" step="1"
                value={startDay} 
                onChange={(e) => setStartDay(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
          
          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-indigo-600 font-medium animate-pulse">
              <Activity className="w-4 h-4" /> Recalculating Matrix...
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Canvas & Results */}
      <div className="flex-1 p-6 flex flex-col gap-6 bg-white overflow-hidden">
        
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
              <TrendingUp className={`w-6 h-6 ${(data?.probabilityOfSuccess ?? 0) > 0.6 ? 'text-green-500' : 'text-amber-500'}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Probability of Success</p>
              <div className="text-2xl font-black text-slate-900">
                {data ? (data.probabilityOfSuccess * 100).toFixed(1) : '--'}%
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
              <CheckCircle className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Strategy Confidence</p>
              <div className="text-2xl font-black text-slate-900">
                {data ? Math.round((data.reliabilityScore + (data.probabilityOfSuccess * 100)) / 2) : '--'}%
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Strategy Gap</p>
              <div className="text-xl font-bold text-slate-900 line-clamp-1">
                {data ? `$${Math.max(0, goalValue - data.scenarios.baseline[data.scenarios.baseline.length - 1].yhat).toLocaleString(undefined, {maximumFractionDigits: 0})}` : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* The Strategy Canvas Chart */}
        <div className="flex-1 min-h-[400px] flex flex-col">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-lg font-bold text-slate-800">Strategic Decision Canvas</h3>
            <div className="flex gap-4 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Optimistic</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Baseline</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Conservative</span>
            </div>
          </div>

          <div className="flex-1 w-full bg-slate-50/50 rounded-xl border border-slate-100 p-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any, name: any) => [
                      <span key={String(name)} className="font-bold text-slate-700">${Number(value).toFixed(0)}</span>, 
                      <span key={String(name)+"_label"} className="text-slate-500">{String(name)}</span>
                    ]}
                    labelFormatter={(label) => <span className="font-bold text-slate-900 mb-2 block">Day {label}</span>}
                  />
                  
                  {/* Confidence Interval Background */}
                  <Area type="monotone" dataKey="ConfidenceUpper" stroke="none" fill="#e2e8f0" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="ConfidenceLower" stroke="none" fill="#ffffff" fillOpacity={1} />
                  
                  {/* The 3 Scenario Lines */}
                  <Line type="monotone" dataKey="Conservative" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 6" dot={false} activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="Baseline" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="Optimistic" stroke="#22c55e" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }} />
                  
                  {/* Target Goal Line */}
                  <ReferenceLine 
                    y={goalValue} 
                    stroke="#8b5cf6" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ position: 'insideTopLeft', value: 'GOAL', fill: '#8b5cf6', fontSize: 14, fontWeight: 800, offset: 10 }} 
                  />
                  
                  {/* Action Start Line */}
                  <ReferenceLine 
                    x={startDay} 
                    stroke="#94a3b8" 
                    strokeDasharray="3 3"
                    label={{ position: 'insideTopRight', value: 'Action Launch', fill: '#64748b', fontSize: 11, offset: 10 }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-slate-400 font-medium">Initializing Engine...</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
