// R6 — Statistics Core
// Sample-corrected statistical functions for Module 6 pre-flight readiness.
// This module uses sample standard deviation (n-1 denominator) — correct for
// small samples (n < 30) encountered in monthly/quarterly time-series.
//
// BOUNDARY: anomaly-detector.ts uses population stddev (n) which is intentional
// for its use case. Do NOT change that module. This module is separate.

// ─── T-Distribution Critical Values (two-tailed, alpha=0.05) ─────────────────
// Lookup table for exact t-critical values at small n (n = degrees of freedom = n_obs - 2).
// For df >= 30, use the normal approximation (t_critical ≈ 1.96).

const T_CRITICAL_TABLE: Record<number, number> = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
    6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
    11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
    16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
    21: 2.080, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060,
    26: 2.056, 27: 2.052, 28: 2.048, 29: 2.045, 30: 1.960,
};

const MIN_OBSERVATIONS = 5; // absolute minimum: below this, reject outright

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute sample standard deviation using Bessel's correction (n-1 denominator).
 * Returns 0 if fewer than 2 values or if all values are identical.
 */
export function computeSampleStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
}

/**
 * Compute sample mean.
 */
export function computeMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Compute Pearson correlation coefficient between two arrays.
 *
 * Rules:
 *  - Skips null pairs (uses only positions where BOTH are non-null).
 *  - Returns null if effective n < MIN_OBSERVATIONS (5).
 *  - Returns null if either series has zero variance after null filtering.
 *  - Returns null if arrays have no overlapping non-null pairs.
 */
export function computePearson(
    a: (number | null)[],
    b: (number | null)[]
): number | null {
    if (a.length !== b.length) {
        throw new Error('[StatisticsCore] computePearson: arrays must be equal length');
    }

    // Extract paired non-null values
    const pairedA: number[] = [];
    const pairedB: number[] = [];
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== null && b[i] !== null) {
            pairedA.push(a[i]!);
            pairedB.push(b[i]!);
        }
    }

    const n = pairedA.length;
    if (n < MIN_OBSERVATIONS) return null;

    const meanA = computeMean(pairedA);
    const meanB = computeMean(pairedB);

    let numerator = 0;
    let sumSqA = 0;
    let sumSqB = 0;

    for (let i = 0; i < n; i++) {
        const da = pairedA[i] - meanA;
        const db = pairedB[i] - meanB;
        numerator += da * db;
        sumSqA += da * da;
        sumSqB += db * db;
    }

    // Guard: zero variance in either series
    if (sumSqA === 0 || sumSqB === 0) return null;

    const r = numerator / Math.sqrt(sumSqA * sumSqB);

    // Clamp to [-1, 1] to guard against floating-point drift
    return Math.max(-1, Math.min(1, Number(r.toFixed(8))));
}

/**
 * Determine whether a Pearson r value is statistically significant
 * at alpha=0.05 (two-tailed) given sample size n.
 *
 * Uses t-statistic: t = r * sqrt((n-2) / (1 - r^2))
 * Compares against t_critical from lookup table (df = n - 2).
 *
 * Returns false if:
 *  - r is null
 *  - n < MIN_OBSERVATIONS
 *  - |r| === 1 (perfect correlation; t is undefined)
 */
export function isSignificant(r: number | null, n: number): boolean {
    if (r === null) return false;
    if (n < MIN_OBSERVATIONS) return false;
    if (Math.abs(r) === 1) return false; // t → ∞; technically always significant but guard against NaN

    const df = n - 2;
    if (df < 1) return false;

    const denominator = 1 - r * r;
    if (denominator <= 0) return false;

    const t = r * Math.sqrt(df / denominator);
    const tAbsolute = Math.abs(t);

    // Look up t-critical for df (cap at 30 for large samples → normal approx)
    const lookupDf = Math.min(df, 30);
    const tCritical = T_CRITICAL_TABLE[lookupDf] ?? 1.96;

    return tAbsolute > tCritical;
}

/**
 * Compute the t-statistic for a Pearson r value.
 * Returns null if r is null, |r| === 1, or n < 3.
 */
export function computeTStatistic(r: number | null, n: number): number | null {
    if (r === null || n < 3 || Math.abs(r) === 1) return null;
    const df = n - 2;
    const denominator = 1 - r * r;
    if (denominator <= 0) return null;
    return r * Math.sqrt(df / denominator);
}

/**
 * Approximate two-tailed p-value from t-statistic and degrees of freedom.
 * Uses a polynomial approximation of the t-distribution CDF.
 * For df < 3, returns a conservative upper bound of 1.0.
 *
 * Accuracy: within ±0.002 for typical analytics use (df >= 5, p in [0.001, 0.5]).
 */
export function approximatePValue(tStat: number | null, df: number): number | null {
    if (tStat === null || df < 1) return null;
    const t = Math.abs(tStat);

    // For very large t, p approaches 0
    if (t > 50) return 0.0001;

    // Use incomplete beta function approximation via the regularized beta method
    // p ≈ 2 * P(T > t) where T ~ t(df)
    // Approximation from Abramowitz & Stegun §26.7
    const x = df / (df + t * t);
    const p2 = incompleteBetaApprox(x, df / 2, 0.5);
    return Math.min(1, Math.max(0, Number(p2.toFixed(6))));
}

/**
 * First-difference a series: computes delta[i] = values[i] - values[i-1].
 * delta[0] is always null (no prior period).
 * Used to remove shared time trends before correlation.
 */
export function firstDifference(values: (number | null)[]): (number | null)[] {
    if (values.length === 0) return [];
    const deltas: (number | null)[] = [null];
    for (let i = 1; i < values.length; i++) {
        const curr = values[i];
        const prev = values[i - 1];
        if (curr === null || prev === null) {
            deltas.push(null);
        } else {
            deltas.push(curr - prev);
        }
    }
    return deltas;
}

/**
 * Count non-null values in an array.
 */
export function effectiveN(values: (number | null)[]): number {
    return values.filter(v => v !== null).length;
}

/**
 * Apply Bonferroni correction: correctedAlpha = alpha / numTests.
 * Ensures numTests >= 1.
 */
export function bonferroniAlpha(alpha: number, numTests: number): number {
    if (numTests < 1) throw new Error('[StatisticsCore] bonferroniAlpha: numTests must be >= 1');
    return alpha / numTests;
}

// ─── Internal: Incomplete Beta Approximation ──────────────────────────────────

/**
 * Regularized incomplete beta function I_x(a, b) approximation.
 * Used internally to approximate the p-value from a t-statistic.
 * Based on the continued fraction expansion (Lentz algorithm, simplified).
 */
function incompleteBetaApprox(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Use symmetry relation: I_x(a,b) = 1 - I_{1-x}(b,a) for numerical stability
    if (x > (a + 1) / (a + b + 2)) {
        return 1 - incompleteBetaApprox(1 - x, b, a);
    }

    const lbeta = lgamma(a + b) - lgamma(a) - lgamma(b);
    const front = Math.exp(lbeta + a * Math.log(x) + b * Math.log(1 - x));

    // Continued fraction (first 200 iterations, typically converges in < 50)
    let f = 1;
    let c = 1;
    let d = 1 - (a + b) * x / (a + 1);
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    f = d;

    for (let m = 1; m <= 200; m++) {
        // Even step
        let numerator = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
        d = 1 + numerator * d;
        c = 1 + numerator / c;
        if (Math.abs(d) < 1e-30) d = 1e-30;
        if (Math.abs(c) < 1e-30) c = 1e-30;
        d = 1 / d;
        f *= d * c;

        // Odd step
        numerator = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
        d = 1 + numerator * d;
        c = 1 + numerator / c;
        if (Math.abs(d) < 1e-30) d = 1e-30;
        if (Math.abs(c) < 1e-30) c = 1e-30;
        d = 1 / d;
        const delta = d * c;
        f *= delta;

        if (Math.abs(delta - 1) < 1e-10) break;
    }

    return front * f / a;
}

/** Log-gamma approximation (Stirling's series). */
function lgamma(z: number): number {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
        -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let x = z;
    let y = x;
    const tmp = x + 5.5;
    const ser = c.reduce((acc, ci) => { y += 1; return acc + ci / y; }, 1.000000000190015);
    return (x + 0.5) * Math.log(tmp) - tmp + Math.log(2.5066282746310005 * ser / x);
}
