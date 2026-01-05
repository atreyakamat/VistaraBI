// Dataset quality grader - assigns A-F grade

import { QualityGrade, RiskLevel } from '@/lib/prisma';

export function gradeDatasetQuality(
    completenessScore: number,
    consistencyScore: number,
    accuracyScore: number
): QualityGrade {
    // Calculate minimum score (weakest link determines grade)
    const minScore = Math.min(completenessScore, consistencyScore, accuracyScore);

    if (minScore >= 95) return 'A';  // Excellent
    if (minScore >= 85) return 'B';  // Good
    if (minScore >= 70) return 'C';  // Acceptable
    if (minScore >= 50) return 'D';  // Poor
    return 'F';  // Failing
}

export function determineRiskLevel(
    completenessScore: number,
    consistencyScore: number,
    accuracyScore: number
): RiskLevel {
    const minScore = Math.min(completenessScore, consistencyScore, accuracyScore);

    if (minScore >= 80) return 'LOW';      // Safe to use
    if (minScore >= 50) return 'MEDIUM';   // Use with caution
    return 'HIGH';  // Risky data
}

export function getGradeColor(grade: QualityGrade): string {
    const colors: Record<QualityGrade, string> = {
        'A': 'text-green-600 bg-green-100',
        'B': 'text-lime-600 bg-lime-100',
        'C': 'text-yellow-600 bg-yellow-100',
        'D': 'text-orange-600 bg-orange-100',
        'F': 'text-red-600 bg-red-100',
    };
    return colors[grade];
}

export function getRiskColor(risk: RiskLevel): string {
    const colors: Record<RiskLevel, string> = {
        'LOW': 'text-green-600 bg-green-100',
        'MEDIUM': 'text-yellow-600 bg-yellow-100',
        'HIGH': 'text-red-600 bg-red-100',
    };
    return colors[risk];
}
