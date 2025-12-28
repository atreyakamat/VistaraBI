"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export default function DashboardPreview() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section ref={ref} className="py-24 px-6 lg:px-20 bg-[#F1F5F9] overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] mb-4">
                        Beautiful, Actionable Dashboards
                    </h2>
                    <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
                        Auto-generated visualizations that tell your business story
                    </p>
                </motion.div>

                {/* Dashboard Mock */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 40 }}
                    animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative"
                >
                    {/* Main Dashboard */}
                    <div className="bg-[var(--card)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden">
                        {/* Header Bar */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                    <div className="w-3 h-3 rounded-full bg-green-400" />
                                </div>
                                <div className="flex items-center gap-2 px-4 py-1.5 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                                    <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <span className="text-sm text-[var(--muted)]">Search metrics...</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                                    Export
                                </button>
                                <button className="px-4 py-2 text-sm font-medium bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--primary)] transition-colors">
                                    Share
                                </button>
                            </div>
                        </div>

                        {/* Dashboard Content */}
                        <div className="p-6">
                            {/* KPI Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-[var(--background)] rounded-xl p-4">
                                    <p className="text-sm text-[var(--muted)] mb-1">Total Revenue</p>
                                    <p className="font-mono text-2xl font-bold text-[var(--foreground)]">$2.4M</p>
                                    <p className="text-sm text-green-600 mt-1">+18.2% vs last month</p>
                                </div>
                                <div className="bg-[var(--background)] rounded-xl p-4">
                                    <p className="text-sm text-[var(--muted)] mb-1">Active Users</p>
                                    <p className="font-mono text-2xl font-bold text-[var(--foreground)]">48.2K</p>
                                    <p className="text-sm text-green-600 mt-1">+12.5% growth</p>
                                </div>
                                <div className="bg-[var(--background)] rounded-xl p-4">
                                    <p className="text-sm text-[var(--muted)] mb-1">Conversion Rate</p>
                                    <p className="font-mono text-2xl font-bold text-[var(--foreground)]">3.4%</p>
                                    <p className="text-sm text-green-600 mt-1">+0.8% improvement</p>
                                </div>
                                <div className="bg-[var(--background)] rounded-xl p-4">
                                    <p className="text-sm text-[var(--muted)] mb-1">Avg. Order Value</p>
                                    <p className="font-mono text-2xl font-bold text-[var(--foreground)]">$127</p>
                                    <p className="text-sm text-yellow-600 mt-1">-2.1% decrease</p>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid md:grid-cols-3 gap-6">
                                {/* Main Chart */}
                                <div className="md:col-span-2 bg-[var(--background)] rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-semibold text-[var(--foreground)]">Revenue Trend</h4>
                                        <div className="flex gap-2 text-sm">
                                            <button className="px-3 py-1 bg-[var(--accent)] text-white rounded-md">Weekly</button>
                                            <button className="px-3 py-1 text-[var(--muted)] hover:bg-[var(--card)] rounded-md transition-colors">Monthly</button>
                                        </div>
                                    </div>
                                    <div className="h-48 flex items-end gap-3">
                                        {[45, 62, 58, 75, 68, 82, 78, 90, 85, 95, 88, 92].map((h, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                                <div
                                                    className="w-full bg-[var(--accent)] rounded-t-md opacity-80 hover:opacity-100 transition-opacity"
                                                    style={{ height: `${h}%` }}
                                                />
                                                <span className="text-xs text-[var(--muted)]">{["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"][i]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Pie Chart */}
                                <div className="bg-[var(--background)] rounded-xl p-6">
                                    <h4 className="font-semibold text-[var(--foreground)] mb-4">Revenue by Region</h4>
                                    <div className="relative w-32 h-32 mx-auto mb-4">
                                        <svg viewBox="0 0 36 36" className="w-full h-full">
                                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#2563EB" strokeWidth="3" strokeDasharray="40 60" strokeDashoffset="25" />
                                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1E3A8A" strokeWidth="3" strokeDasharray="30 70" strokeDashoffset="85" />
                                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#64748B" strokeWidth="3" strokeDasharray="20 80" strokeDashoffset="55" />
                                        </svg>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-[var(--accent)]" />
                                                <span className="text-[var(--muted)]">North America</span>
                                            </div>
                                            <span className="font-mono font-medium">40%</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-[var(--primary)]" />
                                                <span className="text-[var(--muted)]">Europe</span>
                                            </div>
                                            <span className="font-mono font-medium">30%</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-[var(--muted)]" />
                                                <span className="text-[var(--muted)]">Asia Pacific</span>
                                            </div>
                                            <span className="font-mono font-medium">20%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating KPI Cards */}
                    <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-6 -right-6 w-48 bg-[var(--card)] rounded-xl shadow-xl border border-[var(--border)] p-4 hidden lg:block"
                    >
                        <div className="flex items-center gap-2 text-green-600 text-sm font-medium mb-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            Trending Up
                        </div>
                        <p className="text-xs text-[var(--muted)]">AI detected 15% growth opportunity in Q4</p>
                    </motion.div>

                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                        className="absolute -bottom-4 -left-6 w-52 bg-[var(--card)] rounded-xl shadow-xl border border-[var(--border)] p-4 hidden lg:block"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                                <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-[var(--foreground)]">AI Insight</span>
                        </div>
                        <p className="text-xs text-[var(--muted)]">Customer churn rate is 23% lower when using premium features</p>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
