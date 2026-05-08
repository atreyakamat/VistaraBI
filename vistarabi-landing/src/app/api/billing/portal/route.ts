import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { createBillingPortalSession } from '@/lib/billing';
import prisma from '@/lib/prisma';

/**
 * POST /api/billing/portal
 * Create a Stripe billing portal session for plan/subscription management
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return apiError('UNAUTHORIZED', 'Not authenticated');
        }

        const userRecord = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { stripeCustomerId: true },
        });

        if (!userRecord?.stripeCustomerId) {
            return apiError('NOT_FOUND', 'No Stripe customer found. Start with a paid plan first.');
        }

        const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/app/settings/billing`;
        const session = await createBillingPortalSession(
            userRecord.stripeCustomerId,
            returnUrl,
        );

        return apiSuccess({ url: session.url }, 200);
    } catch (error: any) {
        console.error('[portal] Error:', error);
        return apiError('INTERNAL_ERROR', 'Failed to create billing portal session');
    }
}
