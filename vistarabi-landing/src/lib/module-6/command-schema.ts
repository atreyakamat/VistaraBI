// Module 6A — Zod Command Schema
// Strict validation schema for Module6Command.
// additionalProperties: false enforced via .strict()
// All enum values are exhaustive. Unknown keys are rejected.

import { z } from 'zod';

// ─── SHA-256 hex pattern (64 lowercase hex chars) ─────────────────────────────
const SHA256_REGEX = /^[a-f0-9]{64}$/;

// ─── Individual field schemas ─────────────────────────────────────────────────

const ActionSchema = z.enum([
    'CREATE_CARD',
    'UPDATE_CARD',
    'DELETE_CARD',
    'APPLY_FILTER',
    'COMPARE',
    'DRILL_DOWN',
]);

const ChartTypeSchema = z.enum(['bar', 'line', 'area', 'table', 'pie', 'scatter']);

const PeriodSchema = z.enum(['monthly', 'quarterly', 'annual']);

const ComparisonSchema = z.object({
    kpi_id_a: z.string().min(1),
    kpi_id_b: z.string().min(1),
    period: PeriodSchema.optional(),
}).strict();

const DrillConfigSchema = z.object({
    dimension: z.string().min(1).max(200),
    value: z.string().max(500).optional(),
}).strict();

// ─── Main Command Schema (strict — no extra keys allowed) ─────────────────────

export const Module6CommandSchema = z.object({
    action: ActionSchema,

    // intent_id must be a valid SHA-256 hex string
    intent_id: z.string().regex(SHA256_REGEX, {
        message: 'intent_id must be a 64-char lowercase hex SHA-256 string',
    }),

    // ai_generated must be the literal boolean true
    ai_generated: z.literal(true, {
        error: 'ai_generated must be exactly true',
    }),

    // dataset_version_id must be a non-empty string
    dataset_version_id: z.string().min(1, {
        message: 'dataset_version_id is required and must be non-empty',
    }),

    // Optional fields — all individually typed and bounded
    target: z.string().min(1).max(200).optional(),
    kpi_id: z.string().min(1).max(200).optional(),
    group_by: z.string().min(1).max(200).optional(),

    filters: z.record(
        z.string().min(1).max(100),            // key: filter column name
        z.union([z.string(), z.array(z.string())])  // value: scalar or list
    ).optional(),

    chart_type: ChartTypeSchema.optional(),
    comparison: ComparisonSchema.optional(),
    drill_config: DrillConfigSchema.optional(),

    natural_language_intent: z.string().max(500).optional(),

}).strict(); // Rejects any additional properties not listed above

// ─── Inferred TypeScript type from Zod schema ─────────────────────────────────
export type ValidatedModule6Command = z.infer<typeof Module6CommandSchema>;

// ─── Validation helper ────────────────────────────────────────────────────────

export interface SchemaValidationError {
    field: string;
    message: string;
}

export function parseCommandSchema(raw: unknown): {
    success: true;
    command: ValidatedModule6Command;
} | {
    success: false;
    errors: SchemaValidationError[];
} {
    const result = Module6CommandSchema.safeParse(raw);

    if (result.success) {
        return { success: true, command: result.data };
    }

    const errors: SchemaValidationError[] = (result.error.issues ?? (result.error as any).errors ?? []).map((e: any) => ({
        field: (e.path ?? []).join('.') || 'root',
        message: e.message,
    }));

    return { success: false, errors };
}
