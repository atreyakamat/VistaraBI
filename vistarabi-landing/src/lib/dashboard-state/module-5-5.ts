// Module 5.5 — Orchestrator (Main Entry Point)
// runDashboardIntelligence() is the single function Module 5.5 exposes to the API.
// Pipeline:
//   hydrateDashboard → normalizeFilters → execute KPIs (parallel) → attach summary → attach anomaly → return

// R7: Concurrency cap — at most this many KPI DB queries run simultaneously
// Prevents connection pool exhaustion when processing large dashboards.
const KPI_CONCURRENCY_LIMIT = 5;

import { hydrateDashboard } from './state-engine';
import { normalizeFilters } from './filter-interpreter';
import { mergeFilters, toExecutionFilters, extractDateRange, extractRankConfig } from './filter-propagation';
import { generateDeterministicSummary } from './kpi-summary-engine';
import { tryDetectAnomalies } from './anomaly-detector';
import { executeKPI } from '@/lib/execution';
import db from '@/lib/prisma';
import type {
    DashboardIntelligenceOptions,
    EnrichedKPIResult,
    EnrichedDashboardResult,
    GuardrailInfo,
    NormalizedFilter,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_GROUP_BY_ROWS = 200; // Cardinality guardrail threshold

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the full dashboard intelligence pipeline for a project.
 *
 * Steps:
 *   1. Hydrate DashboardState (from DB or seed from DashboardConfig)
 *   2. Parse raw business filter expressions → NormalizedFilter[]
 *   3. For each card: merge global+card filters → executeKPI
 *   4. Attach KPISummary (deterministic)
 *   5. Attach AnomalyReport (Z-score based, optional)
 *   6. Attach GuardrailInfo (cardinality check)
 *   7. Return EnrichedDashboardResult
 */
export async function runDashboardIntelligence(
    projectId: string,
    options: DashboardIntelligenceOptions = {}
): Promise<EnrichedDashboardResult> {
    const startTime = Date.now();

    // ── Step 1: Hydrate state ──
    const state = await hydrateDashboard(projectId);
    if (!state) {
        throw new Error(`[Module5.5] No dashboard state or config found for project "${projectId}". Run Module 5A first.`);
    }

    // ── Step 2: Normalize filters ──
    let globalFilters: NormalizedFilter[] = options.normalizedFilters || state.globalFilters;

    if (options.businessFilters && options.businessFilters.length > 0) {
        const parsed = normalizeFilters(options.businessFilters, {
            fiscalYearConvention: options.fiscalYearConvention || 'april_march',
        });
        // Business filter expressions OVERRIDE stored global filters
        globalFilters = parsed;
    }

    // ── Step 3: Execute per-card (parallel with concurrency cap) ──
    const granularity = options.granularity || state.granularity || 'monthly';

    // Filter to requested card IDs if specified
    const cardsToProcess = options.cardIds
        ? state.cards.filter(c => options.cardIds!.includes(c.id))
        : state.cards;

    // R3: Prefetch unit for all KPIs in this dashboard in a single query
    const kpiIds = [...new Set(cardsToProcess.map(c => c.kpiId))];
    const approvedKPIs = await db.approvedKPI.findMany({
        where: { id: { in: kpiIds } },
        select: { id: true, unit: true },
    });
    const unitLookup = new Map(approvedKPIs.map(k => [k.id, (k as any).unit as string | null]));

    // R7: Build execution tasks, then run with concurrency cap via Promise.allSettled
    type CardTask = {
        card: typeof cardsToProcess[number];
        unit: string;
    };

    async function executeCardKPI(card: typeof cardsToProcess[number]): Promise<EnrichedKPIResult> {
        const effectiveFilters = mergeFilters(globalFilters, card.filterOverrides);
        const executionFilters = toExecutionFilters(effectiveFilters);
        const dateRange = extractDateRange(effectiveFilters);
        const rankConfig = extractRankConfig(effectiveFilters);
        const groupBy = card.groupBy || rankConfig.groupBy || undefined;

        const result = await executeKPI(projectId, card.kpiId, {
            granularity: groupBy ? undefined : granularity,
            filters: executionFilters,
            groupBy,
            dateFrom: dateRange.dateFrom,
            dateTo: dateRange.dateTo,
            dateColumn: dateRange.dateColumn,
            skipCache: options.skipCache,
            skipAIExplanation: true,
        });

        const summary = options.skipSummaryGeneration
            ? null
            : generateDeterministicSummary(result);

        let anomaly = null;
        if (!options.skipAnomalyDetection && result.dataset.length >= 5) {
            anomaly = tryDetectAnomalies(result.dataset);
        }

        const guardrail: GuardrailInfo | null = result.datasetSize > MAX_GROUP_BY_ROWS
            ? {
                triggered: true,
                reason: `High cardinality: ${result.datasetSize} rows exceed limit of ${MAX_GROUP_BY_ROWS}`,
                fallbackChartType: 'table',
                originalCount: result.datasetSize,
            }
            : null;

        // R3: resolve unit from prefetched lookup, fallback to empty string
        const unit = unitLookup.get(card.kpiId) || '';

        return { ...result, summary, anomaly, guardrail, unit };
    }

    // R7: Concurrency-capped parallel execution via batched Promise.allSettled
    const enrichedKPIs: EnrichedKPIResult[] = [];
    const errors: EnrichedDashboardResult['errors'] = [];
    let anomalyCount = 0;
    let cacheHitCount = 0;
    let skippedCount = 0;

    // Process in batches of KPI_CONCURRENCY_LIMIT
    for (let i = 0; i < cardsToProcess.length; i += KPI_CONCURRENCY_LIMIT) {
        const batch = cardsToProcess.slice(i, i + KPI_CONCURRENCY_LIMIT);
        const batchResults = await Promise.allSettled(batch.map(card => executeCardKPI(card)));

        for (let j = 0; j < batchResults.length; j++) {
            const outcome = batchResults[j];
            const card = batch[j];

            if (outcome.status === 'fulfilled') {
                const enriched = outcome.value;
                if (enriched.performance.cacheHit) cacheHitCount++;
                if (enriched.anomaly?.detected) anomalyCount++;
                enrichedKPIs.push(enriched);
            } else {
                // R2: Surface failure, never swallow silently
                const err = outcome.reason;
                const message = err instanceof Error ? err.message : String(err);
                const errorCode = err?.code || 'KPI_EXECUTION_FAILURE';
                console.error(`[Module5.5] KPI "${card.kpiId}" failed (${errorCode}):`, message);
                errors.push({ kpiId: card.kpiId, errorCode, message });
                skippedCount++;
            }
        }
    }

    const totalTimeMs = Date.now() - startTime;

    return {
        projectId,
        domain: state.domain,
        stateVersion: state.version,
        granularity,
        globalFilters,
        kpis: enrichedKPIs,
        computedAt: new Date().toISOString(),
        errors,  // R2
        metadata: {
            totalKPIs: cardsToProcess.length,
            computedKPIs: enrichedKPIs.length,
            skippedKPIs: skippedCount,
            anomalyCount,
            cacheHitCount,
            totalTimeMs,
        },
    };
}

/**
 * Dry-run: evaluate which KPIs would execute and what filters normalize to,
 * without actually hitting the database or executing SQL.
 */
export async function previewDashboardIntelligence(
    projectId: string,
    options: DashboardIntelligenceOptions = {}
): Promise<{ state: Awaited<ReturnType<typeof hydrateDashboard>>; normalizedFilters: NormalizedFilter[] }> {
    const state = await hydrateDashboard(projectId);

    let normalizedFilters: NormalizedFilter[] = options.normalizedFilters || state?.globalFilters || [];
    if (options.businessFilters && options.businessFilters.length > 0) {
        normalizedFilters = normalizeFilters(options.businessFilters, {
            fiscalYearConvention: options.fiscalYearConvention || 'april_march',
        });
    }

    return { state, normalizedFilters };
}
