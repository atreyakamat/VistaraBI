// Domain Governance Service (Module 3 Phase 3B)
// This is THE ONLY authoritative source of domain information for downstream modules

import { randomUUID } from 'crypto';
import db from '@/lib/prisma';
import type { DomainType, GovernanceStatus } from '@/lib/prisma';
import { detectDomain } from './index';

export interface GovernDomainParams {
    projectId: string;
    domain: DomainType;
    userId: string;
    reason: string;
    confidence?: number;
}

export interface LockDomainParams {
    projectId: string;
    userId: string;
    reason: string;
}

// Initialize governance for a project (called after first domain detection)
export async function initializeGovernance(
    projectId: string,
    detectedDomain: DomainType | null,
    confidence: number,
    userId: string
): Promise<void> {
    const existing = await db.domainGovernance.findUnique({ where: { projectId } });

    if (existing) return; // Already initialized

    const governance = {
        id: randomUUID(),
        projectId,
        activeDomain: detectedDomain,
        governanceStatus: (confidence >= 60 ? 'AUTO' : 'MANUAL') as GovernanceStatus,
        isLocked: false,
        version: 1,
        changedBy: userId || 'system',
        changeReason: confidence >= 60
            ? `Auto-detected with ${confidence}% confidence`
            : 'Low confidence - manual selection required',
        lastUpdated: new Date(),
    };

    await db.domainGovernance.create({ data: governance });

    // Create first history record
    await db.domainHistory.create({
        data: {
            id: randomUUID(),
            projectId,
            version: 1,
            previousDomain: null,
            newDomain: detectedDomain,
            previousStatus: 'AUTO' as GovernanceStatus,
            newStatus: governance.governanceStatus,
            changedBy: governance.changedBy,
            changeReason: governance.changeReason,
            confidence,
            changedAt: new Date(),
        },
    });
}

// Get governed domain (THE authoritative API for all downstream modules)
export async function getGovernedDomain(projectId: string) {
    return await db.domainGovernance.findUnique({ where: { projectId } });
}

// Manually set or override domain
export async function setGovernedDomain(params: GovernDomainParams) {
    const { projectId, domain, userId, reason, confidence = 100 } = params;

    const existing = await db.domainGovernance.findUnique({ where: { projectId } });

    if (!existing) {
        // Initialize if doesn't exist
        await initializeGovernance(projectId, domain, confidence, userId);
        return await getGovernedDomain(projectId);
    }

    if (existing.isLocked) {
        throw new Error('Domain is locked. Unlock before making changes.');
    }

    const newVersion = existing.version + 1;

    // Update governance
    const updated = await db.domainGovernance.update({
        where: { projectId },
        data: {
            activeDomain: domain,
            governanceStatus: 'MANUAL',
            version: newVersion,
            changedBy: userId,
            changeReason: reason,
            lastUpdated: new Date(),
        },
    });

    // Record history
    await db.domainHistory.create({
        data: {
            id: randomUUID(),
            projectId,
            version: newVersion,
            previousDomain: existing.activeDomain,
            newDomain: domain,
            previousStatus: existing.governanceStatus,
            newStatus: 'MANUAL',
            changedBy: userId,
            changeReason: reason,
            confidence,
            changedAt: new Date(),
        },
    });

    return updated;
}

// Lock domain to prevent automatic reclassification
export async function lockDomain(params: LockDomainParams) {
    const { projectId, userId, reason } = params;

    const existing = await db.domainGovernance.findUnique({ where: { projectId } });
    if (!existing) {
        throw new Error('No governance record found');
    }

    const newVersion = existing.version + 1;

    const updated = await db.domainGovernance.update({
        where: { projectId },
        data: {
            isLocked: true,
            governanceStatus: 'LOCKED',
            version: newVersion,
            changedBy: userId,
            changeReason: reason,
            lastUpdated: new Date(),
        },
    });

    // Record lock in history
    await db.domainHistory.create({
        data: {
            id: randomUUID(),
            projectId,
            version: newVersion,
            previousDomain: existing.activeDomain,
            newDomain: existing.activeDomain, // Domain stays same
            previousStatus: existing.governanceStatus,
            newStatus: 'LOCKED',
            changedBy: userId,
            changeReason: `LOCKED: ${reason}`,
            confidence: 100,
            changedAt: new Date(),
        },
    });

    return updated;
}

// Unlock domain to allow reclassification
export async function unlockDomain(params: LockDomainParams) {
    const { projectId, userId, reason } = params;

    const existing = await db.domainGovernance.findUnique({ where: { projectId } });
    if (!existing) {
        throw new Error('No governance record found');
    }

    const newVersion = existing.version + 1;

    const updated = await db.domainGovernance.update({
        where: { projectId },
        data: {
            isLocked: false,
            governanceStatus: 'MANUAL', // Keep manual after unlock
            version: newVersion,
            changedBy: userId,
            changeReason: reason,
            lastUpdated: new Date(),
        },
    });

    // Record unlock in history
    await db.domainHistory.create({
        data: {
            id: randomUUID(),
            projectId,
            version: newVersion,
            previousDomain: existing.activeDomain,
            newDomain: existing.activeDomain,
            previousStatus: 'LOCKED',
            newStatus: 'MANUAL',
            changedBy: userId,
            changeReason: `UNLOCKED: ${reason}`,
            confidence: 100,
            changedAt: new Date(),
        },
    });

    return updated;
}

// Re-evaluate domain detection (only if not locked)
export async function reevaluateDomain(projectId: string, userId: string) {
    const governance = await db.domainGovernance.findUnique({ where: { projectId } });

    if (governance?.isLocked) {
        throw new Error('Cannot re-evaluate locked domain');
    }

    // Run detection
    const detection = await detectDomain(projectId);

    if (!governance) {
        // Initialize if doesn't exist
        await initializeGovernance(projectId, detection.detectedDomain, detection.confidence, userId);
        return await getGovernedDomain(projectId);
    }

    const newVersion = governance.version + 1;

    // Update governance with new detection
    const updated = await db.domainGovernance.update({
        where: { projectId },
        data: {
            activeDomain: detection.detectedDomain,
            governanceStatus: detection.status === 'AUTO_ASSIGNED' ? 'AUTO' : 'MANUAL',
            version: newVersion,
            changedBy: userId,
            changeReason: `Re-evaluated: ${detection.explanation}`,
            lastUpdated: new Date(),
        },
    });

    // Record in history
    await db.domainHistory.create({
        data: {
            id: randomUUID(),
            projectId,
            version: newVersion,
            previousDomain: governance.activeDomain,
            newDomain: detection.detectedDomain,
            previousStatus: governance.governanceStatus,
            newStatus: detection.status === 'AUTO_ASSIGNED' ? 'AUTO' : 'MANUAL',
            changedBy: userId,
            changeReason: `Re-evaluated: ${detection.explanation}`,
            confidence: detection.confidence,
            changedAt: new Date(),
        },
    });

    return updated;
}

// Get domain change history
export async function getDomainHistory(projectId: string) {
    const history = await db.domainHistory.findMany({ where: { projectId } });
    return history.sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
}
