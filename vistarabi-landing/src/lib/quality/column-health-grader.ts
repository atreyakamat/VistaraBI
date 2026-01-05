// Column health grader - assigns GOOD/PARTIAL/POOR status

import { HealthStatus } from '@/lib/prisma';

export function gradeColumnHealth(
    completeness: number,
    consistency: number,
    outlierPercentage: number
): HealthStatus {
    // GOOD: High quality across all metrics
    if (completeness >= 95 && consistency >= 90 && outlierPercentage < 5) {
        return 'GOOD';
    }

    // PARTIAL: Acceptable quality with some issues
    if (completeness >= 80 && consistency >= 70 && outlierPercentage < 15) {
        return 'PARTIAL';
    }

    // POOR: Significant quality issues
    return 'POOR';
}

export function getHealthIssues(
    completeness: number,
    consistency: number,
    outlierPercentage: number,
    outlierCount: number
): string[] {
    const issues: string[] = [];

    if (completeness < 95) {
        const missing = 100 - completeness;
        issues.push(`${missing.toFixed(1)}% missing values`);
    }

    if (consistency < 90) {
        const inconsistent = 100 - consistency;
        issues.push(`${inconsistent.toFixed(1)}% format inconsistencies`);
    }

    if (outlierPercentage >= 5) {
        issues.push(`${outlierCount} outlier${outlierCount !== 1 ? 's' : ''} detected (${outlierPercentage.toFixed(1)}%)`);
    }

    return issues;
}
