// Module 6C — Entry Point
// handleCorrelationQuery() orchestrates the full correlation pipeline.
//
// Pipeline:
//   1. Load Module 5.5 snapshot
//   2. Validate KPI pair (eligibility gate)
//   3. Align time periods (null ratio / effectiveN gates)
//   4. Detect shared trend confounders → apply first-differencing if needed
//   5. Compute correlation metrics (with optional lags + Bonferroni correction)
//   6. Build frozen CorrelationEvidencePacket
//   7. Short-circuit if not reportable
//   8. Call LLM with evidence packet
//   9. Validate numeric claims
//  10. Return structured CorrelationResult
//
// Module 6C does NOT: modify dashboard state, compute new KPIs, import sql-compiler.

import { runDashboardIntelligence } from '@/lib/dashboard-state/module-5-5';
import { validateKPIPair } from './kpi-pair-validator';
import { alignCorrelationSeries } from './period-aligner';
import { detectSharedTrend, applyFirstDifferencing } from './trend-confounder';
import { computeCorrelationMetrics } from './statistics-gate';
import { computeWithLags } from './lag-engine';
import { buildCorrelationPacket, CorrelationPacketError } from './correlation-packet';
import { callCorrelationLLM, LLMCorrelationCallError } from './llm-correlation-client';
import { validateNumericClaims } from './numeric-guard';
import type { CorrelationResult, CorrelationEvidencePacket } from './types';

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Full Module 6C pipeline.
 *
 * @param projectId  The project whose dashboard intelligence snapshot to use
 * @param kpiAId     First KPI ID to correlate
 * @param kpiBId     Second KPI ID to correlate
 * @param grain      Time granularity ('monthly' | 'quarterly') — required for lag
 * @param lags       Lag offsets to test (subset of [-2,-1,0,+1,+2]). Defaults to [0]
 * @param userQuery  Natural language question — forwarded to LLM
 */
export async function handleCorrelationQuery(
    projectId: string,
    kpiAId: string,
    kpiBId: string,
    grain: string = 'monthly',
    lags: number[] = [0],
    userQuery: string = 'What is the correlation between these two KPIs?'
): Promise<CorrelationResult> {

    // ── Step 1: Load Module 5.5 snapshot ──
    let dashboardResult: Awaited<ReturnType<typeof runDashboardIntelligence>>;
    try {
        dashboardResult = await runDashboardIntelligence(projectId, {
            skipCache: false,
            skipAnomalyDetection: false,
            skipSummaryGeneration: false,
        });
    } catch (err: any) {
        return {
            status: 'rejected',
            message: `Could not load dashboard intelligence: ${err.message ?? 'unknown error'}`,
        };
    }

    const results = dashboardResult.kpis ?? [];
    if (results.length === 0) {
        return {
            status: 'insufficient',
            message: 'No KPI results available. Ensure the dashboard has been computed.',
        };
    }

    // ── Step 2: Validate KPI pair ──
    const pairValidation = validateKPIPair(kpiAId, kpiBId, grain, results);
    if (!pairValidation.valid) {
        return {
            status: 'rejected',
            message: pairValidation.reason ?? 'KPI pair validation failed.',
        };
    }

    const { kpiA, kpiB, unitA, unitB } = pairValidation;

    // ── Step 3: Align periods ──
    const alignment = alignCorrelationSeries(kpiA!, kpiB!);
    if (!alignment.valid) {
        return {
            status: 'rejected',
            message: alignment.reason,
        };
    }

    let seriesA = alignment.valuesA;
    let seriesB = alignment.valuesB;

    // ── Step 4: Trend confounder detection ──
    const confounderResult = detectSharedTrend(seriesA, seriesB);
    let firstDifferencingApplied = false;

    if (confounderResult.sharedTrendDetected) {
        const diffed = applyFirstDifferencing(seriesA, seriesB);
        if (diffed.effectiveN < 5) {
            return {
                status: 'insufficient',
                message: 'After applying first-differencing to remove trend confounders, insufficient observations remain.',
            };
        }
        seriesA = diffed.valuesA;
        seriesB = diffed.valuesB;
        firstDifferencingApplied = true;
    }

    // ── Step 5: Compute correlation with lags + Bonferroni ──
    const lagResult = computeWithLags(seriesA, seriesB, lags);

    // Use dominant lag result for the evidence packet
    const dominantLagResult = lagResult.results.find(r => r.lag === lagResult.dominantLag);
    const finalR = lagResult.dominantR;
    const finalPValue = dominantLagResult?.pValue ?? null;
    const finalN = dominantLagResult?.effectiveN ?? alignment.effectiveN;
    const statSig = lagResult.results.some(r => r.significant);

    // ── Step 6: Build evidence packet ──
    let packet: CorrelationEvidencePacket;
    try {
        packet = buildCorrelationPacket({
            kpiAId,
            kpiBId,
            kpiAName: kpiA!.kpiName,
            kpiBName: kpiB!.kpiName,
            unitA: unitA ?? 'unknown',
            unitB: unitB ?? 'unknown',
            grain,
            timeWindowStart: alignment.timeWindowStart,
            timeWindowEnd: alignment.timeWindowEnd,
            nObservations: finalN,
            pearsonR: finalR,
            pValue: finalPValue,
            statSig,
            lagApplied: lagResult.dominantLag,
            lagsTested: lagResult.results.map(r => r.lag),
            bonferroniAlphaVal: lagResult.bonferroniAlpha,
            nullRatioA: alignment.nullRatioA,
            nullRatioB: alignment.nullRatioB,
            firstDifferencingApplied,
            trendConfounderDetected: confounderResult.sharedTrendDetected,
        });
    } catch (err: unknown) {
        const msg = err instanceof CorrelationPacketError ? err.message : 'Evidence packet construction failed';
        return { status: 'rejected', message: msg };
    }

    // ── Step 7: Short-circuit if not reportable ──
    if (!packet.correlation_reportable) {
        return {
            status: 'insufficient',
            message: 'The available data does not support a statistically valid correlation between these KPIs.',
            evidence: packet,
        };
    }

    // ── Step 8: Call LLM ──
    let llmRaw: string;
    try {
        llmRaw = await callCorrelationLLM(userQuery, packet);
    } catch (err: unknown) {
        const msg = err instanceof LLMCorrelationCallError ? err.message : 'LLM call failed';
        return { status: 'rejected', message: msg, evidence: packet };
    }

    // ── Step 9: Validate numeric claims ──
    const guardResult = validateNumericClaims(llmRaw, packet);
    if (guardResult.status === 'suppressed') {
        return {
            status: 'suppressed',
            message: guardResult.message!,
            evidence: packet,
        };
    }

    // ── Step 10: Return success ──
    return {
        status: 'success',
        explanation: guardResult.explanation,
        evidence: packet,
    };
}
