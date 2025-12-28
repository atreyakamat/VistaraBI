"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export default function FinalCTA() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section ref={ref} className="py-24 px-6 lg:px-20 bg-[var(--primary)]">
            <div className="max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6 }}
                    className="space-y-8"
                >
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-tight">
                        Start making decisions,
                        <br />
                        not spreadsheets.
                    </h2>
                    <p className="text-lg text-white/70 max-w-xl mx-auto">
                        Join thousands of teams transforming their business data into strategic intelligence with VistaraBI.
                    </p>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={isInView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ duration: 0.5, delay: 0.3 }}
                    >
                        <button className="px-10 py-5 bg-white text-[var(--primary)] font-semibold text-lg rounded-xl shadow-2xl hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:-translate-y-1 transition-all duration-300 animate-pulse-glow">
                            Get Started Free
                        </button>
                    </motion.div>
                    <p className="text-sm text-white/50">
                        No credit card required • Free tier available • Setup in minutes
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
