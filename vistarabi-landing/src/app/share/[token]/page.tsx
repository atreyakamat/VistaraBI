import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

interface SharePageProps {
    params: Promise<{ token: string }>;
    searchParams: Promise<{ embed?: string }>;
}

async function getSharedProject(token: string) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    try {
        const res = await fetch(`${appUrl}/api/share/${token}`, { cache: 'no-store' });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
    const { token } = await params;
    const data = await getSharedProject(token);
    return {
        title: data ? `${data.projectName} Dashboard — VistaraBI` : 'Shared Dashboard — VistaraBI',
        description: data?.description ?? 'View this shared analytics dashboard powered by VistaraBI.',
    };
}

export default async function SharedDashboardPage({ params, searchParams }: SharePageProps) {
    const { token } = await params;
    const { embed } = await searchParams;
    const isEmbed = embed === '1';

    const data = await getSharedProject(token);

    if (!data) {
        return (
            <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
                <div style={{ textAlign: 'center', color: '#f1f5f9', maxWidth: 420, padding: '2rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔗</div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>Link not found</h1>
                    <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: '2rem' }}>
                        This share link may have expired or been revoked by the owner.
                    </p>
                    <a href="/" style={{ padding: '0.875rem 2rem', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', borderRadius: '12px', fontWeight: 700, textDecoration: 'none' }}>
                        Learn about VistaraBI →
                    </a>
                </div>
            </div>
        );
    }

    // Redirect to the live dashboard with a read-only indicator
    // For now, redirect to the actual dashboard page with a share=1 flag
    redirect(`/app/projects/${data.projectId}/dashboard?share=1`);
}
