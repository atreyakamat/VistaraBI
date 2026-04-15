// Domain Scorer - Calculate confidence scores for each domain

import { DomainType, DOMAIN_LIBRARIES, ALL_DOMAINS } from './domain-keywords';
import { ScanResult } from './column-scanner';

export interface DomainScore {
    domain: DomainType;
    matchCount: number;
    totalKeywords: number;
    confidence: number; // 0-100
    matchedColumns: string[];
}

export interface ScoringResult {
    projectId: string;
    scores: DomainScore[];
    topDomain: DomainType | null;
    topConfidence: number;
    totalMatches: number;
}

export function calculateDomainScores(scanResult: ScanResult): ScoringResult {
    console.log('[DomainScorer] Calculating scores for project:', scanResult.projectId);

    const scores: DomainScore[] = [];
    let totalMatches = 0;

    for (const domain of ALL_DOMAINS) {
        const matches = scanResult.matchesByDomain[domain];
        const totalKeywords = DOMAIN_LIBRARIES[domain].keywords.length;

        // Count unique matched keywords (not columns)
        const uniqueKeywords = new Set(matches.map(m => m.matchedKeyword));
        const matchCount = uniqueKeywords.size;
        totalMatches += matchCount;

        // Confidence = (unique keywords matched / total keywords in library) × 100
        const confidence = Math.round((matchCount / totalKeywords) * 100);

        scores.push({
            domain,
            matchCount,
            totalKeywords,
            confidence,
            matchedColumns: matches.map(m => m.columnName),
        });
    }

    // Apply heuristic guidelines to prevent RETAIL vs ECOMMERCE confusion
    const ecomScore = scores.find(s => s.domain === 'ECOMMERCE');
    const retailScore = scores.find(s => s.domain === 'RETAIL');

    if (ecomScore && retailScore && (ecomScore.confidence > 0 || retailScore.confidence > 0)) {
        // Exclusive E-Commerce signals
        const ecomExclusive = ['cart', 'checkout', 'shipping', 'delivery', 'session', 'visitor'];
        const ecomExclusiveCount = ecomExclusive.filter(kw => scanResult.matchesByDomain['ECOMMERCE'].some(m => m.matchedKeyword.includes(kw))).length;

        // Exclusive Retail signals
        const retailExclusive = ['store', 'pos', 'inventory', 'shelf', 'aisle', 'footfall', 'barcode', 'shrinkage'];
        const retailExclusiveCount = retailExclusive.filter(kw => scanResult.matchesByDomain['RETAIL'].some(m => m.matchedKeyword.includes(kw))).length;

        if (retailExclusiveCount > ecomExclusiveCount) {
            retailScore.confidence += 20; // Boost Retail
            ecomScore.confidence = Math.max(0, ecomScore.confidence - 10); // Penalize Ecom
        } else if (ecomExclusiveCount > retailExclusiveCount) {
            ecomScore.confidence += 20; // Boost Ecom
            retailScore.confidence = Math.max(0, retailScore.confidence - 10); // Penalize Retail
        }
    }

    // Sort by confidence descending
    scores.sort((a, b) => b.confidence - a.confidence);

    const topDomain = scores[0]?.confidence > 0 ? scores[0].domain : null;
    const topConfidence = scores[0]?.confidence || 0;

    console.log(`[DomainScorer] Top domain: ${topDomain} with ${topConfidence}% confidence`);
    console.log('[DomainScorer] All scores:', scores.map(s => `${s.domain}: ${s.confidence}%`).join(', '));

    return {
        projectId: scanResult.projectId,
        scores,
        topDomain,
        topConfidence,
        totalMatches,
    };
}
