// Module 5.5 — KPI Summary Engine
// Generates deterministic, AI-free trend summaries for every KPI execution result.
// Same inputs → same output always. No language model involved.

import type { KPIExecutionResult } from '@/lib/execution/types';
import type { KPISummary, TrendLabel, ThresholdBand } from './types';

// ─── Thresholds ───────────────────────────────────────────────────────────────
// These are the boundary values separating trend tiers.

const THRESHOLD_SIGNIFICANT = 20;  // |deltaPercent| ≥ 20% = significant
const THRESHOLD_NOTABLE = 5;        // |deltaPercent| ≥ 5%  = notable
const HIGH_VOLATILITY_CUTOFF = 0.3; // volatilityIndex > 0.3 = high variability

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a deterministic KPISummary from a KPIExecutionResult.
 * Returns null only if input data is entirely missing (no primaryValue).
 */
export function generateDeterministicSummary(result: KPIExecutionResult): KPISummary {
    const {
        kpiName,
        primaryValue,
        previousValue,
        deltaPercent,
        deltaDirection,
        profiling,
    } = result;

    const now = new Date().toISOString();
    const formattedCurrent = formatValue(primaryValue);
    const volatileNote = profiling.volatilityIndex > HIGH_VOLATILITY_CUTOFF
        ? ' (high variability in dataset)' : '';

    // ── No comparison available ──
    if (previousValue === null || deltaPercent === null) {
        return {
            headline: `${kpiName}: ${formattedCurrent}`,
            detail: `Current value: ${formattedCurrent}. No prior period available for comparison.`,
            trendLabel: 'no_comparison',
            thresholdBand: 'none',
            generatedAt: now,
        };
    }

    const formattedPrev = formatValue(previousValue);
    const absDelta = Math.abs(deltaPercent);
    const direction = deltaDirection ?? 'flat';

    const trendLabel: TrendLabel = classifyTrend(direction, absDelta);
    const thresholdBand: ThresholdBand = classifyBand(absDelta);

    const headline = buildHeadline(kpiName, trendLabel, absDelta, deltaPercent);
    const detail = buildDetail(formattedCurrent, formattedPrev, trendLabel, volatileNote);

    return { headline, detail, trendLabel, thresholdBand, generatedAt: now };
}

// ─── Classification ───────────────────────────────────────────────────────────

function classifyTrend(
    direction: 'up' | 'down' | 'flat' | null,
    absDelta: number
): TrendLabel {
    if (!direction || direction === 'flat' || absDelta < THRESHOLD_NOTABLE) return 'stable';
    if (direction === 'up') {
        return absDelta >= THRESHOLD_SIGNIFICANT ? 'significant_increase' : 'notable_increase';
    }
    return absDelta >= THRESHOLD_SIGNIFICANT ? 'significant_decrease' : 'notable_decrease';
}

function classifyBand(absDelta: number): ThresholdBand {
    if (absDelta >= THRESHOLD_SIGNIFICANT) return 'high';
    if (absDelta >= THRESHOLD_NOTABLE) return 'medium';
    return 'low';
}

// ─── Headline & Detail Construction ──────────────────────────────────────────

function buildHeadline(
    kpiName: string,
    trend: TrendLabel,
    absDelta: number,
    rawDelta: number,
): string {
    const pct = absDelta.toFixed(1);
    switch (trend) {
        case 'significant_increase': return `${kpiName} surged ${pct}% vs. last period`;
        case 'notable_increase': return `${kpiName} grew ${pct}% vs. last period`;
        case 'stable': return `${kpiName} is relatively stable (${rawDelta >= 0 ? '+' : ''}${rawDelta?.toFixed(1)}%)`;
        case 'notable_decrease': return `${kpiName} declined ${pct}% vs. last period`;
        case 'significant_decrease': return `${kpiName} dropped sharply by ${pct}% vs. last period`;
        case 'no_comparison': return `${kpiName}: no comparison data`;
        default: return kpiName;
    }
}

function buildDetail(
    current: string,
    previous: string,
    trend: TrendLabel,
    volatileNote: string
): string {
    if (trend === 'no_comparison') {
        return `Current: ${current}. No historical data for comparison${volatileNote}.`;
    }
    return `Current: ${current} | Previous: ${previous}${volatileNote}.`;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatValue(val: number): string {
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    return val.toFixed(2);
}
