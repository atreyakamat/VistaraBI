// T-dco: DCO (Domain Context Object) validation tests — Stage 3
import { describe, it, expect } from 'vitest';
import { runValidationPipeline } from '../../src/lib/module-6/validation-pipeline';
import type { Module6Context } from '../../src/lib/module-6/types';
import { computeDatasetVersionId } from '../../src/lib/module-6/context-builder';
import { generateIntentId } from '../../src/lib/module-6/idempotency';

const SESSION_ID = 'sess-dco-test';
const PROJECT_ID = 'proj-dco-001';
const KPI_IDS = ['kpi-ec-001', 'kpi-ec-002'];
const datasetVersionId = computeDatasetVersionId(PROJECT_ID, 1, KPI_IDS);
const intentId = generateIntentId('test dco query', datasetVersionId, SESSION_ID);

const CONTEXT: Module6Context = {
    dataset_version_id: datasetVersionId,
    intent_id: intentId,
    eligible_kpis: [
        { id: 'kpi-ec-001', name: 'Total Revenue', category: 'revenue', unit: 'currency' },
        { id: 'kpi-ec-002', name: 'Order Count', category: 'operations', unit: 'count' },
    ],
    dimensions: ['category', 'region'],
    available_filters: ['date', 'status'],
    current_dashboard_cards: [
        { card_id: 'card-001', kpi_id: 'kpi-ec-001', kpi_name: 'Total Revenue', chart_type: 'bar' },
    ],
};

function cmd(overrides: Record<string, unknown>): string {
    return JSON.stringify({
        action: 'CREATE_CARD',
        intent_id: intentId,
        ai_generated: true,
        dataset_version_id: datasetVersionId,
        ...overrides,
    });
}

describe('dco-validation.test — Stage 3: DCO Validation', () => {
    it('valid kpi_id in eligible_kpis → passes Stage 3', () => {
        const result = runValidationPipeline(cmd({ kpi_id: 'kpi-ec-001' }), CONTEXT, intentId);
        expect(result.stagesPassed).toBeGreaterThanOrEqual(3);
    });

    it('unknown kpi_id → rejected at STAGE_3_DCO with UNKNOWN_KPI', () => {
        const result = runValidationPipeline(cmd({ kpi_id: 'kpi-made-up' }), CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_3_DCO');
        expect(result.errorCode).toBe('UNKNOWN_KPI');
    });

    it('unknown group_by dimension → rejected with UNKNOWN_DIMENSION', () => {
        const result = runValidationPipeline(
            cmd({ kpi_id: 'kpi-ec-001', group_by: 'invented_dimension' }),
            CONTEXT,
            intentId
        );
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_3_DCO');
        expect(result.errorCode).toBe('UNKNOWN_DIMENSION');
    });

    it('valid dimension → passes Stage 3', () => {
        const result = runValidationPipeline(
            cmd({ kpi_id: 'kpi-ec-001', group_by: 'region' }),
            CONTEXT,
            intentId
        );
        expect(result.stagesPassed).toBeGreaterThanOrEqual(3);
    });

    it('unknown filter key → rejected with UNKNOWN_FILTER', () => {
        const result = runValidationPipeline(
            cmd({ filters: { invented_filter: 'value' } }),
            CONTEXT,
            intentId
        );
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_3_DCO');
        expect(result.errorCode).toBe('UNKNOWN_FILTER');
    });

    it('valid filter key → passes Stage 3', () => {
        const result = runValidationPipeline(
            cmd({ filters: { date: '2024-01-01' } }),
            CONTEXT,
            intentId
        );
        expect(result.stagesPassed).toBeGreaterThanOrEqual(3);
    });

    it('stale dataset_version_id → rejected with STALE_DATASET_VERSION', () => {
        const staleId = 'a'.repeat(64); // wrong hash
        const payload = JSON.stringify({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: staleId,  // mismatch!
        });
        const result = runValidationPipeline(payload, CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_3_DCO');
        expect(result.errorCode).toBe('STALE_DATASET_VERSION');
    });

    it('comparison with unknown kpi_id_a → UNKNOWN_KPI', () => {
        const result = runValidationPipeline(
            JSON.stringify({
                action: 'COMPARE',
                intent_id: intentId,
                ai_generated: true,
                dataset_version_id: datasetVersionId,
                comparison: {
                    kpi_id_a: 'kpi-invented',
                    kpi_id_b: 'kpi-ec-002',
                },
            }),
            CONTEXT,
            intentId
        );
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_3_DCO');
        expect(result.errorCode).toBe('UNKNOWN_KPI');
    });

    it('comparison with valid kpis → passes Stage 3', () => {
        const result = runValidationPipeline(
            JSON.stringify({
                action: 'COMPARE',
                intent_id: intentId,
                ai_generated: true,
                dataset_version_id: datasetVersionId,
                comparison: {
                    kpi_id_a: 'kpi-ec-001',
                    kpi_id_b: 'kpi-ec-002',
                },
            }),
            CONTEXT,
            intentId
        );
        expect(result.stagesPassed).toBeGreaterThanOrEqual(3);
    });
});
