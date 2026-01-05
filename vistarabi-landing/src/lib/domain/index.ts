// Domain Detection Orchestrator - Main entry point for domain classification

import { randomUUID } from 'crypto';
import db from '@/lib/prisma';
import { DomainType, DomainStatus } from './domain-keywords';
import { scanProjectColumns } from './column-scanner';
import { calculateDomainScores } from './domain-scorer';
import { classifyDomain } from './domain-classifier';

export type { DomainType, DomainStatus } from './domain-keywords';
export { DOMAIN_LIBRARIES, getDomainInfo, ALL_DOMAINS } from './domain-keywords';

export interface DomainDetectionResult {
    id: string;
    projectId: string;
    detectedDomain: DomainType | null;
    confidence: number;
    status: DomainStatus;
    scoringBreakdown: Record<DomainType, number>;
    matchedColumns: string[];
    explanation: string;
    detectedAt: Date;
}

export async function detectDomain(projectId: string): Promise<DomainDetectionResult> {
    console.log('[DomainDetection] Starting domain detection for project:', projectId);

    // Step 1: Scan all columns from all sources
    const scanResult = await scanProjectColumns(projectId);

    // Step 2: Calculate scores for each domain
    const scoringResult = calculateDomainScores(scanResult);

    // Step 3: Classify and generate explanation
    const classificationResult = classifyDomain(scoringResult);

    // Step 4: Store result in database
    const result: DomainDetectionResult = {
        id: randomUUID(),
        projectId,
        detectedDomain: classificationResult.detectedDomain,
        confidence: classificationResult.confidence,
        status: classificationResult.status,
        scoringBreakdown: classificationResult.scoringBreakdown,
        matchedColumns: classificationResult.matchedColumns,
        explanation: classificationResult.explanation,
        detectedAt: new Date(),
    };

    // Upsert domain detection record
    const existing = await db.domainDetection.findUnique({ where: { projectId } });
    if (existing) {
        await db.domainDetection.update({
            where: { projectId },
            data: result,
        });
        console.log('[DomainDetection] Updated existing domain detection record');
    } else {
        await db.domainDetection.create({ data: result });
        console.log('[DomainDetection] Created new domain detection record');
    }

    console.log('[DomainDetection] Detection complete:', {
        domain: result.detectedDomain,
        confidence: result.confidence,
        status: result.status,
    });

    // Step 5: Initialize governance if not exists (Module 3 Phase 3B)
    try {
        const { initializeGovernance } = await import('./governance');
        await initializeGovernance(projectId, result.detectedDomain, result.confidence, 'system');
    } catch (govError) {
        console.error('[DomainDetection] Governance initialization error:', govError);
    }

    return result;
}

export async function getDomainDetection(projectId: string): Promise<DomainDetectionResult | null> {
    return await db.domainDetection.findUnique({ where: { projectId } });
}

export async function manuallySelectDomain(
    projectId: string,
    domain: DomainType
): Promise<DomainDetectionResult> {
    console.log('[DomainDetection] Manually selecting domain:', domain, 'for project:', projectId);

    const existing = await db.domainDetection.findUnique({ where: { projectId } });

    const result: DomainDetectionResult = {
        id: existing?.id || randomUUID(),
        projectId,
        detectedDomain: domain,
        confidence: 100, // Manual selection = 100% confidence
        status: 'MANUALLY_SELECTED',
        scoringBreakdown: existing?.scoringBreakdown || ({} as Record<DomainType, number>),
        matchedColumns: existing?.matchedColumns || [],
        explanation: `Domain manually selected as ${domain}.`,
        detectedAt: new Date(),
    };

    if (existing) {
        await db.domainDetection.update({ where: { projectId }, data: result });
    } else {
        await db.domainDetection.create({ data: result });
    }

    // Step 5: Sync with governance
    try {
        const { setGovernedDomain, getGovernedDomain } = await import('./governance');
        const gov = await getGovernedDomain(projectId);
        if (gov) {
            await setGovernedDomain({
                projectId,
                domain,
                userId: 'user-manual',
                reason: 'Manually selected in UI',
                confidence: 100
            });
        }
    } catch (govError) {
        console.error('[DomainDetection] Governance sync error:', govError);
    }

    return result;
}
