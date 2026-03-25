// R5 — Time Alignment Utility
// Aligns two KPI time-series datasets into a shared period space.
// Nulls are inserted for missing periods — never zero-filled automatically.
// This is a prerequisite for any cross-KPI statistical computation in Module 6.

import type { KPIExecutionResult } from './types';

// ─── Output Contract ──────────────────────────────────────────────────────────

export interface AlignedPeriodResult {
    /** Sorted union of all period label strings from both KPIs (ISO date strings) */
    periods: string[];
    /** Values from KPI-A aligned to `periods`. null where KPI-A has no data. */
    valuesA: (number | null)[];
    /** Values from KPI-B aligned to `periods`. null where KPI-B has no data. */
    valuesB: (number | null)[];
    /** Count of periods present in B that were missing in A */
    missingPeriodsA: number;
    /** Count of periods present in A that were missing in B */
    missingPeriodsB: number;
    /** Fraction of total periods where at least one series has a null (0.0–1.0) */
    dataLossRatio: number;
    /** Number of periods where BOTH series have non-null values (effective sample size) */
    effectiveN: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Align two KPI time-series into a shared period space.
 *
 * Rules:
 *   - Takes the union of all `date` fields from both dataset arrays.
 *   - Sorts chronologically (ISO string sort is valid for YYYY-MM-DD).
 *   - Inserts null (never 0) for any period missing in either series.
 *   - Returns equal-length arrays.
 *
 * Both KPIs must have been executed with a granularity (time-series mode).
 * If either dataset is empty, returns empty aligned arrays with full data loss.
 */
export function alignPeriods(
    kpiA: KPIExecutionResult,
    kpiB: KPIExecutionResult
): AlignedPeriodResult {
    // Build lookup maps from period label → value for each KPI
    const mapA = buildPeriodMap(kpiA);
    const mapB = buildPeriodMap(kpiB);

    // Union of all period labels, sorted chronologically
    const allPeriods = Array.from(
        new Set([...mapA.keys(), ...mapB.keys()])
    ).sort(); // ISO strings sort correctly lexicographically

    if (allPeriods.length === 0) {
        return {
            periods: [],
            valuesA: [],
            valuesB: [],
            missingPeriodsA: 0,
            missingPeriodsB: 0,
            dataLossRatio: 1,
            effectiveN: 0,
        };
    }

    const valuesA: (number | null)[] = [];
    const valuesB: (number | null)[] = [];
    let missingA = 0;
    let missingB = 0;
    let bothPresent = 0;

    for (const period of allPeriods) {
        const a = mapA.has(period) ? mapA.get(period)! : null;
        const b = mapB.has(period) ? mapB.get(period)! : null;

        if (a === null) missingA++;
        if (b === null) missingB++;
        if (a !== null && b !== null) bothPresent++;

        valuesA.push(a);
        valuesB.push(b);
    }

    const periodsWithAnyNull = allPeriods.length - bothPresent;
    const dataLossRatio = Number((periodsWithAnyNull / allPeriods.length).toFixed(4));

    return {
        periods: allPeriods,
        valuesA,
        valuesB,
        missingPeriodsA: missingA,
        missingPeriodsB: missingB,
        dataLossRatio,
        effectiveN: bothPresent,
    };
}

/**
 * Align two raw time-series arrays directly (without needing full KPIExecutionResult).
 * Used in tests and the statistics core.
 */
export function alignRawSeries(
    seriesA: { date: string; value: number }[],
    seriesB: { date: string; value: number }[]
): AlignedPeriodResult {
    const mapA = new Map<string, number>(seriesA.map(d => [normalizePeriodLabel(d.date), d.value]));
    const mapB = new Map<string, number>(seriesB.map(d => [normalizePeriodLabel(d.date), d.value]));

    const allPeriods = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();

    if (allPeriods.length === 0) {
        return { periods: [], valuesA: [], valuesB: [], missingPeriodsA: 0, missingPeriodsB: 0, dataLossRatio: 1, effectiveN: 0 };
    }

    const valuesA: (number | null)[] = [];
    const valuesB: (number | null)[] = [];
    let missingA = 0;
    let missingB = 0;
    let bothPresent = 0;

    for (const period of allPeriods) {
        const a = mapA.has(period) ? mapA.get(period)! : null;
        const b = mapB.has(period) ? mapB.get(period)! : null;
        if (a === null) missingA++;
        if (b === null) missingB++;
        if (a !== null && b !== null) bothPresent++;
        valuesA.push(a);
        valuesB.push(b);
    }

    const periodsWithAnyNull = allPeriods.length - bothPresent;
    return {
        periods: allPeriods,
        valuesA,
        valuesB,
        missingPeriodsA: missingA,
        missingPeriodsB: missingB,
        dataLossRatio: Number((periodsWithAnyNull / allPeriods.length).toFixed(4)),
        effectiveN: bothPresent,
    };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Build a Map<periodLabel, value> from a KPIExecutionResult's dataset.
 * Uses `date` field if present (time-series rows); otherwise uses `label`.
 * Normalizes period labels so they are always comparable YYYY-MM-DD strings.
 */
function buildPeriodMap(kpi: KPIExecutionResult): Map<string, number> {
    const map = new Map<string, number>();
    for (const point of kpi.dataset) {
        const maybeDate = (point as { date?: unknown }).date;
        const raw = typeof maybeDate === 'string' ? maybeDate : point.label;
        if (!raw) continue;
        const normalized = normalizePeriodLabel(String(raw));
        map.set(normalized, point.value);
    }
    return map;
}

/**
 * Normalize a period label to a sortable YYYY-MM-DD string.
 * Accepts: full ISO strings, YYYY-MM-DD, YYYY-MM (padded to YYYY-MM-01),
 * and PostgreSQL DATE strings already in YYYY-MM-DD format.
 *
 * IMPORTANT: Does NOT use new Date() for parsing — avoids timezone conversion bugs.
 * Only slices the string to extract the date portion.
 */
export function normalizePeriodLabel(raw: string): string {
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    // ISO timestamp with T separator: "2024-01-31T00:00:00.000Z" → "2024-01-31"
    // Crucially: we take the DATE portion directly from the string without UTC conversion.
    // The SQL layer (R1) is responsible for ensuring this is already a UTC date.
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.substring(0, 10);

    // YYYY-MM → YYYY-MM-01 (monthly granularity without day)
    if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;

    // Fallback: return as-is (quarterly labels like "2024-Q1" are already sortable)
    return raw;
}
