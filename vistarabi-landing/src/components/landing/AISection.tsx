"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const chatMessages = [
    { role: "user", text: "What's driving our revenue growth this quarter?" },
    { role: "ai", text: "Based on your data, three factors are driving 78% of Q3 revenue growth: 1) Enterprise plan upgrades (+42%), 2) APAC expansion (+24%), and 3) Reduced churn in mid-market segment (+12%). Would you like detailed recommendations for each area?" },
    { role: "user", text: "Show me churn risk predictions for next month" },
    { role: "ai", text: "I've identified 23 accounts at high churn risk (>70% probability) representing $847K ARR. Primary indicators: decreased login frequency, support ticket escalations, and contract renewal dates within 60 days. I recommend prioritizing outreach to the top 5 accounts shown below." },
];

function TypingText({ text, delay = 0 }: { text: string; delay?: number }) {
    const [displayText, setDisplayText] = useState("");
    const [started, setStarted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setStarted(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    useEffect(() => {
        if (!started) return;
        let index = 0;
        const interval = setInterval(() => {
            if (index <= text.length) {
                setDisplayText(text.slice(0, index));
                index++;
            } else {
                clearInterval(interval);
            }
        }, 15);
        return () => clearInterval(interval);
    }, [started, text]);

    return <span>{displayText}</span>;
}

export default function AISection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section ref={ref} className="py-24 px-6 lg:px-20 bg-[var(--background)]">
            <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left - Explanation */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6 }}
                        className="space-y-6"
                    >
                        <h2 className="text-3xl md:text-4xl font-semibold text-[var(--foreground)] leading-tight">
                            Ask Questions.
                            <br />
                            <span className="text-[var(--accent)]">Get Strategic Answers.</span>
                        </h2>
                        <p className="text-lg text-[var(--muted)] leading-relaxed">
                            VistaraBI&apos;s AI assistant understands your business context. Ask complex analytical questions in plain English and receive instant, actionable insights backed by your data.
                        </p>
                        <ul className="space-y-4">
                            {[
                                "Natural language queries on any metric",
                                "Predictive analytics and forecasting",
                                "Anomaly detection and root cause analysis",
                                "Strategic recommendations based on trends",
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-[var(--foreground)]">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Right - Chat Demo */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={isInView ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="bg-[var(--card)] rounded-2xl shadow-xl border border-[var(--border)] overflow-hidden"
                    >
                        {/* Chat Header */}
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
                            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-[var(--foreground)]">VistaraBI Assistant</h4>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-sm text-[var(--muted)]">Online</span>
                                </div>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                            {isInView && chatMessages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: i * 1.5 }}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === "user"
                                                ? "bg-[var(--accent)] text-white rounded-br-none"
                                                : "bg-[var(--background)] text-[var(--foreground)] rounded-bl-none border border-[var(--border)]"
                                            }`}
                                    >
                                        <p className="text-sm leading-relaxed">
                                            <TypingText text={msg.text} delay={i * 1500 + 300} />
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="px-6 py-4 border-t border-[var(--border)]">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    placeholder="Ask about your business data..."
                                    className="flex-1 px-4 py-3 bg-[var(--background)] rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
                                    readOnly
                                />
                                <button className="w-12 h-12 bg-[var(--accent)] rounded-xl flex items-center justify-center text-white hover:bg-[var(--primary)] transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
