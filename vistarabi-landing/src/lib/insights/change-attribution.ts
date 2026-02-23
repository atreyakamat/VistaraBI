// Module 5C — Change Attribution Engine
// For multi-dimensional KPIs: compute segment contribution %, identify top movers

import type { ChangeAttribution, SegmentContribution } from './types';

// ─── Change Attribution ───────────────────────────────────────────

/**
 * Compute change attribution for a multi-dimensional KPI.
 * Identifies which segments drove the change and generates an attribution sentence.
 *
 * @param currentData  - Current period data grouped by segment
 * @param previousData - Previous period data grouped by segment (optional)
 * @param kpiName      - KPI name for sentence generation
 */
export function computeChangeAttribution(
    currentData: Array<{ label: string; value: number }>,
    previousData?: Array<{ label: string; value: number }>,
    kpiName?: string,
): ChangeAttribution | null {
    if (!previousData || previousData.length === 0 || currentData.length <= 1) {
        return null; // single-dimension or no comparison — skip
    }

    const prevMap = new Map(previousData.map(d => [d.label, d.value]));

    // Compute total delta
    const currentTotal = currentData.reduce((s, d) => s + d.value, 0);
    const previousTotal = previousData.reduce((s, d) => s + d.value, 0);
    const totalDelta = currentTotal - previousTotal;

    if (totalDelta === 0) {
        return {
            segments: [],
            topPositive: null,
            topNegative: null,
            sentence: 'No change detected across segments.',
            totalDelta: 0,
        };
    }

    // Compute per-segment contributions
    const segments: SegmentContribution[] = currentData.map(d => {
        const prevValue = prevMap.get(d.label) ?? 0;
        const delta = d.value - prevValue;
        const deltaPercent = prevValue === 0
            ? (d.value > 0 ? 100 : 0)
            : Math.round(((d.value - prevValue) / Math.abs(prevValue)) * 10000) / 100;
        const contributionPercent = totalDelta === 0
            ? 0
            : Math.round((delta / Math.abs(totalDelta)) * 10000) / 100;

        return {
            segment: d.label,
            currentValue: d.value,
            previousValue: prevValue,
            delta,
            deltaPercent,
            contributionPercent,
        };
    });

    // Add segments that existed only in previous period (disappeared)
    for (const d of previousData) {
        if (!currentData.find(c => c.label === d.label)) {
            const delta = -d.value;
            const contributionPercent = totalDelta === 0
                ? 0
                : Math.round((delta / Math.abs(totalDelta)) * 10000) / 100;
            segments.push({
                segment: d.label,
                currentValue: 0,
                previousValue: d.value,
                delta,
                deltaPercent: -100,
                contributionPercent,
            });
        }
    }

    // Sort by absolute contribution
    segments.sort((a, b) => Math.abs(b.contributionPercent) - Math.abs(a.contributionPercent));

    // Top positive/negative
    const topPositive = segments.filter(s => s.delta > 0)
        .sort((a, b) => b.contributionPercent - a.contributionPercent)[0] ?? null;

    const topNegative = segments.filter(s => s.delta < 0)
        .sort((a, b) => a.contributionPercent - b.contributionPercent)[0] ?? null;

    // Generate attribution sentence
    const sentence = buildAttributionSentence(segments, totalDelta, kpiName);

    return {
        segments,
        topPositive,
        topNegative,
        sentence,
        totalDelta,
    };
}

// ─── Sentence Builder ─────────────────────────────────────────────

function buildAttributionSentence(
    segments: SegmentContribution[],
    totalDelta: number,
    kpiName?: string,
): string {
    if (segments.length === 0) return 'No attribution data available.';

    const direction = totalDelta > 0 ? 'increase' : 'decrease';
    const top = segments[0];
    const absContrib = Math.abs(top.contributionPercent);

    const kpiRef = kpiName
        ? kpiName.replace(/_/g, ' ')
        : 'this KPI';

    if (absContrib >= 50) {
        return `${top.segment} contributed ${absContrib.toFixed(0)}% of the ${direction} in ${kpiRef}.`;
    }

    // Multiple contributors
    const topTwo = segments.slice(0, 2);
    if (topTwo.length === 2) {
        return `${topTwo[0].segment} (${Math.abs(topTwo[0].contributionPercent).toFixed(0)}%) and ${topTwo[1].segment} (${Math.abs(topTwo[1].contributionPercent).toFixed(0)}%) were the primary drivers of the ${direction}.`;
    }

    return `${top.segment} was the primary driver of the ${direction} (${absContrib.toFixed(0)}% contribution).`;
}
