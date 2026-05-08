import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { createCheckoutSession } from '@/lib/billing';
import prisma from '@/lib/prisma';

/**
 * POST /api/billing/checkout
 * Create a Stripe checkout session for plan upgrade
 *
 * Body: {
 *   plan: "PRO" | "GROWTH" | "BUSINESS"
 *   billing_period: "monthly" | "annual"
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return apiError('UNAUTHORIZED', 'Not authenticated');
        }

        const body = await request.json();
        const { plan, billing_period } = body;

        if (!plan || !billing_period) {
            return apiError('VALIDATION_ERROR', 'plan and billing_period are required');
        }

        if (!['PRO', 'GROWTH', 'BUSINESS'].includes(plan)) {
            return apiError('VALIDATION_ERROR', 'Invalid plan');
        }

        if (!['monthly', 'annual'].includes(billing_period)) {
            return apiError('VALIDATION_ERROR', 'Invalid billing_period');
        }

        // Get user details
        const userRecord = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { email: true, name: true },
        });

        if (!userRecord) {
            return apiError('NOT_FOUND', 'User not found');
        }

        // Create checkout session
        const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/app/settings/billing`;
        const session = await createCheckoutSession(
            user.userId,
            plan,
            billing_period,
            returnUrl,
        );

        return apiSuccess({ url: session.url, session_id: session.id }, 200);
    } catch (error: any) {
        console.error('[checkout] Error:', error);
        
        if (error.message.includes('No price configured')) {
            return apiError('INVALID_FILE', error.message);
        }

        return apiError('INTERNAL_ERROR', 'Failed to create checkout session');
    }
}
