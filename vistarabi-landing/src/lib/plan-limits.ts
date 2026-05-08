import { BillingPlan, getPlanLimits } from '@/lib/stripe';
import { apiError } from '@/lib/api-response';

/**
 * Check if a user can perform an action based on their plan
 */
export function checkPlanLimit(
    plan: BillingPlan,
    limit_type: keyof typeof getPlanLimits,
    current_usage: number,
): boolean {
    const limits = getPlanLimits(plan);
    const limit = limits[limit_type] as number;
    return current_usage < limit;
}

/**
 * Get a user-friendly error message for a plan limit violation
 */
export function getPlanLimitMessage(plan: BillingPlan, limit_type: string): string {
    const limits = getPlanLimits(plan);
    const limit = (limits as any)[limit_type];

    const messages: Record<string, string> = {
        projects: `You've reached the ${limit} project limit on the ${plan} plan. Upgrade to create more projects.`,
        file_size_mb: `File size exceeds the ${limit}MB limit for the ${plan} plan. Upgrade for larger files.`,
        kpis_per_project: `You've reached the ${limit} KPI limit per project on the ${plan} plan. Upgrade for more KPIs.`,
        retention_days: `Data retention for this plan is limited to ${limit} days.`,
    };

    return messages[limit_type] || `Upgrade your plan to access this feature.`;
}

/**
 * Validate project creation against plan limits
 */
export async function validateProjectLimitForPlan(
    plan: BillingPlan,
    userId: string,
    prisma: any,
) {
    const limits = getPlanLimits(plan);
    const projectCount = await prisma.project.count({
        where: { userId },
    });

    if (projectCount >= limits.projects) {
        return {
            allowed: false,
            message: getPlanLimitMessage(plan, 'projects'),
        };
    }

    return { allowed: true };
}

/**
 * Validate file size against plan limits
 */
export async function validateFileSizeForPlan(
    plan: BillingPlan,
    fileSize: number,
): Promise<{ allowed: boolean; message?: string }> {
    const limits = getPlanLimits(plan);
    const fileSizeMb = fileSize / (1024 * 1024);

    if (fileSizeMb > limits.file_size_mb) {
        return {
            allowed: false,
            message: getPlanLimitMessage(plan, 'file_size_mb'),
        };
    }

    return { allowed: true };
}

/**
 * Validate KPI count against plan limits
 */
export async function validateKPILimitForPlan(
    plan: BillingPlan,
    projectId: string,
    prisma: any,
): Promise<{ allowed: boolean; message?: string }> {
    const limits = getPlanLimits(plan);
    const kpiCount = await prisma.kPIBlueprint.count({
        where: { projectId },
    });

    if (kpiCount >= limits.kpis_per_project) {
        return {
            allowed: false,
            message: getPlanLimitMessage(plan, 'kpis_per_project'),
        };
    }

    return { allowed: true };
}
