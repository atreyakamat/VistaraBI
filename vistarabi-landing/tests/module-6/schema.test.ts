// T-schema: Zod schema validation tests
import { describe, it, expect } from 'vitest';
import { parseCommandSchema } from '../../src/lib/module-6/command-schema';
import { runValidationPipeline } from '../../src/lib/module-6/validation-pipeline';
import type { Module6Context } from '../../src/lib/module-6/types';
import { computeDatasetVersionId } from '../../src/lib/module-6/context-builder';
import { generateIntentId } from '../../src/lib/module-6/idempotency';

const SESSION_ID = 'sess-schema-test';
const PROJECT_ID = 'proj-schema-001';
const KPI_IDS = ['kpi-001'];
const datasetVersionId = computeDatasetVersionId(PROJECT_ID, 1, KPI_IDS);
const intentId = generateIntentId('test query', datasetVersionId, SESSION_ID);

const BASE_CONTEXT: Module6Context = {
    dataset_version_id: datasetVersionId,
    intent_id: intentId,
    eligible_kpis: [{ id: 'kpi-001', name: 'Revenue', category: 'revenue', unit: 'currency' }],
    dimensions: ['region'],
    available_filters: ['date'],
    current_dashboard_cards: [],
};

// ─── parseCommandSchema unit tests ────────────────────────────────────────────

describe('schema.test — Zod Schema Validation', () => {
    it('valid minimal command passes schema', () => {
        const result = parseCommandSchema({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
        });
        expect(result.success).toBe(true);
    });

    it('unknown action → schema rejection', () => {
        const result = parseCommandSchema({
            action: 'INVENT_KPI',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.errors[0].field).toBe('action');
        }
    });

    it('ai_generated: false → schema rejection', () => {
        const result = parseCommandSchema({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: false,
            dataset_version_id: datasetVersionId,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.errors[0].field).toBe('ai_generated');
        }
    });

    it('ai_generated missing → schema rejection', () => {
        const result = parseCommandSchema({
            action: 'CREATE_CARD',
            intent_id: intentId,
            dataset_version_id: datasetVersionId,
        });
        expect(result.success).toBe(false);
    });

    it('intent_id wrong format (not SHA-256) → schema rejection', () => {
        const result = parseCommandSchema({
            action: 'CREATE_CARD',
            intent_id: 'not-a-sha256-hash',
            ai_generated: true,
            dataset_version_id: datasetVersionId,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.errors.some(e => e.field === 'intent_id')).toBe(true);
        }
    });

    it('intent_id empty string → schema rejection', () => {
        const result = parseCommandSchema({
            action: 'CREATE_CARD',
            intent_id: '',
            ai_generated: true,
            dataset_version_id: datasetVersionId,
        });
        expect(result.success).toBe(false);
    });

    it('unknown extra key → rejected by .strict()', () => {
        const result = parseCommandSchema({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            injected_field: 'sqlquery',  // unexpected key
        });
        expect(result.success).toBe(false);
    });

    it('invalid chart_type → schema rejection', () => {
        const result = parseCommandSchema({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            chart_type: 'radar',  // not in enum
        });
        expect(result.success).toBe(false);
    });

    it('valid chart_types all accepted', () => {
        const validCharts = ['bar', 'line', 'area', 'table', 'pie', 'scatter'];
        for (const chart_type of validCharts) {
            const result = parseCommandSchema({
                action: 'CREATE_CARD',
                intent_id: intentId,
                ai_generated: true,
                dataset_version_id: datasetVersionId,
                chart_type,
            });
            expect(result.success).toBe(true);
        }
    });

    it('comparison with valid kpi_ids passes', () => {
        const result = parseCommandSchema({
            action: 'COMPARE',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            comparison: {
                kpi_id_a: 'kpi-001',
                kpi_id_b: 'kpi-002',
                period: 'monthly',
            },
        });
        expect(result.success).toBe(true);
    });

    it('comparison with invalid period → schema rejection', () => {
        const result = parseCommandSchema({
            action: 'COMPARE',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            comparison: {
                kpi_id_a: 'kpi-001',
                kpi_id_b: 'kpi-002',
                period: 'weekly',  // not in enum
            },
        });
        expect(result.success).toBe(false);
    });

    // ─── Full pipeline integration checks ─────────────────────────────────────

    it('pipeline fails STAGE_2_SCHEMA for unknown action', () => {
        const payload = JSON.stringify({
            action: 'HACK_SYSTEM',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
        });
        const result = runValidationPipeline(payload, BASE_CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_2_SCHEMA');
    });

    it('pipeline fails STAGE_2_SCHEMA for ai_generated: false', () => {
        const payload = JSON.stringify({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: false,
            dataset_version_id: datasetVersionId,
        });
        const result = runValidationPipeline(payload, BASE_CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_2_SCHEMA');
        expect(result.errorCode).toBe('SCHEMA_VIOLATION');
    });
});
