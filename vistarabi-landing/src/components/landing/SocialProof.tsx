"use client";

export default function SocialProof() {
    const logos = [
        "TechCorp", "DataFlow", "Nexus AI", "CloudScale", "AnalytiX",
        "VentureSys", "Quantum Labs", "InfoStream", "MetricsPro", "InsightHub"
    ];

    return (
        <section className="py-12 bg-[#F1F5F9] border-y border-[var(--border)]">
            <div className="max-w-7xl mx-auto px-6">
                <p className="text-center text-sm font-medium text-[var(--muted)] mb-8 tracking-wide uppercase">
                    Trusted by modern teams in Retail, SaaS, Healthcare, Finance
                </p>

                <div className="relative overflow-hidden">
                    {/* Gradient Masks */}
                    <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#F1F5F9] to-transparent z-10" />
                    <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#F1F5F9] to-transparent z-10" />

                    {/* Marquee */}
                    <div className="flex animate-marquee">
                        {[...logos, ...logos].map((logo, i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 mx-8 flex items-center justify-center"
                            >
                                <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-8 h-8 rounded-lg bg-[var(--border)] flex items-center justify-center">
                                        <span className="text-xs font-bold text-[var(--muted)]">{logo.charAt(0)}</span>
                                    </div>
                                    <span className="text-lg font-semibold text-[var(--muted)] whitespace-nowrap">{logo}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
