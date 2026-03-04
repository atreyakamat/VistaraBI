// T-security: Stage 4 Security Scan tests
import { describe, it, expect } from 'vitest';
import { runValidationPipeline } from '../../src/lib/module-6/validation-pipeline';
import type { Module6Context } from '../../src/lib/module-6/types';
import { computeDatasetVersionId } from '../../src/lib/module-6/context-builder';
import { generateIntentId } from '../../src/lib/module-6/idempotency';

const SESSION_ID = 'sess-sec-test';
const PROJECT_ID = 'proj-sec-001';
const KPI_IDS = ['kpi-001'];
const datasetVersionId = computeDatasetVersionId(PROJECT_ID, 1, KPI_IDS);
const intentId = generateIntentId('security test query', datasetVersionId, SESSION_ID);

const CONTEXT: Module6Context = {
    dataset_version_id: datasetVersionId,
    intent_id: intentId,
    eligible_kpis: [{ id: 'kpi-001', name: 'Revenue', category: 'revenue', unit: 'currency' }],
    dimensions: ['region'],
    available_filters: ['date'],
    current_dashboard_cards: [],
};

function inject(field: string, value: string): string {
    return JSON.stringify({
        action: 'CREATE_CARD',
        intent_id: intentId,
        ai_generated: true,
        dataset_version_id: datasetVersionId,
        kpi_id: 'kpi-001',
        natural_language_intent: value,  // injection via a string field
        [field]: value,
    });
}

// Note: some injections go via natural_language_intent since other fields
// are validated by Zod's typed schema first

describe('security.test — Stage 4: Security Scan', () => {
    it('natural_language_intent with SELECT → SECURITY_VIOLATION', () => {
        const payload = JSON.stringify({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            kpi_id: 'kpi-001',
            natural_language_intent: 'SELECT * FROM users',
        });
        const result = runValidationPipeline(payload, CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_4_SECURITY');
        expect(result.errorCode).toBe('SECURITY_VIOLATION');
    });

    it('payload containing FROM → SECURITY_VIOLATION', () => {
        const payload = JSON.stringify({
            action: 'APPLY_FILTER',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            natural_language_intent: 'Revenue FROM orders WHERE status=active',
        });
        const result = runValidationPipeline(payload, CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_4_SECURITY');
    });

    it('payload containing WHERE → SECURITY_VIOLATION', () => {
        const payload = JSON.stringify({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            kpi_id: 'kpi-001',
            natural_language_intent: 'show me data WHERE revenue > 1000',
        });
        const result = runValidationPipeline(payload, CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_4_SECURITY');
    });

    it('payload containing JOIN → SECURITY_VIOLATION', () => {
        const payload = JSON.stringify({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            natural_language_intent: 'JOIN orders with customers',
        });
        const result = runValidationPipeline(payload, CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_4_SECURITY');
    });

    it('payload containing semicolon → SECURITY_VIOLATION', () => {
        const payload = JSON.stringify({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            kpi_id: 'kpi-001',
            natural_language_intent: 'do something; DROP TABLE users',
        });
        const result = runValidationPipeline(payload, CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_4_SECURITY');
    });

    it('payload containing template literal ${...} → SECURITY_VIOLATION', () => {
        const payload = JSON.stringify({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            kpi_id: 'kpi-001',
            natural_language_intent: 'show ${process.env.SECRET}',
        });
        const result = runValidationPipeline(payload, CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_4_SECURITY');
    });

    it('payload containing path traversal ../ → SECURITY_VIOLATION', () => {
        const payload = JSON.stringify({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            kpi_id: 'kpi-001',
            natural_language_intent: '../../etc/passwd',
        });
        const result = runValidationPipeline(payload, CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_4_SECURITY');
    });

    it('clean payload → passes Stage 4', () => {
        const payload = JSON.stringify({
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            kpi_id: 'kpi-001',
            chart_type: 'bar',
            natural_language_intent: 'Show me revenue by region',
        });
        const result = runValidationPipeline(payload, CONTEXT, intentId);
        // Should pass Stage 4 and reach Stage 5
        expect(result.stagesPassed).toBeGreaterThanOrEqual(4);
    });

    it('DROP TABLE → SECURITY_VIOLATION', () => {
        const payload = JSON.stringify({
            action: 'DELETE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            natural_language_intent: 'DROP TABLE approvedkpi',
        });
        const result = runValidationPipeline(payload, CONTEXT, intentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_4_SECURITY');
    });
});
