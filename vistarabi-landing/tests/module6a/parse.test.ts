// T-parse: Stage 1 parse guard tests
import { describe, it, expect } from 'vitest';
import { runValidationPipeline } from '../../src/lib/module-6/validation-pipeline';
import type { Module6Context } from '../../src/lib/module-6/types';
import { computeDatasetVersionId } from '../../src/lib/module-6/context-builder';
import { generateIntentId } from '../../src/lib/module-6/idempotency';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SESSION_ID = 'test-session-001';
const PROJECT_ID = 'proj-001';
const STATE_VERSION = 1;
const KPI_IDS = ['kpi-ec-001', 'kpi-ec-002'];

const datasetVersionId = computeDatasetVersionId(PROJECT_ID, STATE_VERSION, KPI_IDS);
const intentId = generateIntentId('show me revenue chart', datasetVersionId, SESSION_ID);

const CONTEXT: Module6Context = {
    dataset_version_id: datasetVersionId,
    intent_id: intentId,
    eligible_kpis: [
        { id: 'kpi-ec-001', name: 'Total Revenue', category: 'revenue', unit: 'currency' },
        { id: 'kpi-ec-002', name: 'Order Count', category: 'operations', unit: 'count' },
    ],
    dimensions: ['category', 'region', 'product_name'],
    available_filters: ['date', 'status', 'region'],
    current_dashboard_cards: [
        { card_id: 'card-001', kpi_id: 'kpi-ec-001', kpi_name: 'Total Revenue', chart_type: 'bar' },
    ],
};

function validCommand(intentId: string, datasetVersionId: string): string {
    return JSON.stringify({
        action: 'CREATE_CARD',
        intent_id: intentId,
        ai_generated: true,
        dataset_version_id: datasetVersionId,
        kpi_id: 'kpi-ec-001',
        chart_type: 'bar',
    });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('parse.test — Stage 1: Parse Guard', () => {
    it('valid JSON object passes Stage 1', () => {
        const result = runValidationPipeline(validCommand(intentId, datasetVersionId), CONTEXT, intentId);
        expect(result.stagesPassed).toBeGreaterThanOrEqual(1);
    });

    it('completely invalid string → rejected at STAGE_1_PARSE', () => {
        const result = runValidationPipeline('this is not json at all', CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_1_PARSE');
        expect(result.errorCode).toBe('INVALID_JSON');
    });

    it('empty string → rejected at STAGE_1_PARSE', () => {
        const result = runValidationPipeline('', CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_1_PARSE');
    });

    it('JSON array (not object) → rejected at STAGE_1_PARSE', () => {
        // '[' does not start with '{', so it's caught as INVALID_JSON at parse guard
        const result = runValidationPipeline('[{"action":"CREATE_CARD"}]', CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_1_PARSE');
        // Arrays start with '[' not '{', so rejected as INVALID_JSON before object check
        expect(['INVALID_JSON', 'NOT_AN_OBJECT']).toContain(result.errorCode);
    });

    it('```json fenced output → fence stripped and parsed correctly', () => {
        const fenced = '```json\n' + validCommand(intentId, datasetVersionId) + '\n```';
        const result = runValidationPipeline(fenced, CONTEXT, intentId);
        // Should pass Stage 1 (fence stripped), may fail later stages
        expect(result.stagesPassed).toBeGreaterThanOrEqual(1);
    });

    it('null JSON value → rejected at STAGE_1_PARSE', () => {
        const result = runValidationPipeline('null', CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_1_PARSE');
    });

    it('prose response → rejected at STAGE_1_PARSE', () => {
        const result = runValidationPipeline(
            'I would suggest adding a Revenue chart to your dashboard.',
            CONTEXT,
            intentId
        );
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_1_PARSE');
    });
});
