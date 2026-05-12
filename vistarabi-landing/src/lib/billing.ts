import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

export type BillingPlan = 'STARTER' | 'PRO' | 'GROWTH' | 'BUSINESS';

const BILLING_PLANS: Record<string, any> = {
    STARTER: { stripe_price_id_monthly: 'price_starter_m', stripe_price_id_annual: 'price_starter_a' },
    PRO: { stripe_price_id_monthly: 'price_pro_m', stripe_price_id_annual: 'price_pro_a' },
    GROWTH: { stripe_price_id_monthly: 'price_growth_m', stripe_price_id_annual: 'price_growth_a' },
    BUSINESS: { stripe_price_id_monthly: 'price_business_m', stripe_price_id_annual: 'price_business_a' }
};

/**
 * Create a Stripe customer for a user
 */
export async function createStripeCustomer(userId: string, email: string, name: string) {
    if (!stripe) {
        throw new Error('Stripe not configured');
    }

    try {
        const customer = await stripe.customers.create({
            email,
            name,
            metadata: { userId },
        });

        // Update user with Stripe customer ID
        await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customer.id },
        });

        return customer;
    } catch (error) {
        console.error('[Stripe] Failed to create customer:', error);
        throw error;
    }
}

/**
 * Get or create Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(userId: string, email: string, name: string) {
    if (!stripe) {
        throw new Error('Stripe not configured');
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { stripeCustomerId: true },
    });

    if (user?.stripeCustomerId) {
        return user.stripeCustomerId;
    }

    const customer = await createStripeCustomer(userId, email, name);
    return customer.id;
}

/**
 * Create a checkout session for plan upgrade
 */
export async function createCheckoutSession(
    userId: string,
    plan: BillingPlan,
    billing_period: 'monthly' | 'annual',
    returnUrl: string,
) {
    if (!stripe) {
        throw new Error('Stripe not configured');
    }

    const planConfig = BILLING_PLANS[plan];
    if (!planConfig) {
        throw new Error(`Invalid plan: ${plan}`);
    }

    const priceId = billing_period === 'annual' 
        ? planConfig.stripe_price_id_annual 
        : planConfig.stripe_price_id_monthly;

    if (!priceId) {
        throw new Error(`No price configured for ${plan} ${billing_period}`);
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, stripeCustomerId: true },
    });

    if (!user) {
        throw new Error('User not found');
    }

    const customerId = await getOrCreateStripeCustomer(userId, user.email, user.name!);

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${returnUrl}?canceled=true`,
        metadata: {
            userId,
            plan,
            billingPeriod: billing_period,
        },
    });

    return session;
}

/**
 * Create a billing portal session
 */
export async function createBillingPortalSession(
    customerId: string,
    returnUrl: string,
) {
    if (!stripe) {
        throw new Error('Stripe not configured');
    }

    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });

    return session;
}

/**
 * Get subscription details
 */
export async function getSubscriptionDetails(subscriptionId: string) {
    if (!stripe) {
        throw new Error('Stripe not configured');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
    });

    return subscription;
}

/**
 * Update user plan based on Stripe subscription
 */
export async function updateUserPlanFromSubscription(userId: string, subscription: any) {
    if (!subscription.items.data[0]) {
        throw new Error('No subscription items found');
    }

    const priceId = subscription.items.data[0].price.id;
    
    // Find which plan this price belongs to
    let planName: BillingPlan = 'STARTER';
    
    for (const [plan, config] of Object.entries(BILLING_PLANS)) {
        if (config.stripe_price_id_monthly === priceId || config.stripe_price_id_annual === priceId) {
            planName = plan as BillingPlan;
            break;
        }
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            plan: planName,
            stripeSubscriptionId: subscription.id,
        },
    });

    return planName;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
    if (!stripe) {
        throw new Error('Stripe not configured');
    }

    return await stripe.subscriptions.cancel(subscriptionId);
}
