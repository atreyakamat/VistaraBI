"use client";

const brands = [
    { name: "Retail Corp", initial: "R", color: "#3B82F6" },
    { name: "HealthPlus", initial: "H", color: "#10B981" },
    { name: "FinanceOS", initial: "F", color: "#F59E0B" },
    { name: "SaaS Grid", initial: "S", color: "#8B5CF6" },
    { name: "Edu Nexus", initial: "E", color: "#EF4444" },
    { name: "MfgLink", initial: "M", color: "#06B6D4" },
    { name: "DataBridge", initial: "D", color: "#14B8A6" },
    { name: "InsightsCo", initial: "I", color: "#F97316" },
    { name: "CloudOps", initial: "C", color: "#6366F1" },
    { name: "VentureSys", initial: "V", color: "#EC4899" },
];

export default function SocialProof() {
    const doubled = [...brands, ...brands];

    return (
        <section className="py-14 bg-[var(--card)] border-y border-[var(--border)]">
            <div className="max-w-7xl mx-auto px-6">
                <p className="text-center text-xs font-semibold text-[var(--muted)] mb-8 tracking-widest uppercase">
                    Trusted by teams across Retail · SaaS · Healthcare · Finance · Manufacturing · EdTech
                </p>

                <div className="relative overflow-hidden">
                    {/* Gradient masks */}
                    <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[var(--card)] to-transparent z-10 pointer-events-none" />
                    <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[var(--card)] to-transparent z-10 pointer-events-none" />

                    {/* Marquee */}
                    <div className="flex animate-marquee">
                        {doubled.map((brand, i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 mx-7 flex items-center gap-2.5 opacity-50 hover:opacity-100 transition-opacity duration-300"
                            >
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: `${brand.color}18` }}
                                >
                                    <span className="text-xs font-bold" style={{ color: brand.color }}>
                                        {brand.initial}
                                    </span>
                                </div>
                                <span className="text-sm font-semibold text-[var(--muted)] whitespace-nowrap">
                                    {brand.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
