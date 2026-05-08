"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [step, setStep] = useState<"form" | "sent">("form");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong.");
                return;
            }

            setStep("sent");
        } catch {
            setError("Connection error. Please check your network.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-md mx-auto"
        >
            <div className="bg-[var(--card)] rounded-[2.5rem] shadow-2xl border border-[var(--border)] p-10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />

                <AnimatePresence mode="wait">
                    {step === "form" ? (
                        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                            <div className="text-center space-y-2 relative z-10">
                                <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-[var(--accent)]/20 mb-6">
                                    <KeyRound className="w-8 h-8 text-white" />
                                </div>
                                <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Reset Password</h1>
                                <p className="text-[var(--muted)] font-medium">
                                    Enter your email and we'll send a reset link
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium"
                                    >
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        {error}
                                    </motion.div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-widest ml-1">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@company.com"
                                            required
                                            className="w-full pl-12 pr-4 py-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/5 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-[var(--primary)] text-white font-bold rounded-2xl hover:bg-[var(--accent)] disabled:opacity-50 transition-all shadow-xl shadow-[var(--accent)]/10 flex items-center justify-center gap-2 active:scale-95"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
                                </button>
                            </form>

                            <div className="text-center relative z-10">
                                <Link href="/login" className="inline-flex items-center gap-2 text-[var(--muted)] font-medium hover:text-[var(--foreground)] transition-colors">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Login
                                </Link>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-center relative z-10">
                            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-[var(--foreground)]">Check Your Email</h2>
                                <p className="text-[var(--muted)]">
                                    If <span className="font-semibold text-[var(--foreground)]">{email}</span> is registered,
                                    you'll receive a password reset link within a few minutes.
                                </p>
                            </div>
                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-left text-sm text-amber-700 space-y-1">
                                <p className="font-semibold">Didn't receive it?</p>
                                <p>Check your spam folder, or <button onClick={() => setStep("form")} className="underline font-semibold">try again</button> with a different email.</p>
                            </div>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-bold rounded-2xl hover:bg-[var(--accent)] transition-all"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Return to Login
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
