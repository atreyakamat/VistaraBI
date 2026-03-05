// Module 6D — Prompt Builder
// Constructs evidence-only prompts for each reasoning tier.
// Sanitizes user queries to prevent prompt injection.
// Never includes raw SQL, dataset arrays, or internal execution logs.

import type { EvidenceInput, ReasoningTaskType } from './types';
import { MAX_QUERY_LENGTH } from './types';

// ─── Prompt Injection Sanitization ───────────────────────────────────────────

/**
 * Dangerous patterns to strip from user queries before embedding in prompts.
 * Must be updated if new injection vectors are identified.
 */
const INJECTION_PATTERNS: RegExp[] = [
    // SQL injection patterns
    /\bSELECT\b/gi,
    /\bFROM\b(?!\s+the\b)/gi,    // FROM keyword (allow "from the" in natural language)
    /\bWHERE\b/gi,
    /\bINSERT\b/gi,
    /\bINTO\b/gi,
    /\bUPDATE\b/gi,
    /\bSET\b(?=\s+\w+\s*=)/gi,   // SET col = val (not "set up")
    /\bDELETE\b/gi,
    /\bDROP\b/gi,
    /\bCREATE\b/gi,
    /\bALTER\b/gi,
    /\bTRUNCATE\b/gi,
    /\bUNION\b/gi,
    /\bJOIN\b/gi,
    /\bEXEC(UTE)?\b/gi,
    /--[^\n]*/g,                // SQL line comments
    /\/\*[\s\S]*?\*\//g,        // SQL block comments

    // Script injection
    /<script[\s\S]*?<\/script>/gi,
    /<[a-z]+[^>]*>/gi,         // Any HTML tags

    // Prompt override attempts
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
    /you\s+are\s+now\s+/gi,
    /system:\s*/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<<SYS>>/gi,

    // Repeated newlines (prompt stuffing)
    /\n{3,}/g,
];

/**
 * Sanitize a user query string:
 * 1. Strip injection patterns
 * 2. Normalize whitespace
 * 3. Truncate to MAX_QUERY_LENGTH after sanitization
 * 4. Allow only printable ASCII + common Unicode
 */
export function sanitizeUserQuery(rawQuery: string): string {
    if (!rawQuery) return '';

    let sanitized = rawQuery;

    // Strip injection patterns
    for (const pattern of INJECTION_PATTERNS) {
        sanitized = sanitized.replace(pattern, ' ');
    }

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Strip non-printable characters (keep printable ASCII + Unicode letters/numbers/punctuation)
    sanitized = sanitized.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '');

    // Truncate
    if (sanitized.length > MAX_QUERY_LENGTH) {
        sanitized = sanitized.slice(0, MAX_QUERY_LENGTH);
    }

    return sanitized;
}

// ─── System Prompts by Task Type ─────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<Exclude<ReasoningTaskType, 'UNSUPPORTED'>, string> = {
    INTENT_TRANSLATION: `You are a structured command parser. Convert the user's intent into a valid JSON command. Return only a JSON object. No explanation.`,

    EVENT_NARRATION: `You are a deterministic event narrator for a business intelligence system.
RULES:
1. Reference only values present in the evidence packet's traceable_fields.
2. Do not introduce new statistics or numeric claims.
3. Do not suggest causes or recommend actions.
4. Keep response to 2-4 sentences.
5. Do not use markdown, bullet points, or headers.`,

    CORRELATION_EXPLANATION: `You are a statistical interpretation assistant.
RULES:
1. You must NOT assert causation. Only state correlation.
2. Reference only pearson_r, n_observations, p_value, and confidence_level from the evidence.
3. Do not use the words: because, drives, causes, leads to, impacts.
4. If correlation_reportable is false, respond only with: "The available data does not support a statistically valid correlation between these KPIs."
5. Keep response to 3-5 sentences. No markdown.`,

    ADVANCED_SYNTHESIS: `You are an advanced analytical reasoning assistant for a governed analytics platform.
RULES:
1. You may synthesize patterns ONLY across the KPI evidence packets provided.
2. Do not state causation. You may state association, co-movement, or pattern.
3. Reference only numeric values present in the evidence packets.
4. Any inference beyond the evidence must be explicitly labeled as a hypothesis, not a finding.
5. Do not recommend actions or modifications to data.
6. Keep response to 4-6 sentences. No markdown headers.`,

    STRATEGIC_SUMMARY: `You are a strategic analytics summarizer operating within strict evidence boundaries.
RULES:
1. Summarize only patterns that are statistically validated (significant) per the evidence packets.
2. Do not introduce external benchmarks, industry standards, or anecdotal claims.
3. Do not claim causal relationships.
4. Label all observations as observations, not conclusions, unless significance is confirmed.
5. Reference all numeric values only from traceable_fields.
6. Keep response to 5-7 sentences. No lists, no headers.`,
};

// ─── Serialized Evidence ──────────────────────────────────────────────────────

/**
 * Serialize an evidence packet to a compact JSON string.
 * Excludes internal fields like insight_id that are not relevant to the model.
 * Only includes traceable_fields and their values.
 */
function serializeEvidence(evidence: EvidenceInput): string {
    // Build a compact object with only the fields listed in traceable_fields
    const traceableFields = (evidence as any).traceable_fields as string[] ?? [];
    const compact: Record<string, unknown> = {};

    for (const field of traceableFields) {
        if (field in evidence) {
            compact[field] = (evidence as any)[field];
        }
    }

    // Always include KPI names for context (non-numeric, safe)
    for (const nameField of ['kpi_name', 'kpi_a_name', 'kpi_b_name', 'kpi_id', 'kpi_a_id', 'kpi_b_id', 'event_type', 'confidence_level', 'correlation_reportable', 'grain', 'time_window_start', 'time_window_end', 'period_start', 'period_end']) {
        if (nameField in evidence && !(nameField in compact)) {
            compact[nameField] = (evidence as any)[nameField];
        }
    }

    compact['traceable_fields'] = traceableFields;

    return JSON.stringify(compact, null, 0);
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

export interface BuiltPrompt {
    systemPrompt: string;
    userMessage: string;
    sanitizedQuery: string;
}

/**
 * Build a system prompt + user message for a reasoning task.
 *
 * Rules:
 *  - User query is always sanitized before embedding
 *  - Evidence is serialized to compact JSON (traceable fields only)
 *  - Raw arrays, SQL, or dataset rows are never included
 *  - System prompt is task-type specific
 */
export function buildReasoningPrompt(
    taskType: Exclude<ReasoningTaskType, 'UNSUPPORTED'>,
    evidence: EvidenceInput,
    rawUserQuery: string
): BuiltPrompt {
    const systemPrompt = SYSTEM_PROMPTS[taskType];
    const sanitizedQuery = sanitizeUserQuery(rawUserQuery);
    const evidenceJson = serializeEvidence(evidence);

    const userMessage = `Evidence packet:
${evidenceJson}

User question: "${sanitizedQuery}"

Provide your evidence-based interpretation:`;

    return { systemPrompt, userMessage, sanitizedQuery };
}
