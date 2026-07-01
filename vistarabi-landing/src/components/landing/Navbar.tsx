"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Modules", href: "#modules" },
    { label: "Security", href: "#security" },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 16);
        window.addEventListener("scroll", handler, { passive: true });
        return () => window.removeEventListener("scroll", handler);
    }, []);

    return (
        <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                scrolled
                    ? "bg-[var(--card)]/90 backdrop-blur-xl border-b border-[var(--border)] shadow-sm"
                    : "bg-transparent"
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <span className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">VistaraBI</span>
                </Link>

                {/* Nav Links — hidden on mobile */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.label}
                            href={link.href}
                            className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/40 rounded-lg transition-all duration-150"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Auth Links */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="hidden sm:block px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                    >
                        Sign in
                    </Link>
                    <Link
                        href="/register"
                        className="px-4 py-2 bg-[var(--foreground)] text-[var(--card)] text-sm font-semibold rounded-lg hover:opacity-85 transition-opacity"
                    >
                        Get started
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}
