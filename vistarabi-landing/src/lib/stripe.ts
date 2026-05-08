import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not set — billing features disabled');
}

export const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
}) : null;

// Plan definitions with pricing tiers
export const BILLING_PLANS = {
    STARTER: {
        name: 'Starter',
        monthly_price_cents: 0,
        annual_price_cents: 0,
        stripe_price_id_monthly: null,
        stripe_price_id_annual: null,
        limits: {
            projects: 1,
            file_size_mb: 5,
            kpis_per_project: 3,
            retention_days: 30,
        },
    },
    PRO: {
        name: 'Pro',
        monthly_price_cents: 4900,
        annual_price_cents: 47000,
        stripe_price_id_monthly: process.env.STRIPE_PRO_PRICE_ID_MONTHLY,
        stripe_price_id_annual: process.env.STRIPE_PRO_PRICE_ID_ANNUAL,
        limits: {
            projects: 10,
            file_size_mb: 100,
            kpis_per_project: 999,
            retention_days: 365,
        },
    },
    GROWTH: {
        name: 'Growth',
        monthly_price_cents: 14900,
        annual_price_cents: 143000,
        stripe_price_id_monthly: process.env.STRIPE_GROWTH_PRICE_ID_MONTHLY,
        stripe_price_id_annual: process.env.STRIPE_GROWTH_PRICE_ID_ANNUAL,
        limits: {
            projects: 50,
            file_size_mb: 500,
            kpis_per_project: 999,
            retention_days: 730,
        },
    },
    BUSINESS: {
        name: 'Business',
        monthly_price_cents: 49900,
        annual_price_cents: 479000,
        stripe_price_id_monthly: process.env.STRIPE_BUSINESS_PRICE_ID_MONTHLY,
        stripe_price_id_annual: process.env.STRIPE_BUSINESS_PRICE_ID_ANNUAL,
        limits: {
            projects: 999,
            file_size_mb: 2048,
            kpis_per_project: 999,
            retention_days: 2555, // ~7 years
        },
    },
} as const;

export type BillingPlan = keyof typeof BILLING_PLANS;

export function getPlanLimits(plan: BillingPlan) {
    return BILLING_PLANS[plan]?.limits || BILLING_PLANS.STARTER.limits;
}

export function getPlanName(plan: BillingPlan): string {
    return BILLING_PLANS[plan]?.name || 'Starter';
}

export function getPlanPrice(plan: BillingPlan, billing: 'monthly' | 'annual' = 'monthly'): number {
    if (billing === 'annual') {
        return BILLING_PLANS[plan]?.annual_price_cents || 0;
    }
    return BILLING_PLANS[plan]?.monthly_price_cents || 0;
}
