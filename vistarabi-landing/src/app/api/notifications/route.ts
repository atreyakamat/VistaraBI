import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/api-response';
import { markAllRead } from '@/lib/notifications';

/**
 * GET /api/notifications
 * Returns unread count + most recent 20 notifications for the current user
 */
export async function GET() {
    const user = await getCurrentUser();
    if (!user) return apiError('UNAUTHORIZED', 'Not authenticated');

    const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
            where: { userId: user.userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        }),
        prisma.notification.count({
            where: { userId: user.userId, read: false },
        }),
    ]);

    return apiSuccess({ notifications, unreadCount });
}

/**
 * PATCH /api/notifications — mark all as read
 */
export async function PATCH() {
    const user = await getCurrentUser();
    if (!user) return apiError('UNAUTHORIZED', 'Not authenticated');
    await markAllRead(user.userId);
    return apiSuccess({ marked: true });
}
