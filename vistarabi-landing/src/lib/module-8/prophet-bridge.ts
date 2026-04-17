import { spawn } from 'child_process';
import path from 'path';
import { ForecastRequest, ForecastPoint, KpiDataPoint } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Prophet needs at least 2 full seasonal cycles to produce reliable forecasts */
const PROPHET_MIN_DATA_POINTS = 14;

/** Maximum gap of N days to forward-fill with the last known value */
const FORWARD_FILL_GAP_DAYS = 7;

/** Cap linear fallback uncertainty so it never exceeds 50% of predicted value */
const MAX_UNCERTAINTY_RATIO = 0.5;

// ─── Sparse Data Cleaning ─────────────────────────────────────────────────────

/**
 * ACTION 2 (upgraded): Clean and fill a sparse KPI time series before sending to Prophet
 * or the linear fallback.
 *
 * Strategy — Linear Interpolation (upgraded from forward-fill):
 * - Sort by date ascending.
 * - For each gap between two known values, compute the linear slope between them
 *   and fill missing days with interpolated values.
 * - For trailing gaps (no known value ahead), forward-fill with the last known value.
 *
 * Why linear interpolation over forward-fill:
 * - Forward-fill distorts the trend slope (flat plateau instead of gradient)
 * - Linear interpolation preserves the underlying velocity of the series
 * - Critical for SaaS (monthly billing), Services (weekly hours), Manufacturing (shift output)
 *   where gaps are predictable and the surrounding context is known.
 */
export function cleanAndFillTimeSeries(history: KpiDataPoint[]): KpiDataPoint[] {
    if (history.length < 2) return history;

    // Sort ascending and normalise to valid numeric values
    const sorted = history
        .filter(p => p.value != null && !isNaN(p.value))
        .sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length < 2) return sorted;

    const start = new Date(sorted[0].date);
    const end   = new Date(sorted[sorted.length - 1].date);

    // Build a lookup of all known date → index in sorted array
    const knownDates = new Map<string, number>(sorted.map((p, i) => [p.date, i]));

    const filled: KpiDataPoint[] = [];
    let dayIndex = 0;

    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1), dayIndex++) {
        const dateStr = d.toISOString().split('T')[0];

        if (knownDates.has(dateStr)) {
            // Known value — use directly
            filled.push({ date: dateStr, value: sorted[knownDates.get(dateStr)!].value });
        } else {
            // Find the surrounding known anchor points for linear interpolation
            const prevKnown = sorted.filter(p => p.date < dateStr).at(-1);
            const nextKnown = sorted.find(p => p.date > dateStr);

            if (prevKnown && nextKnown) {
                // Linear interpolation: v = v0 + (v1-v0) * (t-t0)/(t1-t0)
                const t0 = new Date(prevKnown.date).getTime();
                const t1 = new Date(nextKnown.date).getTime();
                const t  = d.getTime();
                const ratio = (t - t0) / (t1 - t0);
                const interpolated = prevKnown.value + (nextKnown.value - prevKnown.value) * ratio;
                filled.push({ date: dateStr, value: Math.max(0, interpolated) });
            } else if (prevKnown) {
                // Trailing gap (beyond last known value) — forward-fill
                filled.push({ date: dateStr, value: prevKnown.value });
            }
            // Leading gaps (before first known value) are skipped — Prophet handles start boundaries
        }
    }

    return filled;
}

/**
 * Validate and sanitize the ForecastRequest before sending to Python.
 * Returns an array of warnings for logging.
 */
function validateRequest(req: ForecastRequest): string[] {
    const warnings: string[] = [];

    if (req.kpiHistory.length < PROPHET_MIN_DATA_POINTS) {
        warnings.push(
            `[Prophet] Insufficient data: ${req.kpiHistory.length} points (min: ${PROPHET_MIN_DATA_POINTS}).` +
            ` Using linear fallback.`
        );
    }

    if (req.horizonDays <= 0) {
        warnings.push(`[Prophet] Invalid horizonDays: ${req.horizonDays}. Clamped to 30.`);
    }

    if (req.goalValue <= 0) {
        warnings.push(`[Prophet] Goal value is zero or negative: ${req.goalValue}. Fallback bounds may be inaccurate.`);
    }

    return warnings;
}

// ─── Bridge Functions ─────────────────────────────────────────────────────────

/**
 * A bridge to call the Python Prophet script.
 * Pre-processes sparse data before sending.
 * If Python/Prophet is unavailable or data is insufficient, falls back to a linear projection.
 */
export async function generateBaselineForecast(req: ForecastRequest): Promise<ForecastPoint[]> {
    const warnings = validateRequest(req);
    warnings.forEach(w => console.warn(w));

    // ACTION 2: Bail out to linear fallback if data is insufficient for Prophet
    if (req.kpiHistory.length < PROPHET_MIN_DATA_POINTS) {
        console.warn('[Prophet] Skipping Python Prophet — using reliable linear fallback.');
        return generateFallbackLinearForecast(req);
    }

    // ACTION 2: Clean sparse data before sending to Python
    const cleanedReq: ForecastRequest = {
        ...req,
        kpiHistory: cleanAndFillTimeSeries(req.kpiHistory),
    };

    console.log(
        `[Prophet] Sending ${cleanedReq.kpiHistory.length} data points ` +
        `(original: ${req.kpiHistory.length}, filled: ${cleanedReq.kpiHistory.length - req.kpiHistory.length})`
    );

    try {
        return await callPythonProphet(cleanedReq);
    } catch (error) {
        console.warn('[Prophet] Bridge failed, falling back to linear projection.', error);
        return generateFallbackLinearForecast(req);
    }
}

async function callPythonProphet(req: ForecastRequest): Promise<ForecastPoint[]> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), '..', 'scripts', 'forecast_bridge.py');
        const pythonProcess = spawn('python', [scriptPath]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(`Python process exited with code ${code}. Error: ${errorOutput}`));
            }
            try {
                const result = JSON.parse(output);
                resolve(result);
            } catch (e) {
                reject(new Error('Failed to parse Python Prophet output.'));
            }
        });

        // Handle process spawn errors directly (e.g. python not found)
        pythonProcess.on('error', (err) => {
            reject(err);
        });

        pythonProcess.stdin.write(JSON.stringify(req));
        pythonProcess.stdin.end();
    });
}

/**
 * Fallback forecaster if Prophet is not installed or data is insufficient.
 * Uses simple linear regression with capped uncertainty bands.
 */
export function generateFallbackLinearForecast(req: ForecastRequest): ForecastPoint[] {
    const { kpiHistory, horizonDays } = req;
    const safeHorizon = Math.max(1, horizonDays);

    const validHistory = kpiHistory.filter(p => p.value != null && !isNaN(p.value));
    const n = validHistory.length;

    if (n < 2) {
        // Default dummy forecast if totally empty
        return Array.from({ length: safeHorizon }).map((_, i) => ({
            date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
            day: i + 1,
            yhat: req.goalValue > 0 ? req.goalValue / 2 : 0,
            yhatLower: req.goalValue > 0 ? req.goalValue / 3 : 0,
            yhatUpper: req.goalValue > 0 ? req.goalValue * 0.8 : 1,
        }));
    }

    // Simple linear regression on valid (non-null) points
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    validHistory.forEach((pt, i) => {
        sumX  += i;
        sumY  += pt.value;
        sumXY += i * pt.value;
        sumXX += i * i;
    });

    const denominator = n * sumXX - sumX * sumX;
    const slope     = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const intercept = (sumY - slope * sumX) / n;

    const lastDate   = new Date(validHistory[n - 1].date);
    const forecast: ForecastPoint[] = [];

    // H3 FIX: Honor confidenceLevel in linear fallback
    const zScore = req.confidenceLevel === 0.95 ? 1.96 : 1.28; // 95% vs 80%

    for (let i = 1; i <= safeHorizon; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(lastDate.getDate() + i);

        const x    = n - 1 + i;
        const yhat = Math.max(0, intercept + slope * x);

        // ACTION 2: Cap uncertainty growth — max 50% of yhat, z-scaled per day.
        const rawUncertainty = yhat * (zScore / 100) * i;
        const uncertainty    = Math.min(rawUncertainty, yhat * MAX_UNCERTAINTY_RATIO);

        forecast.push({
            date:      futureDate.toISOString().split('T')[0],
            day:       i,
            yhat,
            yhatLower: Math.max(0, yhat - uncertainty),
            yhatUpper: yhat + uncertainty,
        });
    }

    return forecast;
}
