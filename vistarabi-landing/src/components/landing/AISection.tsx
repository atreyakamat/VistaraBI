"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const chatMessages = [
    {
        role: "user",
        text: "What's driving our revenue growth this quarter?",
    },
    {
        role: "ai",
        text: "Based on your uploaded data, three factors account for 78% of Q3 revenue growth: 1) Enterprise plan upgrades (+42%), 2) APAC market expansion (+24%), and 3) Reduced churn in the mid-market segment (+12%). Want me to model scenarios for Q4?",
    },
    {
        role: "user",
        text: "Show me churn risk predictions for next 30 days.",
    },
    {
        role: "ai",
        text: "I've identified 23 accounts at high churn risk (>70% probability) representing $847K ARR. Top signals: decreased login frequency, 3+ support escalations, and contracts renewing within 60 days. I recommend prioritising outreach to the top 5 — should I generate an action plan?",
    },
];

function TypingText({ text, delay = 0 }: { text: string; delay?: number }) {
    const [displayText, setDisplayText] = useState("");
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setStarted(true), delay);
        return () => clearTimeout(t);
    }, [delay]);

    useEffect(() => {
        if (!started) return;
        let i = 0;
        const interval = setInterval(() => {
            if (i <= text.length) {
                setDisplayText(text.slice(0, i));
                i++;
            } else {
                clearInterval(interval);
            }
        }, 12);
        return () => clearInterval(interval);
    }, [started, text]);

    return <span>{displayText}</span>;
}

export default function AISection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section ref={ref} className="py-24 px-6 lg:px-20 bg-[var(--card)] border-t border-b border-[var(--border)]">
            <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left */}
                    <motion.div
                        initial={{ opacity: 0, x: -24 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        className="space-y-6"
                    >
                        <p className="text-xs font-semibold tracking-widest uppercase text-[var(--accent)]">Module 8 — AI Chat</p>
                        <h2 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] leading-tight tracking-tight">
                            Ask questions.<br />
                            <span className="text-[var(--accent)]">Get strategic answers.</span>
                        </h2>
                        <p className="text-lg text-[var(--muted)] leading-relaxed">
                            VistaraBI&apos;s AI assistant is grounded in your uploaded data — not generic answers. Ask anything in plain English and get instant, cited insights backed by real figures.
                        </p>
                        <ul className="space-y-3">
                            {[
                                "Natural language queries on any metric or KPI",
                                "Predictive analytics and 90-day forecasting",
                                "Anomaly detection and root-cause analysis",
                                "Strategic recommendations with priority ranking",
                                "Cites exact figures and data sources in every answer",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-3 h-3 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-[var(--foreground)]">{item}</span>
                                </li>
                            ))}
                        </ul>

                        {/* AI model attribution */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            {["Gemini", "Claude", "Groq (Llama)", "Local Ollama"].map((m) => (
                                <span
                                    key={m}
                                    className="px-3 py-1 text-xs font-medium bg-[var(--background)] border border-[var(--border)] rounded-full text-[var(--muted)]"
                                >
                                    {m}
                                </span>
                            ))}
                            <span className="px-3 py-1 text-xs font-medium text-[var(--muted)] italic">+ bring your own key</span>
                        </div>
                    </motion.div>

                    {/* Right — chat mock */}
                    <motion.div
                        initial={{ opacity: 0, x: 24 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="bg-[var(--background)] rounded-2xl shadow-xl border border-[var(--border)] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] bg-[var(--card)]">
                            <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-[var(--foreground)]">VistaraBI AI</h4>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-xs text-[var(--muted)]">Retail dataset loaded</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="p-5 space-y-3.5 max-h-80 overflow-y-auto">
                            {isInView && chatMessages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: i * 1.8 }}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[88%] rounded-2xl px-4 py-2.5 ${
                                            msg.role === "user"
                                                ? "bg-[var(--accent)] text-white rounded-br-none"
                                                : "bg-[var(--card)] text-[var(--foreground)] rounded-bl-none border border-[var(--border)]"
                                        }`}
                                    >
                                        <p className="text-xs leading-relaxed">
                                            <TypingText text={msg.text} delay={i * 1800 + 400} />
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--card)]">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    placeholder="Ask about your data..."
                                    className="flex-1 px-4 py-2.5 bg-[var(--background)] rounded-xl border border-[var(--border)] text-xs focus:outline-none focus:border-[var(--accent)] transition-colors"
                                    readOnly
                                />
                                <button className="w-10 h-10 bg-[var(--accent)] rounded-xl flex items-center justify-center text-white hover:opacity-85 transition-opacity flex-shrink-0">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
