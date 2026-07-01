"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function ProblemSolution() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section ref={ref} id="features" className="py-24 px-6 lg:px-20 bg-[var(--card)] border-b border-[var(--border)]">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <p className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-4">The Problem</p>
                    <h2 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] mb-4 tracking-tight">
                        From chaos to clarity
                    </h2>
                    <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
                        Most businesses drown in raw files. VistaraBI turns them into structured intelligence automatically — no SQL, no analyst needed.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-8 items-start">
                    {/* Before */}
                    <motion.div
                        initial={{ opacity: 0, x: -24 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.15 }}
                        className="relative"
                    >
                        <div className="absolute -top-3 left-4 px-3 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full border border-red-100 z-10">
                            Before VistaraBI
                        </div>
                        <div className="bg-[var(--background)] rounded-2xl border border-[var(--border)] p-5 pt-7 overflow-hidden">
                            {/* Fake OS window chrome */}
                            <div className="flex items-center gap-1.5 mb-4">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                <span className="ml-2 text-xs text-[var(--muted)] font-mono">sales_data_FINAL_v3_REAL.xlsx</span>
                            </div>
                            <div className="space-y-1.5 font-mono text-xs">
                                <div className="flex gap-2">
                                    <span className="w-5 text-right text-[var(--muted)]/50 flex-shrink-0">1</span>
                                    <span className="flex-1 bg-yellow-50 border border-yellow-100 px-2 py-1 rounded text-yellow-800">Date,Revenue,region,Status,Notes???</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-5 text-right text-[var(--muted)]/50 flex-shrink-0">2</span>
                                    <span className="flex-1 bg-red-50 border border-red-100 px-2 py-1 rounded text-red-700">01/15/24,$12,500,NORTH,active,</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-5 text-right text-[var(--muted)]/50 flex-shrink-0">3</span>
                                    <span className="flex-1 px-2 py-1 rounded text-[var(--muted)]">2024-01-16,15000,South,ACTIVE,needs review</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-5 text-right text-[var(--muted)]/50 flex-shrink-0">4</span>
                                    <span className="flex-1 bg-orange-50 border border-orange-100 px-2 py-1 rounded text-orange-700">,,$8200,north,,duplicate?</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-5 text-right text-[var(--muted)]/50 flex-shrink-0">5</span>
                                    <span className="flex-1 bg-red-50 border border-red-100 px-2 py-1 rounded text-red-700">Jan 17,ERROR,East,pending,#REF!</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="w-5 text-right text-[var(--muted)]/50 flex-shrink-0">6</span>
                                    <span className="flex-1 px-2 py-1 rounded line-through text-[var(--muted)]/50">DELETE THIS ROW</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-red-600 text-xs font-medium">
                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                23 errors · 5 missing values · 3 duplicates detected
                            </div>
                        </div>

                        {/* Pain points */}
                        <div className="mt-5 space-y-2">
                            {["Hours wasted cleaning data manually", "Inconsistent formats across departments", "No single source of truth", "Insights arrive too late to act on"].map((pain) => (
                                <div key={pain} className="flex items-center gap-2.5 text-sm text-[var(--muted)]">
                                    <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    {pain}
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* After */}
                    <motion.div
                        initial={{ opacity: 0, x: 24 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="relative"
                    >
                        <div className="absolute -top-3 left-4 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-100 z-10">
                            After VistaraBI
                        </div>
                        <div className="bg-[var(--background)] rounded-2xl border border-[var(--border)] p-5 pt-7">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm text-[var(--foreground)]">Sales Dashboard — Retail</h4>
                                        <p className="text-xs text-[var(--muted)]">Auto-generated · Q1 2025 · 9 KPIs active</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Data cleaned
                                </div>
                            </div>

                            {/* KPI row */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                {[
                                    { label: "Revenue", value: "$2.4M", delta: "+18.2%" },
                                    { label: "Growth MoM", value: "+24.5%", delta: "vs Q4" },
                                    { label: "Regions", value: "4", delta: "All active" },
                                ].map((kpi) => (
                                    <div key={kpi.label} className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
                                        <p className="text-xs text-[var(--muted)] mb-1">{kpi.label}</p>
                                        <p className="font-mono text-base font-bold text-[var(--foreground)]">{kpi.value}</p>
                                        <p className="text-xs text-emerald-600 mt-0.5">{kpi.delta}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Mini sparkline */}
                            <div className="bg-[var(--card)] rounded-xl p-3 border border-[var(--border)]">
                                <p className="text-xs text-[var(--muted)] mb-2">Revenue trend · last 8 months</p>
                                <div className="flex items-end gap-1.5 h-12">
                                    {[38, 52, 47, 65, 59, 74, 70, 88].map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 bg-[var(--accent)] rounded-t-sm opacity-75 hover:opacity-100 transition-opacity"
                                            style={{ height: `${h}%` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Benefits */}
                        <div className="mt-5 space-y-2">
                            {["Data cleaned and normalised in < 30 seconds", "Domain auto-detected with 94% confidence", "Full KPI dashboard generated automatically", "AI strategy report ready to download"].map((win) => (
                                <div key={win} className="flex items-center gap-2.5 text-sm text-[var(--foreground)]">
                                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {win}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
