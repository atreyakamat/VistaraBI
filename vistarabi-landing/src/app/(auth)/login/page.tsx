"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
    LayoutDashboard, 
    Mail, 
    Lock, 
    ArrowRight, 
    AlertCircle,
    Loader2
} from "lucide-react";
import { api } from "@/lib/api/client";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await api.post("/api/auth/login", { email, password });

            if (res.error) {
                setError(res.error);
                return;
            }

            router.push("/app");
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
                {/* Decorative background blur */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                
                <div className="text-center space-y-2 relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-[var(--accent)]/20 mb-6">
                        <LayoutDashboard className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
                        Welcome Back
                    </h1>
                    <p className="text-[var(--muted)] font-medium">
                        Enter your credentials to access VistaraBI
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

                    <div className="space-y-4">
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

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-widest ml-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/5 transition-all font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-[var(--primary)] text-white font-bold rounded-2xl hover:bg-[var(--accent)] disabled:opacity-50 transition-all shadow-xl shadow-[var(--accent)]/10 flex items-center justify-center gap-2 group active:scale-95"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Sign In
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center relative z-10">
                    <p className="text-[var(--muted)] font-medium">
                        New to VistaraBI?{" "}
                        <Link href="/register" className="text-[var(--accent)] font-bold hover:underline underline-offset-4">
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
