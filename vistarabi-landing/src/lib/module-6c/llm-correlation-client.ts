// Module 6C — LLM Correlation Client (Claude Sonnet 4.6)
// Narrates a CorrelationEvidencePacket with strict statistical guardrails.
// Temperature: 0.1 | No retries | Single pass only.

import Anthropic from '@anthropic-ai/sdk';
import type { CorrelationEvidencePacket } from './types';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 800;
const TEMPERATURE = 0.1;
const TIMEOUT_MS = 30_000;

// ─── System Prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a statistical interpretation assistant for a business intelligence dashboard.

STRICT RULES — any violation causes your response to be automatically discarded:
1. You must NOT assert causation between KPIs. You may only state correlation.
2. You may state: "X and Y show a statistically significant correlation" but not "X causes Y".
3. You must ONLY reference numeric values present in the evidence packet's traceable_fields.
4. You must NOT invent correlation strengths, effect sizes, or confidence descriptors beyond what is in the packet.
5. You may NOT use the word "because", "drives", "causes", "leads to", or "impacts".
6. If correlation_reportable is false, your entire response must be exactly:
   "The available data does not support a statistically valid correlation between these KPIs."
7. If confidence_level is "low", you must include: "This correlation is based on limited evidence."
8. Keep your response to 3–5 sentences. No bullet points. No headers. No markdown.
9. Reference the KPI names, pearson_r, n_observations, and confidence_level explicitly if available.
10. Do not suggest follow-up actions, recommendations, or next steps.`;

// ─── Error Classes ─────────────────────────────────────────────────────────────

export class LLMCorrelationCallError extends Error {
    constructor(
        public readonly code: string,
        message: string
    ) {
        super(message);
        this.name = 'LLMCorrelationCallError';
    }
}

// ─── Client ───────────────────────────────────────────────────────────────────

function getClient(): Anthropic {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new LLMCorrelationCallError(
            'MISSING_API_KEY',
            'ANTHROPIC_API_KEY is not set. Module 6C requires this environment variable.'
        );
    }
    return new Anthropic({ apiKey, timeout: TIMEOUT_MS });
}

// ─── Main Call ────────────────────────────────────────────────────────────────

/**
 * Call Claude Sonnet 4.6 with the serialized correlation evidence packet.
 * Returns raw LLM output string — numeric validation is done by the caller.
 *
 * Sends only the compact evidence packet — no raw data arrays.
 * Throws LLMCorrelationCallError on API failure.
 */
export async function callCorrelationLLM(
    userQuery: string,
    packet: CorrelationEvidencePacket
): Promise<string> {
    const client = getClient();

    // If not reportable, send early instruction to return standard rejection string
    const reportableNote = packet.correlation_reportable
        ? ''
        : '\n\nIMPORTANT: correlation_reportable is false. Your entire response must be the rejection sentence as specified in rule 6.';

    const evidenceJson = JSON.stringify({
        kpi_a_name: packet.kpi_a_name,
        kpi_b_name: packet.kpi_b_name,
        unit_a: packet.unit_a,
        unit_b: packet.unit_b,
        grain: packet.grain,
        time_window_start: packet.time_window_start,
        time_window_end: packet.time_window_end,
        n_observations: packet.n_observations,
        pearson_r: packet.pearson_r,
        p_value: packet.p_value,
        statistically_significant: packet.statistically_significant,
        lag_applied: packet.lag_applied,
        bonferroni_alpha: packet.bonferroni_alpha,
        null_ratio_a: packet.null_ratio_a,
        null_ratio_b: packet.null_ratio_b,
        first_differencing_applied: packet.first_differencing_applied,
        trend_confounder_detected: packet.trend_confounder_detected,
        confidence_level: packet.confidence_level,
        correlation_reportable: packet.correlation_reportable,
        traceable_fields: packet.traceable_fields,
    }, null, 0);

    const userMessage = `Evidence packet:
${evidenceJson}${reportableNote}

User question: "${userQuery}"

Provide your evidence-based interpretation now:`;

    let response: Anthropic.Message;

    try {
        response = await client.messages.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
        });
    } catch (err: any) {
        if (err.name === 'APITimeoutError' || err.code === 'ETIMEDOUT') {
            throw new LLMCorrelationCallError('LLM_TIMEOUT', `Claude API timed out after ${TIMEOUT_MS / 1000}s`);
        }
        throw new LLMCorrelationCallError('LLM_CALL_FAILED', `Claude API error: ${err.message ?? 'unknown'}`);
    }

    const block = response.content.find(b => b.type === 'text');
    if (!block || block.type !== 'text') {
        throw new LLMCorrelationCallError('LLM_CALL_FAILED', 'Claude returned no text content block');
    }

    return block.text;
}
