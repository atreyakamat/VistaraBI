import type { Metadata } from 'next';
import prisma from '@/lib/prisma';

interface SharePageProps {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ embed?: string }>;
}

async function getSharedProject(token: string) {
    try {
        const project = await prisma.project.findUnique({
            where: { shareToken: token },
            select: {
                id: true, name: true, description: true,
                shareTokenExpiresAt: true,
                domainDetection: { select: { detectedDomain: true, confidence: true } },
                dashboardConfig: { select: { sections: true } },
                sources: { select: { fileName: true, rowCount: true, status: true }, take: 5 },
            },
        });
        if (!project) return null;
        if (project.shareTokenExpiresAt && new Date() > project.shareTokenExpiresAt) return null;
        return project;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
    const { token } = await params;
    const data = await getSharedProject(token);
    return {
        title: data ? `${data.name} — Shared Dashboard | VistaraBI` : 'Shared Dashboard — VistaraBI',
        description: data?.description ?? 'View this shared AI analytics dashboard powered by VistaraBI.',
        robots: { index: false },
    };
}

export default async function SharedDashboardPage({ params, searchParams }: SharePageProps) {
    const { token } = await params;
    const { embed } = await searchParams;
    const isEmbed = embed === '1';
    const data = await getSharedProject(token);

    if (!data) {
        return (
            <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ textAlign: 'center', color: '#f1f5f9', maxWidth: 420, padding: '2rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔗</div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>Link not found</h1>
                    <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: '2rem' }}>
                        This share link has expired or been revoked by the owner.
                    </p>
                    <a href="/register" style={{ padding: '0.875rem 2rem', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', borderRadius: '12px', fontWeight: 700, textDecoration: 'none' }}>
                        Create Your Own Dashboard →
                    </a>
                </div>
            </div>
        );
    }

    const domain = (data.domainDetection?.detectedDomain ?? 'GENERAL') as string;
    const confidence = data.domainDetection?.confidence ?? 0;
    const sections = (data.dashboardConfig?.sections as any[]) ?? [];
    const sources = data.sources ?? [];
    const totalRows = sources.reduce((s: number, src: any) => s + (src.rowCount ?? 0), 0);

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: 'system-ui, sans-serif', color: '#f1f5f9' }}>

            {/* Read-only banner */}
            {!isEmbed && (
                <div style={{ background: 'rgba(99,102,241,0.15)', borderBottom: '1px solid rgba(99,102,241,0.3)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#a5b4fc' }}>
                        <span style={{ fontWeight: 700, color: '#c7d2fe' }}>{data.name}</span> — Read-only shared view · Powered by VistaraBI
                    </div>
                    <a href="/register" style={{ padding: '0.4rem 1rem', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', fontSize: '0.75rem' }}>
                        Create Your Dashboard →
                    </a>
                </div>
            )}

            {/* Main content */}
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.5px', margin: 0 }}>{data.name}</h1>
                        {data.description && <p style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '0.875rem' }}>{data.description}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <span style={{ padding: '0.375rem 0.875rem', borderRadius: '999px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', fontSize: '0.75rem', fontWeight: 600, color: '#a5b4fc' }}>
                            {domain}
                        </span>
                        <span style={{ padding: '0.375rem 0.875rem', borderRadius: '999px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.75rem', fontWeight: 600, color: '#6ee7b7' }}>
                            {Math.round(Number(confidence))}% AI confidence
                        </span>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    {[
                        { label: 'Data Sources', value: sources.length },
                        { label: 'Total Rows', value: totalRows.toLocaleString() },
                        { label: 'Dashboard Sections', value: sections.length },
                        { label: 'Domain', value: domain.charAt(0) + domain.slice(1).toLowerCase() },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem 1.25rem' }}>
                            <p style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{label}</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0 0' }}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Sections */}
                {sections.length > 0 && (
                    <div>
                        <h2 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>Dashboard Sections</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                            {sections.map((s: any, i: number) => (
                                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '1.25rem' }}>{s.icon ?? '📊'}</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA footer */}
                {!isEmbed && (
                    <div style={{ textAlign: 'center', padding: '3rem 0 1rem', marginTop: '3rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ color: '#475569', marginBottom: '1rem', fontSize: '0.875rem' }}>
                            Powered by <strong style={{ color: '#818cf8' }}>VistaraBI</strong> — AI-powered business intelligence
                        </p>
                        <a href="/register" style={{ padding: '0.875rem 2rem', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', borderRadius: '12px', fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>
                            Analyze Your Own Data — Free →
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
