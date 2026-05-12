import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth';
import { apiError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return apiError('UNAUTHORIZED', 'Not authenticated', 401);
    }

    try {
        const { priceId } = await request.json();
        if (!priceId) {
            return apiError('VALIDATION_ERROR', 'Price ID is required');
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        if (!stripe) {
            return apiError('INTERNAL_ERROR', 'Stripe is not configured');
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer_email: user.email,
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${appUrl}/app/settings/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/app/settings/billing?canceled=1`,
            metadata: {
                userId: user.userId,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('[stripe-checkout] error:', error);
        return apiError('INTERNAL_ERROR', error.message || 'Checkout failed');
    }
}
