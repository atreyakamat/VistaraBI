import prisma from '@/lib/prisma';
import { PLAN_LIMITS } from './stripe';
import { BillingPlan } from '@prisma/client';

export async function checkProjectLimit(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
    });

    if (!user) return { allowed: false, message: 'User not found' };

    const projectCount = await prisma.project.count({
        where: { userId },
    });

    const limit = PLAN_LIMITS[user.plan as BillingPlan].projects;

    if (projectCount >= limit) {
        return {
            allowed: false,
            message: `Your current ${user.plan} plan is limited to ${limit} project(s). Please upgrade to create more.`,
            current: projectCount,
            limit,
        };
    }

    return { allowed: true, current: projectCount, limit };
}

export async function checkFileUploadLimit(userId: string, fileSizeMb: number) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { plan: true },
    });

    if (!user) return { allowed: false, message: 'User not found' };

    const limit = PLAN_LIMITS[user.plan as BillingPlan].fileSizeMb;

    if (fileSizeMb > limit) {
        return {
            allowed: false,
            message: `Your current ${user.plan} plan limit is ${limit}MB per file. The uploaded file is ${fileSizeMb.toFixed(1)}MB.`,
            limit,
        };
    }

    return { allowed: true, limit };
}
