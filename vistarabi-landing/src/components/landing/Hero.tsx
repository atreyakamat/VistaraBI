"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function Hero() {
    return (
        <section className="min-h-screen flex items-center justify-center px-6 lg:px-20 py-20 bg-[var(--background)]">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                {/* Left Content */}
                <div className="space-y-8">
                    <motion.h1
                        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight text-[var(--foreground)] tracking-tight"
                    >
                        Turn Business Data Into Decisions —{" "}
                        <span className="text-[var(--accent)]">Automatically.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="text-lg md:text-xl text-[var(--muted)] max-w-xl leading-relaxed"
                    >
                        AI-powered dashboards, KPIs, forecasting & business strategy —
                        generated from your raw files.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="flex flex-wrap gap-4"
                    >
                        <Link href="/register" className="px-8 py-4 bg-[var(--primary)] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
                            Get Started
                        </Link>
                        <Link href="/login" className="px-8 py-4 bg-transparent border-2 border-[var(--border)] text-[var(--foreground)] font-semibold rounded-xl hover:border-[var(--accent)] hover:text-[var(--accent)] hover:-translate-y-0.5 transition-all duration-200">
                            Sign In
                        </Link>
                    </motion.div>
                </div>

                {/* Right Visual */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="relative"
                >
                    <div className="relative w-full aspect-square max-w-lg mx-auto">
                        {/* Floating Dashboard Cards */}
                        <motion.div
                            animate={{ y: [0, -15, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-0 right-0 w-64 h-40 bg-[var(--card)] rounded-2xl shadow-xl p-4 border border-[var(--border)]"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-[var(--muted)]">Revenue Growth</span>
                            </div>
                            <div className="font-mono text-3xl font-bold text-[var(--foreground)]">+24.5%</div>
                            <div className="text-sm text-green-600 mt-1">↑ 12% vs last quarter</div>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, -12, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                            className="absolute bottom-20 left-0 w-56 h-36 bg-[var(--card)] rounded-2xl shadow-xl p-4 border border-[var(--border)]"
                        >
                            <div className="text-sm font-medium text-[var(--muted)] mb-2">Active Users</div>
                            <div className="font-mono text-2xl font-bold text-[var(--foreground)]">12,847</div>
                            <div className="mt-3 flex gap-1">
                                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                                    <div key={i} className="flex-1 bg-[var(--accent)]/20 rounded-sm" style={{ height: `${h}%`, maxHeight: "40px" }}>
                                        <div className="w-full rounded-sm bg-[var(--accent)]" style={{ height: `${h}%` }} />
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute top-1/3 left-1/4 w-48 h-28 bg-[var(--card)] rounded-2xl shadow-xl p-4 border border-[var(--border)]"
                        >
                            <div className="text-sm font-medium text-[var(--muted)] mb-2">AI Confidence</div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                                    <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: "94%" }} />
                                </div>
                                <span className="font-mono text-sm font-bold text-[var(--accent)]">94%</span>
                            </div>
                        </motion.div>

                        {/* Central Glow Effect */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-3xl" />
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
