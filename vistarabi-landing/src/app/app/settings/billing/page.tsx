'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const PLANS = [
    { id: 'starter', name: 'Starter', price: '$0', period: '/mo', color: '#64748b', features: ['1 project', '5MB files', '3 KPIs/project', 'Community support'] },
    { id: 'pro', name: 'Pro', price: '$49', period: '/mo', color: '#6366f1', features: ['10 projects', '100MB files', 'Unlimited KPIs', 'Email support', 'CSV export', 'Share links'] },
    { id: 'growth', name: 'Growth', price: '$149', period: '/mo', color: '#8b5cf6', features: ['50 projects', '500MB files', 'Teams (5 members)', 'Priority support', 'PDF reports', 'API access'] },
    { id: 'business', name: 'Business', price: '$499', period: '/mo', color: '#ec4899', features: ['Unlimited projects', 'Unlimited files', 'Unlimited teams', 'Dedicated support', 'SLA 99.9%', 'Custom domain'] },
];

export default function BillingPage() {
    const [currentPlan, setCurrentPlan] = useState<string>('starter');
    const [loading, setLoading] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        fetch('/api/billing/status').then(r => r.json()).then(d => {
            if (d.plan) setCurrentPlan(d.plan.toLowerCase());
        }).catch(() => {});
    }, []);

    async function handleUpgrade(planId: string) {
        if (planId === 'starter') return;
        setLoading(true);
        try {
            const res = await fetch('/api/billing/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error(data.error || 'Failed to start checkout');
            }
        } catch {
            toast.error('Failed to connect to billing');
        } finally {
            setLoading(false);
        }
    }

    async function handleManage() {
        setPortalLoading(true);
        try {
            const res = await fetch('/api/billing/portal', { method: 'POST' });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
            else toast.error('No billing portal found. Upgrade to a paid plan first.');
        } catch {
            toast.error('Failed to open billing portal');
        } finally {
            setPortalLoading(false);
        }
    }

    return (
        <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[var(--foreground)]">Billing & Plan</h1>
                <p className="text-[var(--muted)] mt-1 text-sm">
                    Current plan: <span className="font-bold text-[var(--accent)] capitalize">{currentPlan}</span>
                    {currentPlan !== 'starter' && (
                        <button
                            onClick={handleManage}
                            disabled={portalLoading}
                            className="ml-4 text-xs underline text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                        >
                            {portalLoading ? 'Opening...' : 'Manage subscription →'}
                        </button>
                    )}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PLANS.map(plan => {
                    const isCurrent = currentPlan === plan.id;
                    return (
                        <div
                            key={plan.id}
                            className="rounded-2xl border p-5 flex flex-col gap-3 transition-all"
                            style={{
                                borderColor: isCurrent ? plan.color : 'var(--border)',
                                background: isCurrent ? `${plan.color}10` : 'var(--card)',
                                boxShadow: isCurrent ? `0 0 0 2px ${plan.color}40` : undefined,
                            }}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-sm" style={{ color: plan.color }}>{plan.name}</span>
                                    {isCurrent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${plan.color}20`, color: plan.color }}>CURRENT</span>}
                                </div>
                                <div className="text-2xl font-black text-[var(--foreground)]">
                                    {plan.price}<span className="text-sm font-normal text-[var(--muted)]">{plan.period}</span>
                                </div>
                            </div>
                            <ul className="space-y-1.5 flex-1">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-center gap-2 text-xs text-[var(--muted)]">
                                        <span style={{ color: plan.color }}>✓</span> {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => handleUpgrade(plan.id)}
                                disabled={isCurrent || loading || plan.id === 'starter'}
                                className="w-full py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                style={{
                                    background: isCurrent || plan.id === 'starter' ? 'var(--border)' : plan.color,
                                    color: isCurrent || plan.id === 'starter' ? 'var(--muted)' : 'white',
                                }}
                            >
                                {isCurrent ? 'Current Plan' : plan.id === 'starter' ? 'Free Forever' : loading ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] text-xs text-[var(--muted)]">
                <strong className="text-[var(--foreground)]">Billing powered by Stripe.</strong>{' '}
                All plans include a 14-day free trial. Cancel anytime. Prices in USD.
                Questions? <a href="mailto:billing@vistarabi.com" className="underline">billing@vistarabi.com</a>
            </div>
        </div>
    );
}
