import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VistaraBI — AI-Powered Business Intelligence';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Background grid */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.15) 1px, transparent 0)',
                    backgroundSize: '40px 40px',
                }} />

                {/* Glow orb top-right */}
                <div style={{
                    position: 'absolute', top: -100, right: -100,
                    width: 500, height: 500,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
                }} />

                {/* Glow orb bottom-left */}
                <div style={{
                    position: 'absolute', bottom: -100, left: -100,
                    width: 400, height: 400,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)',
                }} />

                {/* Logo mark */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    marginBottom: 32,
                }}>
                    <div style={{
                        width: 72, height: 72,
                        borderRadius: 20,
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 36,
                        boxShadow: '0 0 40px rgba(99,102,241,0.5)',
                    }}>
                        📊
                    </div>
                    <span style={{
                        fontSize: 48, fontWeight: 800,
                        color: '#f1f5f9',
                        letterSpacing: '-2px',
                    }}>
                        VistaraBI
                    </span>
                </div>

                {/* Headline */}
                <div style={{
                    fontSize: 56, fontWeight: 900,
                    background: 'linear-gradient(135deg, #f8fafc 0%, #c7d2fe 50%, #67e8f9 100%)',
                    backgroundClip: 'text',
                    color: 'transparent',
                    textAlign: 'center',
                    lineHeight: 1.1,
                    letterSpacing: '-2px',
                    maxWidth: 900,
                    display: 'flex',
                }}>
                    Turn Business Data Into Decisions
                </div>

                {/* Subline */}
                <div style={{
                    fontSize: 24, color: '#94a3b8',
                    marginTop: 20, textAlign: 'center',
                    maxWidth: 700,
                    display: 'flex',
                }}>
                    Upload a CSV · Get AI dashboards, KPIs &amp; forecasts in minutes
                </div>

                {/* Feature pills */}
                <div style={{
                    display: 'flex', gap: 12, marginTop: 40,
                }}>
                    {['AI KPI Engine', 'Domain Detection', 'Goal Strategy', 'PDF Reports'].map((label) => (
                        <div key={label} style={{
                            padding: '8px 20px',
                            borderRadius: 100,
                            background: 'rgba(99,102,241,0.15)',
                            border: '1px solid rgba(99,102,241,0.3)',
                            color: '#c7d2fe',
                            fontSize: 16,
                            fontWeight: 600,
                            display: 'flex',
                        }}>
                            {label}
                        </div>
                    ))}
                </div>
            </div>
        ),
        { ...size }
    );
}
