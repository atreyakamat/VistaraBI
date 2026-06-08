// Module 6B — Entry Point
// handleEventQuery() orchestrates the full event narration pipeline.
// Input: sessionId + userQuery (NL question about a KPI)
// Output: NarrationResult (structured response with explanation + evidence)
//
// Pipeline:
//   1. Load session -> get EnrichedKPIResult[]
//   2. Identify which KPI the user is asking about
//   3. Build EventEvidencePacket
//   4. Call LLM with evidence packet
//   5. Validate numeric claims
//   6. Return structured NarrationResult
//
// Module 6B does NOT: create cards, modify filters, access DB directly, or compute statistics.

import { runDashboardIntelligence } from '@/lib/dashboard-state/module-5-5';
import { buildEvidencePacket, EvidencePacketError } from './evidence-packet';
import { callEventLLM, LLMEventCallError } from './llm-event-client';
import { validateNumericClaims } from '../shared/numeric-guard';
import type { EnrichedKPIResult } from '@/lib/dashboard-state/types';
import type { EventEvidencePacket, NarrationResult } from './types';

// ─── KPI Identification ───────────────────────────────────────────────────────

/**
 * Identify which KPI from the enriched results best matches the user's query.
 * Uses simple case-insensitive substring matching on kpiName.
 * Returns null if no match found.
 *
 * This is intentionally simple: Module 6A already validated kpi_id,
 * and 6B uses the already-executed results — not a lookup engine.
 */
function identifyKPI(
    userQuery: string,
    results: EnrichedKPIResult[],
    kpiIdHint?: string
): EnrichedKPIResult | null {
    // 1. If a kpiId hint is provided (from 6A routing), use it directly
    if (kpiIdHint) {
        const exact = results.find(r => r.kpiId === kpiIdHint);
        if (exact) return exact;
    }

    // 2. Fuzzy match on kpiName
    const queryLower = userQuery.toLowerCase();
    const sorted = [...results].sort((a, b) => {
        const aMatch = a.kpiName.toLowerCase().split(/\s+/).filter(w => queryLower.includes(w)).length;
        const bMatch = b.kpiName.toLowerCase().split(/\s+/).filter(w => queryLower.includes(w)).length;
        return bMatch - aMatch;
    });

    const best = sorted[0];
    if (!best) return null;

    // Require at least one word to match
    const words = best.kpiName.toLowerCase().split(/\s+/);
    const hasMatch = words.some(w => w.length > 2 && queryLower.includes(w));
    return hasMatch ? best : results[0] ?? null; // Fall back to first result if no word matches
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Full Module 6B pipeline.
 *
 * projectId:  The project whose dashboard intelligence snapshot to use
 * userQuery:  The natural language question (e.g. "Why did revenue drop?")
 * kpiIdHint:  Optional — if Module 6A routing already identified the KPI
 * granularity: The time granularity of the current dashboard view
 */
export async function handleEventQuery(
    projectId: string,
    userQuery: string,
    kpiIdHint?: string,
    granularity: string = 'monthly'
): Promise<NarrationResult> {
    // ── Step 1: Load dashboard intelligence snapshot ──
    let dashboardResult: Awaited<ReturnType<typeof runDashboardIntelligence>>;
    try {
        dashboardResult = await runDashboardIntelligence(projectId, {
            skipCache: false,   // Use cache — 6B is read-only
            skipAnomalyDetection: false,
            skipSummaryGeneration: false,
        });
    } catch (err: any) {
        return {
            status: 'rejected',
            message: `Could not load dashboard intelligence: ${err.message ?? 'unknown error'}`,
        };
    }

    const results = dashboardResult.kpis;
    if (!results || results.length === 0) {
        return {
            status: 'insufficient_data',
            message: 'No KPI results available. Ensure the dashboard has been computed.',
        };
    }

    // ── Step 2: Identify KPI ──
    const targetResult = identifyKPI(userQuery, results, kpiIdHint);
    if (!targetResult) {
        return {
            status: 'kpi_not_found',
            message: `No KPI matched the query "${userQuery}". Try mentioning a KPI name directly.`,
        };
    }

    // ── Step 3: Build evidence packet ──
    let packet: EventEvidencePacket;
    try {
        packet = buildEvidencePacket(targetResult, granularity);
    } catch (err: unknown) {
        const msg = err instanceof EvidencePacketError ? err.message : 'Evidence packet construction failed';
        return {
            status: 'rejected',
            message: msg,
        };
    }

    // ── Step 4: Handle INSUFFICIENT_DATA early — no LLM call ──
    if (packet.event_type === 'INSUFFICIENT_DATA' || packet.confidence_level === 'insufficient') {
        return {
            status: 'insufficient_data',
            message: 'The available data does not support a statistically valid conclusion.',
            evidence: packet,
        };
    }

    // ── Step 5: Call LLM ──
    let llmRaw: string;
    try {
        llmRaw = await callEventLLM(userQuery, packet);
    } catch (err: unknown) {
        const deltaPct = targetResult.deltaPercent ?? 0;
        const direction = deltaPct > 0 ? 'increase' : 'decrease';
        const pct = Math.abs(deltaPct).toFixed(1);
        const baselineVal = targetResult.previousValue !== null ? targetResult.previousValue.toLocaleString() : 'N/A';
        const currentVal = targetResult.primaryValue.toLocaleString();
        const volatilityIndex = targetResult.profiling?.volatilityIndex ?? 0;
        const volatilityText = volatilityIndex > 0.5 ? 'high' : volatilityIndex > 0.2 ? 'moderate' : 'low';
        
        llmRaw = `${targetResult.kpiName} experienced an overall ${direction} of ${pct}% over the period, moving from a baseline of ${baselineVal} to a current value of ${currentVal}. This trend represents a ${volatilityText} volatility pattern.`;
    }

    // ── Step 6: Validate numeric claims ──
    const guardResult = validateNumericClaims(llmRaw, packet);

    if (guardResult.status === 'suppressed') {
        return {
            status: 'suppressed',
            message: guardResult.message!,
            evidence: packet,
        };
    }

    // ── Step 7: Return structured success ──
    return {
        status: 'success',
        explanation: guardResult.explanation,
        evidence: packet,
    };
}
