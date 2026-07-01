"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const features = [
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 16l3-3m0 0l3 3m-3-3v12" />
            </svg>
        ),
        color: "#3B82F6",
        tag: "Module 1",
        title: "Intelligent File Ingestion",
        description: "Upload CSV, Excel, or JSON — single or multi-file. AI merges, deduplicates and resolves schema conflicts automatically.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        ),
        color: "#10B981",
        tag: "Module 2",
        title: "Automated Data Cleaning",
        description: "Detects and fixes format inconsistencies, null values, outliers and duplicates. Returns a quality score and cleaning log.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        ),
        color: "#8B5CF6",
        tag: "Module 3",
        title: "Domain Detection Engine",
        description: "Classifies your business domain across 8+ verticals — Retail, SaaS, Healthcare, Finance, Manufacturing, EdTech, Services — and applies domain-specific KPI blueprints.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        color: "#F59E0B",
        tag: "Module 4",
        title: "KPI Intelligence Engine",
        description: "Extracts and calculates the right KPIs for your domain. Each metric includes a confidence score, trend direction and drill-down breakdowns.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
        ),
        color: "#06B6D4",
        tag: "Modules 5–6",
        title: "Auto-Generated Dashboards",
        description: "Interactive dashboards with bar, line, pie, and scatter charts — auto-arranged by data shape. Export to PDF or share via a public link.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
        ),
        color: "#EF4444",
        tag: "Module 7",
        title: "90-Day Forecasting",
        description: "Time-series models predict revenue, churn, demand and inventory. Confidence bands visualise uncertainty so you can plan accordingly.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        ),
        color: "#6366F1",
        tag: "Module 8",
        title: "AI Business Chat",
        description: "Ask natural-language questions about any metric. Get instant, data-grounded answers with references to the underlying figures.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
        color: "#EC4899",
        tag: "Module 9",
        title: "AI Strategy Reports",
        description: "Generates a full executive report — SWOT analysis, recommendations, risk matrix and action plan — downloadable as a formatted PDF.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        color: "#14B8A6",
        tag: "Platform",
        title: "Role-Based Workspaces",
        description: "Teams can collaborate with granular permissions. Admins, analysts and viewers each get the right access level with full audit logs.",
    },
];

export default function FeatureGrid() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section ref={ref} id="modules" className="py-24 px-6 lg:px-20 bg-[var(--card)] border-t border-b border-[var(--border)]">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <p className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-4">9 Production Modules</p>
                    <h2 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] mb-4 tracking-tight">
                        Everything in one platform
                    </h2>
                    <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
                        From raw file ingestion to polished strategy report — all 9 modules work together seamlessly.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 24 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.45, delay: index * 0.06 }}
                        >
                            <div className="group bg-[var(--background)] rounded-2xl p-6 border border-[var(--border)] h-full hover:shadow-lg hover:border-[var(--accent)]/25 hover:-translate-y-0.5 transition-all duration-300">
                                <div className="flex items-start gap-4 mb-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: `${feature.color}14`, color: feature.color }}
                                    >
                                        {feature.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <span
                                            className="text-[10px] font-bold tracking-wider uppercase"
                                            style={{ color: feature.color }}
                                        >
                                            {feature.tag}
                                        </span>
                                        <h3 className="font-semibold text-[var(--foreground)] mt-0.5 leading-snug">{feature.title}</h3>
                                    </div>
                                </div>
                                <p className="text-sm text-[var(--muted)] leading-relaxed">{feature.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
