import Link from "next/link";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-6 py-12">
            <div className="w-full max-w-md">
                {/* Logo - Links back to landing */}
                <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
                    <div className="w-12 h-12 rounded-xl bg-[var(--primary)] flex items-center justify-center group-hover:bg-[var(--accent)] transition-colors">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <span className="text-2xl font-semibold text-[var(--foreground)]">VistaraBI</span>
                </Link>

                {children}

                {/* Back to home link */}
                <p className="text-center text-sm text-[var(--muted)] mt-8">
                    <Link href="/" className="hover:text-[var(--accent)] transition-colors">
                        ← Back to home
                    </Link>
                </p>
            </div>
        </div>
    );
}
