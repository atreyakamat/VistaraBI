import { getCurrentUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import prisma from '@/lib/prisma';

/**
 * GET /api/billing/status
 * Returns current user's plan and usage stats
 */
export async function GET() {
    const user = await getCurrentUser();
    if (!user) return apiError('UNAUTHORIZED', 'Not authenticated');

    const record = await prisma.user.findUnique({
        where: { id: user.userId },
        select: {
            plan: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            _count: { select: { projects: true } },
        },
    });

    if (!record) return apiError('NOT_FOUND', 'User not found');

    return apiSuccess({
        plan: record.plan,
        hasActiveSubscription: !!record.stripeSubscriptionId,
        projectCount: record._count.projects,
    });
}
