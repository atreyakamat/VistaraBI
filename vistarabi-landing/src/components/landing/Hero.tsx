"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const stats = [
    { value: "9", label: "Analytics modules" },
    { value: "8+", label: "Industry domains" },
    { value: "94%", label: "Avg. AI accuracy" },
    { value: "< 3 min", label: "Time to first insight" },
];

export default function Hero() {
    return (
        <section className="min-h-screen flex items-center justify-center px-6 lg:px-20 pt-32 pb-20 bg-transparent relative overflow-hidden">
            {/* Gradient wash — top */}
            <div className="absolute top-0 inset-x-0 h-[560px] bg-gradient-to-b from-[var(--accent)]/8 via-[var(--accent)]/3 to-transparent pointer-events-none -z-10" />

            <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
                {/* Left Content */}
                <div className="space-y-8">
                    {/* Trust badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)]/8 border border-[var(--accent)]/20 rounded-full"
                    >
                        <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                        <span className="text-sm font-medium text-[var(--accent)]">9-module BI platform — now in production</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                        className="text-4xl md:text-5xl lg:text-[56px] font-semibold leading-[1.1] text-[var(--foreground)] tracking-tight"
                    >
                        Turn raw business data<br />into decisions —{" "}
                        <span className="text-[var(--accent)]">automatically.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.25 }}
                        className="text-lg text-[var(--muted)] max-w-lg leading-relaxed"
                    >
                        Upload a CSV or Excel file. VistaraBI cleans it, detects your domain, builds dashboards, computes KPIs, forecasts trends, and generates a full AI strategy report — in minutes.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex flex-wrap gap-3"
                    >
                        <Link
                            href="/register"
                            className="relative group px-6 py-3 font-semibold rounded-xl text-[var(--card)] bg-[var(--foreground)] overflow-hidden shadow-[0_0_0_0_rgba(37,99,235,0)] hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 transition-all duration-300 active:scale-95 text-sm flex items-center justify-center"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                            <span className="relative z-10">Start for free</span>
                        </Link>
                        <Link
                            href="/demo"
                            className="px-6 py-3 bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] font-semibold rounded-xl hover:border-[var(--accent)]/40 hover:-translate-y-0.5 transition-all duration-200 text-sm"
                        >
                            View live demo →
                        </Link>
                    </motion.div>

                    {/* Stat strip */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-4 border-t border-[var(--border)]"
                    >
                        {stats.map((s) => (
                            <div key={s.label}>
                                <p className="font-mono text-2xl font-bold text-[var(--foreground)]">{s.value}</p>
                                <p className="text-xs text-[var(--muted)] mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Right — Floating cards visual */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="relative hidden lg:block"
                >
                    <div className="relative w-full aspect-square max-w-lg mx-auto">
                        {/* Revenue card */}
                        <motion.div
                            animate={{ y: [0, -14, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-4 right-0 w-60 bg-[var(--card)]/90 backdrop-blur-xl rounded-2xl shadow-xl p-4 border border-[var(--border)]"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                                <span className="text-xs font-medium text-[var(--muted)]">Revenue · Q3 2025</span>
                            </div>
                            <div className="font-mono text-3xl font-bold text-[var(--foreground)]">$2.47M</div>
                            <div className="text-xs text-emerald-600 mt-1 font-medium">↑ 24.5% vs last quarter</div>
                            <div className="mt-3 flex items-end gap-1 h-8">
                                {[45, 58, 52, 71, 65, 80, 76, 88].map((h, i) => (
                                    <div key={i} className="flex-1 bg-emerald-500/20 rounded-sm relative overflow-hidden">
                                        <div className="absolute bottom-0 w-full bg-emerald-500 rounded-sm" style={{ height: `${h}%` }} />
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Active users card */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
                            className="absolute bottom-24 left-0 w-52 bg-[var(--card)]/90 backdrop-blur-xl rounded-2xl shadow-xl p-4 border border-[var(--border)]"
                        >
                            <div className="text-xs font-medium text-[var(--muted)] mb-1">Active Users</div>
                            <div className="font-mono text-2xl font-bold text-[var(--foreground)]">48,291</div>
                            <div className="text-xs text-[var(--accent)] mt-0.5 font-medium">↑ 12.5% this month</div>
                        </motion.div>

                        {/* AI confidence card */}
                        <motion.div
                            animate={{ y: [0, -12, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
                            className="absolute top-1/2 left-8 w-44 bg-[var(--card)]/90 backdrop-blur-xl rounded-2xl shadow-xl p-4 border border-[var(--border)]"
                        >
                            <div className="text-xs font-medium text-[var(--muted)] mb-2">AI Confidence</div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                                    <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: "94%" }} />
                                </div>
                                <span className="font-mono text-sm font-bold text-[var(--accent)]">94%</span>
                            </div>
                            <div className="text-xs text-[var(--muted)] mt-2">Retail domain · 9 KPIs</div>
                        </motion.div>

                        {/* AI Insight pill */}
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                            className="absolute bottom-4 right-8 px-4 py-2 bg-[var(--accent)] text-white text-xs font-medium rounded-full shadow-lg"
                        >
                            ✦ AI strategy report ready
                        </motion.div>

                        {/* Central glow */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-72 h-72 bg-[var(--accent)]/6 rounded-full blur-3xl" />
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
