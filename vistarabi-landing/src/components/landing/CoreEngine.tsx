"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
    {
        number: "01",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
        ),
        title: "Upload",
        description: "Drop any CSV, Excel, or JSON file. Multi-file supported.",
        color: "#3B82F6",
    },
    {
        number: "02",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
        ),
        title: "Clean",
        description: "AI removes errors, nulls, duplicates and normalises formats automatically.",
        color: "#10B981",
    },
    {
        number: "03",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        ),
        title: "Detect",
        description: "Domain intelligence identifies Retail, SaaS, Finance, Healthcare, and more.",
        color: "#8B5CF6",
    },
    {
        number: "04",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        ),
        title: "Analyse",
        description: "Extracts KPIs, computes trends and surfaces anomalies with confidence scores.",
        color: "#F59E0B",
    },
    {
        number: "05",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
        ),
        title: "Forecast",
        description: "ML models predict revenue, churn, and demand for the next 90 days.",
        color: "#06B6D4",
    },
    {
        number: "06",
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        title: "Decide",
        description: "Generates an AI strategy report with prioritised recommendations and a PDF export.",
        color: "#EF4444",
    },
];

export default function CoreEngine() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section ref={ref} id="how-it-works" className="py-24 px-6 lg:px-20 bg-[var(--background)]">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <p className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-4">The Pipeline</p>
                    <h2 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] mb-4 tracking-tight">
                        How VistaraBI works
                    </h2>
                    <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
                        Six intelligent stages from raw file to strategic decisions — fully automated, no setup required.
                    </p>
                </motion.div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.title}
                            initial={{ opacity: 0, y: 24 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: index * 0.08 }}
                            className="group relative"
                        >
                            {/* Connector line (desktop) */}
                            {index < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-8 left-full w-4 h-px bg-[var(--border)] z-0" />
                            )}
                            <div className="relative z-10 bg-[var(--card)] rounded-2xl p-5 border border-[var(--border)] shadow-sm h-full flex flex-col items-center text-center hover:shadow-md hover:border-[var(--accent)]/30 transition-all duration-300">
                                {/* Step number */}
                                <span className="font-mono text-[10px] font-bold text-[var(--muted)] mb-3">{step.number}</span>
                                {/* Icon */}
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300"
                                    style={{ backgroundColor: `${step.color}14`, color: step.color }}
                                >
                                    {step.icon}
                                </div>
                                <h3 className="font-semibold text-sm text-[var(--foreground)] mb-2">{step.title}</h3>
                                <p className="text-xs text-[var(--muted)] leading-relaxed">{step.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Time indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.7 }}
                    className="mt-10 flex items-center justify-center gap-3 text-sm text-[var(--muted)]"
                >
                    <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    All 6 stages complete in under 3 minutes on average
                </motion.div>
            </div>
        </section>
    );
}
