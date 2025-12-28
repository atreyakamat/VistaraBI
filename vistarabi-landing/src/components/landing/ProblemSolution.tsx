"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export default function ProblemSolution() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section ref={ref} className="py-24 px-6 lg:px-20 bg-[var(--background)]">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] mb-4">
                        From Chaos to Clarity
                    </h2>
                    <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
                        Stop wrestling with messy spreadsheets. Let AI transform your raw data into actionable intelligence.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Problem - Messy Spreadsheet */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="absolute -top-4 -left-4 px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                            Before
                        </div>
                        <div className="bg-[var(--card)] rounded-2xl shadow-lg border border-[var(--border)] p-6 overflow-hidden">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                                <span className="ml-2 text-sm text-[var(--muted)]">sales_data_final_v3_FINAL.xlsx</span>
                            </div>
                            <div className="space-y-2 font-mono text-xs">
                                {/* Messy spreadsheet rows */}
                                <div className="flex gap-2 text-[var(--muted)]">
                                    <span className="w-8 text-right opacity-50">1</span>
                                    <span className="flex-1 bg-yellow-50 px-2 py-1">Date,Revenue,region,Status,Notes???</span>
                                </div>
                                <div className="flex gap-2 text-[var(--muted)]">
                                    <span className="w-8 text-right opacity-50">2</span>
                                    <span className="flex-1 bg-red-50 px-2 py-1">01/15/24,$12,500,NORTH,active,</span>
                                </div>
                                <div className="flex gap-2 text-[var(--muted)]">
                                    <span className="w-8 text-right opacity-50">3</span>
                                    <span className="flex-1 px-2 py-1">2024-01-16,15000,South,ACTIVE,needs review</span>
                                </div>
                                <div className="flex gap-2 text-[var(--muted)]">
                                    <span className="w-8 text-right opacity-50">4</span>
                                    <span className="flex-1 bg-orange-50 px-2 py-1">,,$8200,north,,duplicate?</span>
                                </div>
                                <div className="flex gap-2 text-[var(--muted)]">
                                    <span className="w-8 text-right opacity-50">5</span>
                                    <span className="flex-1 bg-red-50 px-2 py-1">Jan 17,ERROR,East,pending,#REF!</span>
                                </div>
                                <div className="flex gap-2 text-[var(--muted)]">
                                    <span className="w-8 text-right opacity-50">6</span>
                                    <span className="flex-1 px-2 py-1 line-through opacity-50">DELETE THIS ROW</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-red-500 text-sm">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                23 errors found • 5 missing values • 3 duplicates
                            </div>
                        </div>
                    </motion.div>

                    {/* Solution - Clean Dashboard */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="relative"
                    >
                        <div className="absolute -top-4 -left-4 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                            After
                        </div>
                        <div className="bg-[var(--card)] rounded-2xl shadow-lg border border-[var(--border)] p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-[var(--foreground)]">Sales Dashboard</h4>
                                        <p className="text-sm text-[var(--muted)]">Auto-generated • Q1 2024</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Data cleaned
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-[var(--background)] rounded-xl p-4">
                                    <p className="text-sm text-[var(--muted)] mb-1">Total Revenue</p>
                                    <p className="font-mono text-xl font-bold text-[var(--foreground)]">$35,700</p>
                                </div>
                                <div className="bg-[var(--background)] rounded-xl p-4">
                                    <p className="text-sm text-[var(--muted)] mb-1">Growth</p>
                                    <p className="font-mono text-xl font-bold text-green-600">+18.5%</p>
                                </div>
                                <div className="bg-[var(--background)] rounded-xl p-4">
                                    <p className="text-sm text-[var(--muted)] mb-1">Regions</p>
                                    <p className="font-mono text-xl font-bold text-[var(--foreground)]">4</p>
                                </div>
                            </div>

                            <div className="h-20 flex items-end gap-2">
                                {[35, 55, 45, 70, 60, 85, 75, 90, 80, 95].map((h, i) => (
                                    <div key={i} className="flex-1 bg-[var(--accent)] rounded-t-sm opacity-80 hover:opacity-100 transition-opacity" style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
