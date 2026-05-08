"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [step, setStep] = useState<"form" | "done" | "invalid">("form");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) setStep("invalid");
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
        if (password !== confirm) { setError("Passwords do not match."); return; }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || "Reset failed."); return; }
            setStep("done");
            setTimeout(() => router.push("/login"), 3000);
        } catch {
            setError("Connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md mx-auto"
        >
            <div className="bg-[var(--card)] rounded-[2.5rem] shadow-2xl border border-[var(--border)] p-10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                <AnimatePresence mode="wait">
                    {step === "invalid" ? (
                        <motion.div key="invalid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--foreground)]">Invalid Link</h2>
                            <p className="text-[var(--muted)]">This reset link is invalid or has expired.</p>
                            <Link href="/forgot-password" className="inline-block px-6 py-3 bg-[var(--primary)] text-white font-bold rounded-2xl hover:bg-[var(--accent)] transition-all">
                                Request a New Link
                            </Link>
                        </motion.div>
                    ) : step === "done" ? (
                        <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
                            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--foreground)]">Password Updated!</h2>
                            <p className="text-[var(--muted)]">Your password has been reset. Redirecting to login...</p>
                            <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)] mx-auto" />
                        </motion.div>
                    ) : (
                        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                            <div className="text-center space-y-2 relative z-10">
                                <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-[var(--accent)]/20 mb-6">
                                    <Lock className="w-8 h-8 text-white" />
                                </div>
                                <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">New Password</h1>
                                <p className="text-[var(--muted)] font-medium">Choose a strong password for your account</p>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        {error}
                                    </div>
                                )}
                                {[{ label: "New Password", val: password, set: setPassword }, { label: "Confirm Password", val: confirm, set: setConfirm }].map(({ label, val, set }) => (
                                    <div key={label} className="space-y-2">
                                        <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-widest ml-1">{label}</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                                            <input
                                                type={showPw ? "text" : "password"}
                                                value={val}
                                                onChange={(e) => set(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                className="w-full pl-12 pr-12 py-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] transition-all font-medium"
                                            />
                                            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                                                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button type="submit" disabled={loading} className="w-full py-4 bg-[var(--primary)] text-white font-bold rounded-2xl hover:bg-[var(--accent)] disabled:opacity-50 transition-all shadow-xl flex items-center justify-center gap-2 active:scale-95">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="w-full max-w-md mx-auto h-64 bg-[var(--card)] rounded-[2.5rem] animate-pulse" />}>
            <ResetPasswordForm />
        </Suspense>
    );
}
