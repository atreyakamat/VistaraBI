// Module 5B — AI Explanation Cache
// Fetch → generate → store pipeline for KPI explanations
// Uses DashboardConfig.metadata.kpiExplanations as persistent store
// and in-memory cache for fast access

import db from '../prisma';
import type { KPIExplanation } from '../dashboard/types';
import { KPIExplanationSchema } from '../dashboard/schemas';
import { generateKPIExplanations } from '../dashboard/kpi-explainer';
import { getCachedExplanation, setCachedExplanation, buildCacheKey } from './cache';
import { toPrismaJsonField } from '../prisma/json-input';
import { z } from 'zod';

const ExplanationMetadataSchema = z.object({
    kpiExplanations: z.record(z.string(), KPIExplanationSchema).optional(),
}).passthrough();

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Get explanation for a KPI. Checks 3 layers:
 * 1. In-memory cache
 * 2. DashboardConfig.metadata.kpiExplanations (Prisma)
 * 3. Generate via Ollama (or deterministic fallback)
 */
export async function getKPIExplanation(
    projectId: string,
    kpiId: string,
    kpiContext: {
        kpiName: string;
        formula: string;
        category: string;
        columns: string[];
        currentValue?: number;
        previousValue?: number;
        trendPercent?: number;
    }
): Promise<KPIExplanation | null> {
    const cacheKey = buildCacheKey(projectId, kpiId, { type: 'explanation' });

    // Layer 1: In-memory cache
    const cached = getCachedExplanation<KPIExplanation>(cacheKey);
    if (cached) return cached;

    // Layer 2: Persistent store (DashboardConfig)
    const stored = await getStoredExplanation(projectId, kpiId);
    if (stored) {
        setCachedExplanation(cacheKey, stored);
        return stored;
    }

    // Layer 3: Generate new explanation
    try {
        const explanations = await generateKPIExplanations([{
            kpiId,
            kpiName: kpiContext.kpiName,
            formula: kpiContext.formula,
            category: kpiContext.category,
            columns: kpiContext.columns,
            currentValue: kpiContext.currentValue,
            previousValue: kpiContext.previousValue,
            trendPercent: kpiContext.trendPercent,
        }]);

        const explanation = explanations[kpiId];
        if (explanation) {
            // Store persistently
            await storeExplanation(projectId, kpiId, explanation);
            // Cache in memory
            setCachedExplanation(cacheKey, explanation);
            return explanation;
        }
    } catch (error) {
        console.warn(`[ExplanationCache] Failed to generate explanation for ${kpiId}:`, error);
    }

    return null;
}

/**
 * Batch-generate explanations for multiple KPIs.
 * Used during dashboard initialization.
 */
export async function batchGenerateExplanations(
    projectId: string,
    kpis: Array<{
        kpiId: string;
        kpiName: string;
        formula: string;
        category: string;
        columns: string[];
    }>
): Promise<Record<string, KPIExplanation>> {
    const results: Record<string, KPIExplanation> = {};
    const toGenerate: typeof kpis = [];

    // Check existing cache/store first
    for (const kpi of kpis) {
        const cacheKey = buildCacheKey(projectId, kpi.kpiId, { type: 'explanation' });
        const cached = getCachedExplanation<KPIExplanation>(cacheKey);
        if (cached) {
            results[kpi.kpiId] = cached;
            continue;
        }

        const stored = await getStoredExplanation(projectId, kpi.kpiId);
        if (stored) {
            results[kpi.kpiId] = stored;
            setCachedExplanation(cacheKey, stored);
            continue;
        }

        toGenerate.push(kpi);
    }

    // Generate missing explanations
    if (toGenerate.length > 0) {
        try {
            const generated = await generateKPIExplanations(toGenerate);
            for (const [kpiId, explanation] of Object.entries(generated)) {
                results[kpiId] = explanation;
                const cacheKey = buildCacheKey(projectId, kpiId, { type: 'explanation' });
                setCachedExplanation(cacheKey, explanation);
                await storeExplanation(projectId, kpiId, explanation);
            }
        } catch (error) {
            console.warn('[ExplanationCache] Batch generation failed:', error);
        }
    }

    return results;
}

// ─── Persistent Storage ───────────────────────────────────────────

async function getStoredExplanation(
    projectId: string,
    kpiId: string
): Promise<KPIExplanation | null> {
    try {
        const config = await db.dashboardConfig.findUnique({
            where: { projectId },
            select: { metadata: true },
        });

        if (!config?.metadata) return null;

        const parsedMetadata = ExplanationMetadataSchema.safeParse(config.metadata);
        if (!parsedMetadata.success) return null;
        return parsedMetadata.data.kpiExplanations?.[kpiId] ?? null;
    } catch {
        return null;
    }
}

async function storeExplanation(
    projectId: string,
    kpiId: string,
    explanation: KPIExplanation
): Promise<void> {
    try {
        const config = await db.dashboardConfig.findUnique({
            where: { projectId },
            select: { metadata: true },
        });

        if (!config) return;

        const metadata = asRecord(config.metadata);
        const parsedMetadata = ExplanationMetadataSchema.safeParse(metadata);
        const explanations = {
            ...(parsedMetadata.success ? parsedMetadata.data.kpiExplanations ?? {} : {}),
            [kpiId]: explanation,
        };
        const nextMetadata = {
            ...metadata,
            kpiExplanations: explanations,
        };

        await db.dashboardConfig.update({
            where: { projectId },
            data: {
                metadata: toPrismaJsonField(nextMetadata),
            },
        });
    } catch (error) {
        console.warn(`[ExplanationCache] Failed to store explanation for ${kpiId}:`, error);
    }
}
