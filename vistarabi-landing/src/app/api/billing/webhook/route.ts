import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
    const body = await request.text();
    const sig = (await headers()).get('stripe-signature');

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        console.error(`[stripe-webhook] signature error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                const userId = session.metadata?.userId;
                const stripeCustomerId = session.customer as string;
                const stripeSubscriptionId = session.subscription as string;

                if (userId) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            stripeCustomerId,
                            stripeSubscriptionId,
                            // Map price ID to plan (this would be dynamic in production)
                            plan: 'PRO', 
                        },
                    });
                }
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as any;
                const stripeCustomerId = subscription.customer as string;
                const status = subscription.status;

                await prisma.user.update({
                    where: { stripeCustomerId },
                    data: {
                        plan: status === 'active' ? 'PRO' : 'STARTER',
                        stripeSubscriptionId: status === 'active' ? subscription.id : null,
                    },
                });
                break;
            }
            default:
                console.log(`[stripe-webhook] unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (dbError: any) {
        console.error('[stripe-webhook] database update failed:', dbError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }
}
