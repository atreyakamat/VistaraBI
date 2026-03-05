// Module 6B — LLM Event Client (Claude Sonnet 4.6)
// Narrates a structured EventEvidencePacket using guarded LLM reasoning.
// The LLM receives ONLY the evidence packet — never raw KPI arrays.
// Temperature: 0.1 (near-deterministic, slight variation for natural language)
// No retries. Single pass only.

import { callLocalModel } from '@/lib/module-6d/local-adapter';
import type { EventEvidencePacket } from './types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const TEMPERATURE = 0.1;

// ─── System Prompt ─────────────────────────────────────────────────────────────
// This prompt is the narrative guardrail. It defines exactly what the LLM may say.

const SYSTEM_PROMPT = `You are an analytics reasoning assistant for a business intelligence dashboard.

STRICT RULES — every violation means your response will be automatically discarded:
1. You operate ONLY on the structured evidence packet provided. No external knowledge.
2. You must NOT invent numeric values. Every number you mention must appear in the evidence packet.
3. You must NOT assert causation. You may only describe observed patterns.
4. You must NOT infer missing data. If a field is null, do not speculate about it.
5. You may ONLY reference fields listed in the traceable_fields array of the evidence packet.
6. If confidence_level is "insufficient", your response MUST begin with:
   "The available data does not support a statistically valid conclusion."
7. If confidence_level is "low", acknowledge the limited data in your response.
8. Keep your explanation to 3–5 sentences. No bullet points. No headers. No markdown.
9. Reference the KPI name, the event type, and the evidence fields explicitly.
10. Do not end with recommendations, suggestions, or next steps.

Your task: explain what the evidence packet shows about a KPI's behavior during the queried period.`;

// ─── Error Classes ─────────────────────────────────────────────────────────────

export class LLMEventCallError extends Error {
    constructor(
        public readonly code: string,
        message: string
    ) {
        super(message);
        this.name = 'LLMEventCallError';
    }
}

// ─── Main Call ────────────────────────────────────────────────────────────────

/**
 * Call Claude Sonnet 4.6 with the serialized evidence packet + user question.
 * Returns raw LLM output string — numeric validation is done by the caller.
 *
 * Contract:
 * - No retries (single pass)
 * - Never sends raw KPI arrays — only the evidence packet
 * - Throws LLMEventCallError on API failure
 */
export async function callEventLLM(
    userQuery: string,
    packet: EventEvidencePacket
): Promise<string> {
    // Compact serialization of evidence — no raw arrays
    const evidenceJson = JSON.stringify({
        kpi_name: packet.kpi_name,
        unit: packet.unit,
        granularity: packet.granularity,
        period_start: packet.period_start,
        period_end: packet.period_end,
        event_type: packet.event_type,
        confidence_level: packet.confidence_level,
        delta_percent: packet.delta_percent,
        delta_direction: packet.delta_direction,
        volatility_index: packet.volatility_index,
        anomaly_detected: packet.anomaly_detected,
        anomaly_period: packet.anomaly_period ?? null,
        anomaly_zscore: packet.anomaly_zscore ?? null,
        dataset_length: packet.dataset_length,
        traceable_fields: packet.traceable_fields,
    }, null, 0);

    const userMessage = `Evidence packet:
${evidenceJson}

User question: "${userQuery}"

Provide your evidence-based explanation now:`;

    try {
        const response = await callLocalModel(SYSTEM_PROMPT, userMessage, TEMPERATURE);
        return response.text;
    } catch (err: any) {
        const code = err.name === 'ModelCallError' ? err.code : 'LLM_CALL_FAILED';
        throw new LLMEventCallError(code, err.message ?? 'Local model call failed');
    }
}
