export default function RootLoading() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
        }}>
            <div style={{ textAlign: 'center' }}>
                {/* Pulsing logo */}
                <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    margin: '0 auto 1.5rem',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                }}>
                    📊
                </div>
                <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.95)} }`}</style>
                <p style={{ color: '#475569', fontSize: '0.875rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Loading VistaraBI…
                </p>
            </div>
        </div>
    );
}
