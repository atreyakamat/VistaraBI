"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";

type Domain = "Retail" | "SaaS" | "Finance" | "Healthcare";

const domains: Domain[] = ["Retail", "SaaS", "Finance", "Healthcare"];

const dashboards: Record<Domain, {
    kpis: { label: string; value: string; delta: string; up: boolean }[];
    bars: number[];
    pieSlices: { label: string; pct: number; color: string }[];
    chartTitle: string;
}> = {
    Retail: {
        kpis: [
            { label: "Total Revenue", value: "$2.47M", delta: "+18.2%", up: true },
            { label: "Avg Order Value", value: "$127", delta: "+4.1%", up: true },
            { label: "Return Rate", value: "3.2%", delta: "-0.8%", up: false },
            { label: "Inventory Turns", value: "8.4x", delta: "+1.2x", up: true },
        ],
        bars: [42, 55, 50, 68, 62, 79, 74, 88, 83, 95, 90, 98],
        pieSlices: [
            { label: "In-store", pct: 45, color: "#2563EB" },
            { label: "Online", pct: 35, color: "#10B981" },
            { label: "Wholesale", pct: 20, color: "#8B5CF6" },
        ],
        chartTitle: "Monthly Revenue",
    },
    SaaS: {
        kpis: [
            { label: "MRR", value: "$184K", delta: "+12.4%", up: true },
            { label: "Churn Rate", value: "1.8%", delta: "-0.5%", up: false },
            { label: "LTV/CAC", value: "4.2x", delta: "+0.8x", up: true },
            { label: "NPS Score", value: "62", delta: "+7pts", up: true },
        ],
        bars: [55, 62, 58, 72, 68, 81, 77, 85, 82, 91, 88, 95],
        pieSlices: [
            { label: "Enterprise", pct: 52, color: "#2563EB" },
            { label: "SMB", pct: 31, color: "#F59E0B" },
            { label: "Starter", pct: 17, color: "#E4E4E7" },
        ],
        chartTitle: "MRR Growth",
    },
    Finance: {
        kpis: [
            { label: "Portfolio Return", value: "14.2%", delta: "+3.1%", up: true },
            { label: "Sharpe Ratio", value: "1.84", delta: "+0.22", up: true },
            { label: "VaR (95%)", value: "$42K", delta: "-$8K", up: false },
            { label: "AUM Growth", value: "+22%", delta: "+5.4%", up: true },
        ],
        bars: [48, 52, 61, 55, 70, 66, 75, 72, 84, 80, 90, 87],
        pieSlices: [
            { label: "Equities", pct: 55, color: "#2563EB" },
            { label: "Bonds", pct: 25, color: "#10B981" },
            { label: "Alternatives", pct: 20, color: "#F59E0B" },
        ],
        chartTitle: "Portfolio Performance",
    },
    Healthcare: {
        kpis: [
            { label: "Patient Volume", value: "2,841", delta: "+8.4%", up: true },
            { label: "Avg Wait Time", value: "12 min", delta: "-3 min", up: false },
            { label: "Readmission", value: "4.1%", delta: "-1.2%", up: false },
            { label: "Bed Utilisation", value: "78%", delta: "+5%", up: true },
        ],
        bars: [65, 70, 68, 74, 72, 80, 77, 84, 81, 88, 85, 90],
        pieSlices: [
            { label: "Outpatient", pct: 60, color: "#2563EB" },
            { label: "Inpatient", pct: 28, color: "#EF4444" },
            { label: "Emergency", pct: 12, color: "#F59E0B" },
        ],
        chartTitle: "Patient Volume",
    },
};

export default function DashboardPreview() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });
    const [active, setActive] = useState<Domain>("Retail");

    const data = dashboards[active];

    return (
        <section ref={ref} className="py-24 px-6 lg:px-20 bg-[var(--background)] border-b border-[var(--border)]">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-10"
                >
                    <p className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-4">Live Preview</p>
                    <h2 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] mb-4 tracking-tight">
                        Dashboards built for your industry
                    </h2>
                    <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
                        Domain-aware layouts, KPIs and charts — auto-generated from your data.
                    </p>
                </motion.div>

                {/* Domain tabs */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="flex flex-wrap gap-2 justify-center mb-8"
                >
                    {domains.map((d) => (
                        <button
                            key={d}
                            onClick={() => setActive(d)}
                            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                active === d
                                    ? "bg-[var(--accent)] text-white shadow-md"
                                    : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/30"
                            }`}
                        >
                            {d}
                        </button>
                    ))}
                </motion.div>

                {/* Dashboard mock */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 30 }}
                    animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                    transition={{ duration: 0.7, delay: 0.25 }}
                    key={active}
                    className="relative"
                >
                    <div className="bg-[var(--card)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden">
                        {/* Window chrome */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] bg-[var(--background)]">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-[var(--card)] rounded-md border border-[var(--border)]">
                                    <svg className="w-3 h-3 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <span className="text-xs text-[var(--muted)]">VistaraBI / {active} Dashboard</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">Export PDF</button>
                                <button className="px-3 py-1.5 text-xs font-semibold bg-[var(--accent)] text-white rounded-lg">Share</button>
                            </div>
                        </div>

                        {/* Dashboard content */}
                        <div className="p-5">
                            {/* KPI row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                                {data.kpis.map((kpi) => (
                                    <div key={kpi.label} className="bg-[var(--background)] rounded-xl p-4 border border-[var(--border)]">
                                        <p className="text-xs text-[var(--muted)] mb-1.5">{kpi.label}</p>
                                        <p className="font-mono text-xl font-bold text-[var(--foreground)]">{kpi.value}</p>
                                        <p className={`text-xs mt-1 font-medium ${kpi.up ? "text-emerald-600" : "text-amber-600"}`}>
                                            {kpi.delta} {kpi.up ? "↑" : "↓"}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Charts row */}
                            <div className="grid md:grid-cols-3 gap-4">
                                {/* Bar chart */}
                                <div className="md:col-span-2 bg-[var(--background)] rounded-xl p-5 border border-[var(--border)]">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-semibold text-[var(--foreground)]">{data.chartTitle}</h4>
                                        <div className="flex gap-1 text-xs">
                                            <button className="px-2.5 py-1 bg-[var(--accent)] text-white rounded-md font-medium">12m</button>
                                            <button className="px-2.5 py-1 text-[var(--muted)] hover:bg-[var(--card)] rounded-md transition-colors">6m</button>
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-1.5 h-36">
                                        {data.bars.map((h, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                                <div
                                                    className="w-full bg-[var(--accent)] rounded-t-sm opacity-75 hover:opacity-100 transition-opacity"
                                                    style={{ height: `${h}%` }}
                                                />
                                                <span className="text-[9px] text-[var(--muted)]">{["J","F","M","A","M","J","J","A","S","O","N","D"][i]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Donut / pie */}
                                <div className="bg-[var(--background)] rounded-xl p-5 border border-[var(--border)]">
                                    <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">Breakdown</h4>
                                    <div className="relative w-24 h-24 mx-auto mb-4">
                                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                            {data.pieSlices.map((slice, i) => {
                                                const offset = data.pieSlices.slice(0, i).reduce((acc, s) => acc + s.pct, 0);
                                                return (
                                                    <circle
                                                        key={i}
                                                        cx="18" cy="18" r="14"
                                                        fill="none"
                                                        stroke={slice.color}
                                                        strokeWidth="4"
                                                        strokeDasharray={`${slice.pct * 0.88} ${100 * 0.88}`}
                                                        strokeDashoffset={-offset * 0.88}
                                                    />
                                                );
                                            })}
                                        </svg>
                                    </div>
                                    <div className="space-y-1.5">
                                        {data.pieSlices.map((slice) => (
                                            <div key={slice.label} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: slice.color }} />
                                                    <span className="text-[var(--muted)]">{slice.label}</span>
                                                </div>
                                                <span className="font-mono font-semibold text-[var(--foreground)]">{slice.pct}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating badges */}
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-4 -right-4 hidden lg:flex items-center gap-2 bg-[var(--card)] rounded-xl shadow-lg border border-[var(--border)] px-4 py-2.5"
                    >
                        <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        <span className="text-xs font-medium text-[var(--foreground)]">AI detected growth opportunity</span>
                    </motion.div>

                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
                        className="absolute -bottom-4 -left-4 hidden lg:flex items-center gap-2 bg-[var(--card)] rounded-xl shadow-lg border border-[var(--border)] px-4 py-2.5"
                    >
                        <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <span className="text-xs font-medium text-[var(--foreground)]">Strategy report ready</span>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
