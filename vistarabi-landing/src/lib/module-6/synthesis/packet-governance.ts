// Module 6E — Packet Governance
// Filters evidence packets that fail quality gates before synthesis.
// Rules:
//   - Remove confidence_level === 'insufficient'
//   - Remove correlation_reportable === false
//   - Validate Object.isFrozen() on every packet
//   - Validate traceable_fields present and non-empty
//   - Require ≥1 packet total after filtering

import type { EventEvidencePacket, CorrelationEvidencePacket, GovernanceResult } from './types';

export function governPackets(
    events: EventEvidencePacket[],
    correlations: CorrelationEvidencePacket[]
): GovernanceResult {
    let removedCount = 0;

    // Filter events
    const governedEvents = events.filter(ev => {
        if (ev.confidence_level === 'insufficient') { removedCount++; return false; }
        if (!ev.traceable_fields || ev.traceable_fields.length === 0) { removedCount++; return false; }
        if (!Object.isFrozen(ev)) { removedCount++; return false; }
        return true;
    });

    // Filter correlations
    const governedCorrelations = correlations.filter(corr => {
        if (corr.confidence_level === 'insufficient') { removedCount++; return false; }
        if (!corr.correlation_reportable) { removedCount++; return false; }
        if (!corr.traceable_fields || corr.traceable_fields.length === 0) { removedCount++; return false; }
        if (!Object.isFrozen(corr)) { removedCount++; return false; }
        return true;
    });

    const totalRemaining = governedEvents.length + governedCorrelations.length;

    if (totalRemaining === 0) {
        return {
            events: [],
            correlations: [],
            removedCount,
            reason: 'All evidence packets were removed during governance filtering. No synthesis is possible.',
        };
    }

    return {
        events: governedEvents,
        correlations: governedCorrelations,
        removedCount,
    };
}
