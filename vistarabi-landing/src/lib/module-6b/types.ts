// Module 6B — Types
// All type definitions for the Event Detection & Evidence Narration layer.
// Module 6B reads ONLY from EnrichedKPIResult — no DB access, no new statistics.

// ─── Event Classification ─────────────────────────────────────────────────────

export type EventType =
    | 'TREND_CHANGE'
    | 'SPIKE'
    | 'DROP'
    | 'ANOMALY'
    | 'VOLATILITY_SHIFT'
    | 'INSUFFICIENT_DATA';

// ─── Confidence Level ─────────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'moderate' | 'low' | 'insufficient';

// ─── Evidence Packet ─────────────────────────────────────────────────────────
// Immutable, frozen before LLM call. All numeric claims trace to this packet.

export interface EventEvidencePacket {
    event_id: string;
    kpi_id: string;
    kpi_name: string;
    unit: string;
    granularity: string;
    period_start: string;       // Earliest period label in dataset
    period_end: string;         // Latest period label in dataset
    delta_percent: number | null;
    delta_direction: 'up' | 'down' | 'flat' | null;
    volatility_index: number | null;
    anomaly_detected: boolean;
    anomaly_period?: string;    // Period label of worst anomaly point
    anomaly_zscore?: number;    // Z-score of worst anomaly point
    dataset_length: number;
    confidence_level: ConfidenceLevel;
    event_type: EventType;
    traceable_fields: string[];  // Names of fields with non-null numeric values
}

// ─── Narration Result ─────────────────────────────────────────────────────────

export type NarrationStatus = 'success' | 'suppressed' | 'insufficient_data' | 'kpi_not_found' | 'rejected';

export interface NarrationResult {
    status: NarrationStatus;
    explanation?: string;       // LLM-generated, only if status === 'success'
    message?: string;           // Human-readable summary for all statuses
    evidence?: EventEvidencePacket;
}

// ─── Numeric Guard Result ─────────────────────────────────────────────────────

export type NumericGuardStatus = 'valid' | 'suppressed';

export interface NumericGuardResult {
    status: NumericGuardStatus;
    explanation?: string;       // Present only if valid
    message?: string;           // Present only if suppressed
    detectedHallucinations?: number[];  // Numeric values that had no evidence match
}

// ─── KPI Hint ────────────────────────────────────────────────────────────────

export interface KPIHint {
    kpiId: string;
    kpiName: string;
    matchedOn: string;     // Which part of the query matched
}
