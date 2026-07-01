"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const securityFeatures = [
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
        ),
        color: "#3B82F6",
        title: "AES-256 Encryption",
        description: "Data encrypted at rest and in transit using industry-standard AES-256 and TLS 1.3.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
        ),
        color: "#10B981",
        title: "GDPR & SOC 2 Ready",
        description: "Aligned with GDPR and SOC 2 Type II requirements. Data retention controls built in.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        ),
        color: "#8B5CF6",
        title: "Explainable AI",
        description: "Every AI decision shows its reasoning and confidence score — no black boxes.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
        color: "#F59E0B",
        title: "Role-Based Access",
        description: "Admin, Analyst and Viewer roles with granular dataset-level permissions.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
        ),
        color: "#06B6D4",
        title: "Full Audit Logs",
        description: "Every action — uploads, exports, logins, AI queries — is timestamped and logged.",
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
        ),
        color: "#EF4444",
        title: "Data Isolation",
        description: "Each workspace runs in a separate context. Your data is never used to train shared models.",
    },
];

export default function Security() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section ref={ref} id="security" className="py-24 px-6 lg:px-20 bg-[var(--background)]">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <p className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)] mb-4">Security & Trust</p>
                    <h2 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] mb-4 tracking-tight">
                        Enterprise-grade protection
                    </h2>
                    <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
                        Your data stays yours. VistaraBI is built with security-first architecture from the ground up.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {securityFeatures.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 24 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.45, delay: index * 0.08 }}
                        >
                            <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)] h-full hover:shadow-md hover:border-[var(--accent)]/20 transition-all duration-300">
                                <div className="flex items-start gap-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: `${feature.color}14`, color: feature.color }}
                                    >
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[var(--foreground)] mb-1.5">{feature.title}</h3>
                                        <p className="text-sm text-[var(--muted)] leading-relaxed">{feature.description}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Trust strip */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="mt-12 flex flex-wrap items-center justify-center gap-8 py-6 border-t border-[var(--border)]"
                >
                    {["GDPR", "SOC 2", "HTTPS/TLS 1.3", "AES-256", "ISO 27001 aligned"].map((badge) => (
                        <div key={badge} className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
                            <svg className="w-4 h-4 text-[var(--accent)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            {badge}
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
