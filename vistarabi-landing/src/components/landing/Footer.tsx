export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="py-12 px-6 lg:px-20 bg-[var(--background)] border-t border-[var(--border)]">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <span className="text-xl font-semibold text-[var(--foreground)]">VistaraBI</span>
                    </div>

                    {/* Links */}
                    <nav className="flex flex-wrap items-center justify-center gap-8">
                        {["Privacy", "Terms", "Contact", "LinkedIn", "Twitter"].map((link) => (
                            <a
                                key={link}
                                href="#"
                                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                            >
                                {link}
                            </a>
                        ))}
                    </nav>

                    {/* Copyright */}
                    <p className="text-sm text-[var(--muted)]">
                        © {currentYear} VistaraBI. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
