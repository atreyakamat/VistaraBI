import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { updateUserPlanFromSubscription, cancelSubscription } from '@/lib/billing';
import prisma from '@/lib/prisma';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
    if (!WEBHOOK_SECRET || !stripe) {
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 });
    }

    try {
        const body = await request.text();
        const signature = request.headers.get('stripe-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        // Verify webhook signature
        let event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
        } catch (err) {
            console.error('[webhook] Signature verification failed:', err);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        // Handle events
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const userId = subscription.metadata?.userId;

                if (userId) {
                    await updateUserPlanFromSubscription(userId, subscription);
                    console.log(`[webhook] Updated subscription for user ${userId}`);
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const userId = subscription.metadata?.userId;

                if (userId) {
                    // Downgrade user to STARTER plan
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            plan: 'STARTER',
                            stripeSubscriptionId: null,
                        },
                    });
                    console.log(`[webhook] Downgraded user ${userId} to STARTER`);
                }
                break;
            }

            case 'customer.updated': {
                const customer = event.data.object;
                const userId = customer.metadata?.userId;

                if (userId && customer.email) {
                    // Sync email if changed
                    await prisma.user.update({
                        where: { id: userId },
                        data: { email: customer.email },
                    });
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                console.warn(`[webhook] Payment failed for customer ${invoice.customer}: ${invoice.amount_due}¢`);
                // Could send email notification here
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                console.log(`[webhook] Payment succeeded for customer ${invoice.customer}: ${invoice.amount_paid}¢`);
                break;
            }

            default:
                console.log(`[webhook] Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error('[webhook] Error processing webhook:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
