// Module 6E — Conflict Detector
// Identifies structured conflicts between evidence packets BEFORE LLM invocation.
// The model must NOT infer conflicts implicitly — all conflicts are pre-computed.

import type { EventEvidencePacket, CorrelationEvidencePacket, ConflictDescriptor } from './types';

export function detectConflicts(
    events: EventEvidencePacket[],
    correlations: CorrelationEvidencePacket[]
): ConflictDescriptor[] {
    const conflicts: ConflictDescriptor[] = [];

    // 1. Directional inconsistency: event shows increase but correlated KPI r < 0
    for (const ev of events) {
        for (const corr of correlations) {
            const kpiMatch = corr.kpi_a_id === ev.kpi_id || corr.kpi_b_id === ev.kpi_id;
            if (!kpiMatch || corr.pearson_r === null) continue;

            const eventUp = ev.delta_direction === 'up';
            const eventDown = ev.delta_direction === 'down';
            const corrNeg = corr.pearson_r < 0;
            const corrPos = corr.pearson_r > 0;

            if ((eventUp && corrNeg) || (eventDown && corrPos)) {
                conflicts.push({
                    type: 'DIRECTIONAL_INCONSISTENCY',
                    kpiIds: [ev.kpi_id, corr.kpi_a_id, corr.kpi_b_id],
                    description: `Event shows ${ev.kpi_name} ${ev.delta_direction} but correlation with ${corr.kpi_a_id === ev.kpi_id ? corr.kpi_b_name : corr.kpi_a_name} is ${corrNeg ? 'negative' : 'positive'} (r=${corr.pearson_r?.toFixed(2)}).`,
                    severity: 'high',
                });
            }
        }
    }

    // 2. Confidence mismatch: high vs low confidence across related KPIs
    for (const corr of correlations) {
        const eventA = events.find(e => e.kpi_id === corr.kpi_a_id);
        const eventB = events.find(e => e.kpi_id === corr.kpi_b_id);

        if (eventA && eventB) {
            const confA = eventA.confidence_level;
            const confB = eventB.confidence_level;
            if ((confA === 'high' && confB === 'low') || (confA === 'low' && confB === 'high')) {
                conflicts.push({
                    type: 'CONFIDENCE_MISMATCH',
                    kpiIds: [corr.kpi_a_id, corr.kpi_b_id],
                    description: `Confidence mismatch: ${eventA.kpi_name} (${confA}) vs ${eventB.kpi_name} (${confB}).`,
                    severity: 'moderate',
                });
            }
        }
    }

    // 3. Lag misalignment: dominant lags differ across related pairs
    if (correlations.length >= 2) {
        const lagMap = new Map<string, number>();
        for (const corr of correlations) {
            for (const kpiId of [corr.kpi_a_id, corr.kpi_b_id]) {
                if (lagMap.has(kpiId) && lagMap.get(kpiId) !== corr.lag_applied) {
                    conflicts.push({
                        type: 'LAG_MISALIGNMENT',
                        kpiIds: [kpiId],
                        description: `KPI ${kpiId} has different dominant lags across correlation pairs (lag=${lagMap.get(kpiId)} vs lag=${corr.lag_applied}).`,
                        severity: 'moderate',
                    });
                }
                lagMap.set(kpiId, corr.lag_applied);
            }
        }
    }

    // 4. Volatility mismatch: event volatility high but correlation insignificant
    for (const ev of events) {
        if (ev.volatility_index !== null && ev.volatility_index > 0.3) {
            for (const corr of correlations) {
                const kpiMatch = corr.kpi_a_id === ev.kpi_id || corr.kpi_b_id === ev.kpi_id;
                if (kpiMatch && !corr.statistically_significant) {
                    conflicts.push({
                        type: 'VOLATILITY_MISMATCH',
                        kpiIds: [ev.kpi_id, corr.kpi_a_id, corr.kpi_b_id],
                        description: `${ev.kpi_name} has high volatility (${ev.volatility_index?.toFixed(2)}) but its correlation is not statistically significant.`,
                        severity: 'low',
                    });
                }
            }
        }
    }

    return conflicts;
}
