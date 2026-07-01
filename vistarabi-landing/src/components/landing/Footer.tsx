import Link from "next/link";

const footerLinks = {
    Product: [
        { label: "Features", href: "#features" },
        { label: "How It Works", href: "#how-it-works" },
        { label: "Modules", href: "#modules" },
        { label: "Security", href: "#security" },
        { label: "Live Demo", href: "/demo" },
    ],
    Domains: [
        { label: "Retail Analytics", href: "/demo" },
        { label: "SaaS Metrics", href: "/demo" },
        { label: "Healthcare BI", href: "/demo" },
        { label: "Finance Insights", href: "/demo" },
        { label: "Manufacturing", href: "/demo" },
    ],
    Company: [
        { label: "About", href: "#" },
        { label: "Changelog", href: "#" },
        { label: "Contact", href: "#" },
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
    ],
};

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-[var(--card)] border-t border-[var(--border)]">
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-1 space-y-4">
                        <Link href="/" className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <span className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">VistaraBI</span>
                        </Link>
                        <p className="text-sm text-[var(--muted)] leading-relaxed max-w-xs">
                            AI-powered business intelligence. From raw files to strategic insights in minutes.
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs text-[var(--muted)]">All systems operational</span>
                        </div>
                    </div>

                    {/* Links */}
                    {Object.entries(footerLinks).map(([group, links]) => (
                        <div key={group}>
                            <h4 className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)] mb-5">{group}</h4>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors duration-150"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-[var(--muted)]">
                        © {currentYear} VistaraBI. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <span className="text-xs text-[var(--muted)]">9 modules · 8+ domains · Production-ready</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
