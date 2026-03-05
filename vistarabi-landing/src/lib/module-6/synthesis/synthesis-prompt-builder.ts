// Module 6E — Synthesis Prompt Builder
// Constructs evidence-only prompts for multi-packet synthesis.
// Uses sanitizeUserQuery from Module 6D prompt-builder.
// Never includes raw arrays, SQL, execution metadata, or dataset identifiers.

import type {
    EventEvidencePacket,
    CorrelationEvidencePacket,
    ConflictDescriptor,
    SynthesisTaskType,
} from './types';
import { sanitizeUserQuery } from '@/lib/module-6/infrastructure/prompt-builder';

// ─── Serializers ──────────────────────────────────────────────────────────────

function serializeEvent(ev: EventEvidencePacket): string {
    const parts = [
        `KPI: ${ev.kpi_name} (${ev.unit})`,
        `Event: ${ev.event_type}`,
        `Direction: ${ev.delta_direction ?? 'unknown'}`,
        ev.delta_percent !== null ? `Delta: ${ev.delta_percent}%` : null,
        ev.volatility_index !== null ? `Volatility: ${ev.volatility_index}` : null,
        `Confidence: ${ev.confidence_level}`,
        `Period: ${ev.period_start} to ${ev.period_end}`,
    ];
    return parts.filter(Boolean).join(' | ');
}

function serializeCorrelation(corr: CorrelationEvidencePacket): string {
    const parts = [
        `KPIs: ${corr.kpi_a_name} ↔ ${corr.kpi_b_name}`,
        corr.pearson_r !== null ? `r=${corr.pearson_r.toFixed(3)}` : 'r=N/A',
        corr.p_value !== null ? `p=${corr.p_value.toFixed(4)}` : null,
        `n=${corr.n_observations}`,
        `Lag: ${corr.lag_applied}`,
        `Confidence: ${corr.confidence_level}`,
        corr.first_differencing_applied ? 'First-differenced' : null,
        corr.trend_confounder_detected ? 'Trend confounder detected' : null,
    ];
    return parts.filter(Boolean).join(' | ');
}

function serializeConflicts(conflicts: ConflictDescriptor[]): string {
    if (conflicts.length === 0) return 'No conflicts detected.';
    return conflicts.map((c, i) => `Conflict ${i + 1} [${c.type}] (${c.severity}): ${c.description}`).join('\n');
}

// ─── System Prompts ───────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<Exclude<SynthesisTaskType, 'UNSUPPORTED_SCOPE'>, string> = {
    SINGLE_PACKET_SUMMARY: `You are a deterministic analytics narrator.
RULES:
1. Reference only values from traceable_fields.
2. Do not introduce new numbers or statistics.
3. Do not assert causation. Use only: associated, correlated, co-moves, observed.
4. Keep response to 2-4 sentences. No markdown.`,

    MULTI_PACKET_SYNTHESIS: `You are a multi-signal analytics synthesizer.
RULES:
1. Reference only numbers present in the evidence packets.
2. Do not invent comparisons not in the evidence.
3. Do not assert causation.
4. Acknowledge conflicts explicitly if provided.
5. Keep response to 3-5 sentences. No markdown.`,

    CORRELATION_CLUSTER_ANALYSIS: `You are a statistical pattern summarizer.
RULES:
1. Summarize only statistically significant correlations.
2. Reference exact r, p, and n values from the evidence.
3. Do not assert causation. State only association or co-movement.
4. Highlight the strongest validated relationship.
5. Acknowledge confounders and first-differencing if applicable.
6. Keep response to 4-6 sentences. No markdown.`,

    STRATEGIC_FINANCIAL_OVERVIEW: `You are a strategic analytics advisor operating within strict evidence boundaries.
RULES:
1. Synthesize patterns ONLY across the provided evidence packets.
2. Do not state causation. Use: associated, co-movement, pattern, observation.
3. Reference all numeric values only from traceable_fields.
4. Label all inferences clearly as observations, not conclusions.
5. Acknowledge any conflicts in the evidence explicitly.
6. Do not recommend actions or modifications.
7. Keep response to 5-7 sentences. No markdown.`,

    RISK_SIGNAL_SYNTHESIS: `You are a risk analytics summarizer operating within strict statistical boundaries.
RULES:
1. Assess risk signals ONLY from validated evidence packets.
2. Do not predict future outcomes.
3. Do not assert causation.
4. Reference exact numeric values from traceable_fields.
5. Acknowledge statistical confidence levels explicitly.
6. State volatility and significance findings separately.
7. Do not recommend trades, strategies, or actions.
8. Keep response to 5-7 sentences. No markdown.`,
};

// ─── Main Builder ─────────────────────────────────────────────────────────────

export interface SynthesisPrompt {
    systemPrompt: string;
    userMessage: string;
    sanitizedQuery: string;
}

export function buildSynthesisPrompt(
    taskType: Exclude<SynthesisTaskType, 'UNSUPPORTED_SCOPE'>,
    events: EventEvidencePacket[],
    correlations: CorrelationEvidencePacket[],
    conflicts: ConflictDescriptor[],
    rawUserQuery: string
): SynthesisPrompt {
    const systemPrompt = SYSTEM_PROMPTS[taskType];
    const sanitizedQuery = sanitizeUserQuery(rawUserQuery);

    const eventBlock = events.length > 0
        ? `Events:\n${events.map(serializeEvent).join('\n')}`
        : '';

    const corrBlock = correlations.length > 0
        ? `Correlations:\n${correlations.map(serializeCorrelation).join('\n')}`
        : '';

    const conflictBlock = `Conflicts:\n${serializeConflicts(conflicts)}`;

    const userMessage = [
        eventBlock,
        corrBlock,
        conflictBlock,
        `\nUser question: "${sanitizedQuery}"`,
        `\nProvide your evidence-based synthesis:`,
    ].filter(Boolean).join('\n\n');

    return { systemPrompt, userMessage, sanitizedQuery };
}
