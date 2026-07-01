"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

const testimonials = [
    {
        quote: "We went from weekly analyst reports to real-time KPI dashboards in a single afternoon. The domain detection is scary accurate.",
        author: "Sarah K.",
        role: "Head of Operations, RetailCorp",
        avatar: "SK",
        color: "#3B82F6",
    },
    {
        quote: "The AI strategy report alone saved us two weeks of consultant time. The churn predictions have been 91% accurate over 3 months.",
        author: "Ravi M.",
        role: "Co-founder, SaaS Grid",
        avatar: "RM",
        color: "#10B981",
    },
    {
        quote: "Finally a BI tool that understands healthcare metrics out of the box. Readmission rates, bed utilisation — all surfaced automatically.",
        author: "Dr. Priya N.",
        role: "Data Lead, HealthPlus",
        avatar: "PN",
        color: "#8B5CF6",
    },
];

export default function FinalCTA() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section ref={ref} className="py-24 px-6 lg:px-20 bg-[var(--card)] border-t border-[var(--border)]">
            <div className="max-w-7xl mx-auto">
                {/* Testimonials */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="grid md:grid-cols-3 gap-5 mb-20"
                >
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={t.author}
                            initial={{ opacity: 0, y: 20 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            className="bg-[var(--background)] rounded-2xl p-6 border border-[var(--border)]"
                        >
                            {/* Stars */}
                            <div className="flex gap-1 mb-4">
                                {[...Array(5)].map((_, j) => (
                                    <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-sm text-[var(--foreground)] leading-relaxed mb-5">&ldquo;{t.quote}&rdquo;</p>
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                    style={{ backgroundColor: t.color }}
                                >
                                    {t.avatar}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-[var(--foreground)]">{t.author}</p>
                                    <p className="text-xs text-[var(--muted)]">{t.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* CTA block */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="bg-[var(--foreground)] rounded-3xl px-8 py-16 text-center relative overflow-hidden"
                >
                    {/* Subtle grid overlay */}
                    <div
                        className="absolute inset-0 opacity-5 pointer-events-none"
                        style={{
                            backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                        }}
                    />
                    <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-tight tracking-tight">
                            Make decisions, not<br />spreadsheets.
                        </h2>
                        <p className="text-lg text-white/60 leading-relaxed">
                            Join teams across 8+ industries using VistaraBI to transform raw data into strategic intelligence every day.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <Link
                                href="/register"
                                className="px-8 py-4 bg-white text-[var(--foreground)] font-semibold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 text-sm"
                            >
                                Start for free — no card needed
                            </Link>
                            <Link
                                href="/demo"
                                className="px-8 py-4 bg-white/10 text-white border border-white/20 font-semibold rounded-xl hover:bg-white/15 transition-all duration-200 text-sm"
                            >
                                View live demo →
                            </Link>
                        </div>
                        <p className="text-sm text-white/40">
                            Free tier available · Setup in under 3 minutes · No SQL required
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
