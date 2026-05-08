// Notification creation utility — called server-side from API routes
// Import this in upload handlers, anomaly detection, share views, goal completions

import prisma from '@/lib/prisma';

export type NotificationType =
    | 'upload_complete'
    | 'anomaly_detected'
    | 'kpi_goal_reached'
    | 'share_viewed'
    | 'pipeline_failed'
    | 'report_ready';

export async function createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string
): Promise<void> {
    try {
        await prisma.notification.create({
            data: { userId, type, title, body },
        });
    } catch (err) {
        // Non-blocking — notification failure must never crash the parent flow
        console.error('[notifications] Failed to create notification:', err);
    }
}

export async function markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
    });
}
