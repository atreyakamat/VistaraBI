// Domain Classifier - Selects domain and generates explanation

import { DomainType, DomainStatus, DOMAIN_LIBRARIES, AUTO_ASSIGN_THRESHOLD } from './domain-keywords';
import { ScoringResult } from './domain-scorer';

export interface ClassificationResult {
    detectedDomain: DomainType | null;
    confidence: number;
    status: DomainStatus;
    scoringBreakdown: Record<DomainType, number>;
    matchedColumns: string[];
    explanation: string;
}

export function classifyDomain(scoringResult: ScoringResult): ClassificationResult {
    console.log('[DomainClassifier] Classifying project:', scoringResult.projectId);

    const { topDomain, topConfidence, scores } = scoringResult;

    // Build scoring breakdown
    const scoringBreakdown = scores.reduce((acc, score) => {
        acc[score.domain] = score.confidence;
        return acc;
    }, {} as Record<DomainType, number>);

    // Get matched columns for top domain
    const topScore = scores.find(s => s.domain === topDomain);
    const matchedColumns = topScore?.matchedColumns || [];

    // Determine status based on confidence threshold
    let status: DomainStatus;
    let detectedDomain: DomainType | null;
    let explanation: string;

    if (!topDomain || topConfidence === 0) {
        status = 'MANUAL_REQUIRED';
        detectedDomain = null;
        explanation = 'No domain keywords detected in your datasets. Please manually select your business domain.';
    } else if (topConfidence >= AUTO_ASSIGN_THRESHOLD) {
        status = 'AUTO_ASSIGNED';
        detectedDomain = topDomain;
        const domainInfo = DOMAIN_LIBRARIES[topDomain];
        explanation = generateExplanation(domainInfo.name, topConfidence, matchedColumns);
    } else {
        status = 'MANUAL_REQUIRED';
        detectedDomain = topDomain; // Still show suggestion
        const domainInfo = DOMAIN_LIBRARIES[topDomain];
        explanation = `Low confidence (${topConfidence}%) for ${domainInfo.name}. ` +
            `Detected columns: ${matchedColumns.slice(0, 5).join(', ')}${matchedColumns.length > 5 ? '...' : ''}. ` +
            `Please confirm or select a different domain.`;
    }

    console.log(`[DomainClassifier] Result: ${detectedDomain} (${status}) - ${topConfidence}%`);

    return {
        detectedDomain,
        confidence: topConfidence,
        status,
        scoringBreakdown,
        matchedColumns,
        explanation,
    };
}

function generateExplanation(domainName: string, confidence: number, matchedColumns: string[]): string {
    const columnList = matchedColumns.slice(0, 8).join(', ');
    const moreCount = matchedColumns.length - 8;

    let explanation = `Detected as ${domainName} with ${confidence}% confidence. `;
    explanation += `Matched columns: ${columnList}`;

    if (moreCount > 0) {
        explanation += ` and ${moreCount} more`;
    }
    explanation += '.';

    return explanation;
}
