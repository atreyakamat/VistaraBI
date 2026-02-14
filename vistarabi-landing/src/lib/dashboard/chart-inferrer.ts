// Module 5A — Chart Type Inferrer
// Determines the best chart type and card size for each KPI based on formula analysis

import type { ChartType, CardSize } from './types';

interface ChartInference {
    chartType: ChartType;
    cardSize: CardSize;
}

/**
 * Infer the best chart type and card size for a KPI based on its formula and category.
 * 
 * Rules (applied in order of specificity):
 * 1. Ratio formulas (A / B)        → metric_card (sm) — clean single-value display
 * 2. COUNT(DISTINCT ...)            → bar (md) — categorical volume
 * 3. COUNT(...)                     → bar (md) — volume metrics
 * 4. AVG(...)                       → line (md) — trend-suitable
 * 5. SUM(...) - SUM(...)            → metric_card (sm) — net values (profit, cash flow)
 * 6. SUM(...) single aggregation    → metric_card (sm) — totals
 * 7. Time-related categories        → line (lg) — time-series
 * 8. Distribution categories        → pie (md) — proportional
 * 9. Default fallback               → metric_card (sm)
 */
export function inferChartType(formula: string, category: string): ChartInference {
    const f = formula.toUpperCase().trim();
    const cat = (category || '').toLowerCase();

    // Rule 1: Ratio formulas — division indicates a rate/ratio
    if (f.includes('/')) {
        // Ratios with COUNT are often percentage metrics
        if (f.includes('COUNT')) {
            return { chartType: 'metric_card', cardSize: 'sm' };
        }
        // SUM/AVG ratios are unit economics
        return { chartType: 'metric_card', cardSize: 'sm' };
    }

    // Rule 2: COUNT(DISTINCT ...) — categorical volume, best as bar
    if (f.includes('COUNT(DISTINCT')) {
        return { chartType: 'bar', cardSize: 'md' };
    }

    // Rule 3: COUNT(...) — volume metrics
    if (f.includes('COUNT(')) {
        return { chartType: 'bar', cardSize: 'md' };
    }

    // Rule 4: AVG(...) — trends
    if (f.includes('AVG(')) {
        // If it involves date/time columns, it's likely a time-series
        if (containsTimeSignal(f)) {
            return { chartType: 'line', cardSize: 'lg' };
        }
        return { chartType: 'line', cardSize: 'md' };
    }

    // Rule 5: SUM(a) - SUM(b) — net calculations
    if (f.includes('SUM(') && f.includes('-')) {
        return { chartType: 'metric_card', cardSize: 'sm' };
    }

    // Rule 6: Simple SUM — total value
    if (f.includes('SUM(')) {
        return { chartType: 'metric_card', cardSize: 'sm' };
    }

    // Rule 7: Category-based overrides
    if (['growth', 'retention'].includes(cat)) {
        return { chartType: 'line', cardSize: 'lg' };
    }

    if (['engagement'].includes(cat)) {
        return { chartType: 'bar', cardSize: 'md' };
    }

    if (['risk'].includes(cat)) {
        return { chartType: 'metric_card', cardSize: 'sm' };
    }

    // Rule 8: Default — metric card
    return { chartType: 'metric_card', cardSize: 'sm' };
}

/**
 * Detect time-related signals in a formula.
 */
function containsTimeSignal(formula: string): boolean {
    const timeKeywords = [
        'DATE', 'TIME', 'DAY', 'MONTH', 'YEAR', 'QUARTER',
        'WEEK', 'HOUR', 'CREATED_AT', 'ORDER_DATE', 'TIMESTAMP',
    ];
    return timeKeywords.some(kw => formula.includes(kw));
}
