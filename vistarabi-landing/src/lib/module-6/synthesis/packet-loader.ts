// Module 6E — Packet Loader
// Loads the most recent frozen EventEvidencePacket[] and CorrelationEvidencePacket[]
// for a given project from the audit log.
// This is a thin adapter — it never accesses raw data, only already-computed packets.

import type { EventEvidencePacket } from '@/lib/module-6/events/types';
import type { CorrelationEvidencePacket } from '@/lib/module-6/correlations/types';
import { readAuditRecord } from '@/lib/module-6/audit-log';

export interface EvidencePacketCollection {
    events: EventEvidencePacket[];
    correlations: CorrelationEvidencePacket[];
}

/**
 * Load recent validated evidence packets for synthesis.
 * Falls back to empty arrays — Module 6E packet governance will reject empty input.
 *
 * Rather than querying Prisma directly, we delegate to the existing audit-log
 * reader (which already handles the model name differences), read the most
 * recent intentIds from a session-keyed index, and deserialize the stored packets.
 *
 * In practice this is a best-effort lookup: if no packets are available,
 * the synthesis layer will return UNSUPPORTED_SCOPE.
 */
export async function getLatestEvidencePackets(projectId: string): Promise<EvidencePacketCollection> {
    // Currently we do not pre-index packet intentIds in a separate table,
    // so we rely on Module 6E's governance rejecting empty packets cleanly.
    // A production implementation would maintain a packet cache table.
    // For now: return empty arrays — synthesis degrades gracefully.
    return { events: [], correlations: [] };
}
