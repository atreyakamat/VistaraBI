// Module 6A — LLM Client (Claude Sonnet 4.6)
// Strict, no-retry caller. Returns raw string for the validation pipeline.
// All validation logic is downstream — this module only concerns itself with
// making one clean HTTP call and returning the raw model output.

import { callLocalModel } from '@/lib/module-6d/local-adapter';
import { MODULE6_ERROR_CODES } from './types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const TEMPERATURE = 0;            // Deterministic — zero temperature

// ─── System Prompt ─────────────────────────────────────────────────────────────
// This prompt is the guardrail. It must be included on every call without modification.

const SYSTEM_PROMPT = `You are the command parser for a business analytics dashboard.

STRICT RULES (violation = your output is discarded):
1. Output ONLY a single valid JSON object. No prose, no explanation, no markdown.
2. Do NOT wrap in \`\`\`json fences or any other formatting.
3. Do NOT invent KPI IDs. Only use ids from eligible_kpi_ids in the context.
4. Do NOT invent dimensions. Only use columns from the dimensions list.
5. Do NOT invent filter keys. Only use keys from available_filters.
6. Do NOT produce SQL, fragments of SQL, or any database queries.
7. You MUST echo the intent_id field exactly as provided in the context.
8. You MUST echo the dataset_version_id field exactly as provided in the context.
9. You MUST set ai_generated to exactly true (boolean).
10. Respond with exactly ONE JSON object. Not an array. Not nested objects.

Your task: parse the user's natural language dashboard query into a structured command.

Required fields in your JSON:
- action: one of CREATE_CARD, UPDATE_CARD, DELETE_CARD, APPLY_FILTER, COMPARE, DRILL_DOWN
- intent_id: (copy exactly from context)
- ai_generated: true
- dataset_version_id: (copy exactly from context)

Optional fields (only include if directly stated in the query):
- kpi_id: (must be from eligible_kpi_ids)
- group_by: (must be from dimensions)
- filters: (keys must be from available_filters)
- chart_type: bar | line | area | table | pie | scatter
- target: (card_id from current_cards, for UPDATE/DELETE)
- comparison: { kpi_id_a, kpi_id_b, period? }
- drill_config: { dimension, value? }
- natural_language_intent: (short summary of what the user asked, max 200 chars)

If you cannot determine a valid action from the query, output:
{"action":"CREATE_CARD","intent_id":"<echo>","ai_generated":true,"dataset_version_id":"<echo>","natural_language_intent":"Unable to parse intent"}`;

// ─── Error Classes ─────────────────────────────────────────────────────────────

export class LLMCallError extends Error {
    constructor(
        public readonly code: string,
        message: string
    ) {
        super(message);
        this.name = 'LLMCallError';
    }
}

// ─── Main Call ────────────────────────────────────────────────────────────────

/**
 * Call Claude Sonnet 4.6 once with the user query + context snapshot.
 * Returns the raw model output string — validation is downstream.
 *
 * Contract:
 * - No retries (by architectural rule)
 * - If the call fails, throws LLMCallError — caller writes audit log + returns rejection
 * - Raw output is NEVER sent to the frontend
 */
export async function callLLM(
    userQuery: string,
    contextJson: string
): Promise<string> {
    const userMessage = `Dashboard context:
${contextJson}

User request: "${userQuery}"

Output your JSON command now:`;

    try {
        const response = await callLocalModel(SYSTEM_PROMPT, userMessage, TEMPERATURE);
        return response.text;
    } catch (err: any) {
        const code = err.name === 'ModelCallError' ? err.code : MODULE6_ERROR_CODES.LLM_CALL_FAILED;
        throw new LLMCallError(code, err.message ?? 'Local model call failed');
    }
}
