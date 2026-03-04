// T-idempotency: Stage 5 idempotency tests — no DB required (pure hash logic)
import { describe, it, expect } from 'vitest';
import { generateIntentId, verifyIntentId, computePostHash } from '../../src/lib/module-6/idempotency';
import { runValidationPipeline } from '../../src/lib/module-6/validation-pipeline';
import type { Module6Context, Module6Command } from '../../src/lib/module-6/types';
import { computeDatasetVersionId } from '../../src/lib/module-6/context-builder';

const SESSION_ID = 'sess-idem-test';
const PROJECT_ID = 'proj-idem-001';
const KPI_IDS = ['kpi-001'];
const datasetVersionId = computeDatasetVersionId(PROJECT_ID, 1, KPI_IDS);

const CONTEXT: Module6Context = {
    dataset_version_id: datasetVersionId,
    intent_id: '',  // set per-test
    eligible_kpis: [{ id: 'kpi-001', name: 'Revenue', category: 'revenue', unit: 'currency' }],
    dimensions: ['region'],
    available_filters: ['date'],
    current_dashboard_cards: [],
};

describe('idempotency.test — Intent ID Generation & Tampering Detection', () => {
    it('same inputs always produce the same intent_id (deterministic)', () => {
        const id1 = generateIntentId('show revenue chart', datasetVersionId, SESSION_ID);
        const id2 = generateIntentId('show revenue chart', datasetVersionId, SESSION_ID);
        const id3 = generateIntentId('show revenue chart', datasetVersionId, SESSION_ID);
        expect(id1).toBe(id2);
        expect(id2).toBe(id3);
    });

    it('different queries produce different intent_ids', () => {
        const id1 = generateIntentId('show revenue chart', datasetVersionId, SESSION_ID);
        const id2 = generateIntentId('show order count', datasetVersionId, SESSION_ID);
        expect(id1).not.toBe(id2);
    });

    it('different sessions produce different intent_ids for same query', () => {
        const id1 = generateIntentId('same query', datasetVersionId, 'session-A');
        const id2 = generateIntentId('same query', datasetVersionId, 'session-B');
        expect(id1).not.toBe(id2);
    });

    it('generated intent_id is a valid 64-char hex string', () => {
        const id = generateIntentId('query', datasetVersionId, SESSION_ID);
        expect(id).toMatch(/^[a-f0-9]{64}$/);
    });

    it('verifyIntentId: matching intent_ids return null (no tampering)', () => {
        const id = generateIntentId('query', datasetVersionId, SESSION_ID);
        const error = verifyIntentId(id, id);
        expect(error).toBeNull();
    });

    it('verifyIntentId: mismatched intent_ids return INTENT_ID_TAMPERING', () => {
        const id1 = generateIntentId('query', datasetVersionId, SESSION_ID);
        const id2 = generateIntentId('different query', datasetVersionId, SESSION_ID);
        const error = verifyIntentId(id2, id1);  // LLM changed the hash
        expect(error).toBe('INTENT_ID_TAMPERING');
    });

    it('computePostHash is deterministic for same inputs', () => {
        const intentId = generateIntentId('query', datasetVersionId, SESSION_ID);
        const command: Module6Command = {
            action: 'CREATE_CARD',
            intent_id: intentId,
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            kpi_id: 'kpi-001',
        };
        const h1 = computePostHash(intentId, command);
        const h2 = computePostHash(intentId, command);
        expect(h1).toBe(h2);
        expect(h1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('pipeline Stage 5: tampered intent_id → INTENT_ID_TAMPERING', () => {
        const correctIntentId = generateIntentId('revenue chart', datasetVersionId, SESSION_ID);
        const tamperedIntentId = generateIntentId('completely different query', datasetVersionId, SESSION_ID);

        const context: Module6Context = {
            ...CONTEXT,
            intent_id: correctIntentId,
        };

        // LLM returned a command with TAMPERED intent_id
        const payload = JSON.stringify({
            action: 'CREATE_CARD',
            intent_id: tamperedIntentId,  // WRONG — should be correctIntentId
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            kpi_id: 'kpi-001',
        });

        const result = runValidationPipeline(payload, context, correctIntentId);
        expect(result.success).toBe(false);
        expect(result.failedAt).toBe('STAGE_5_IDEMPOTENCY');
        expect(result.errorCode).toBe('INTENT_ID_TAMPERING');
    });

    it('pipeline Stage 5: correct intent_id → passes Stage 5', () => {
        const intentId = generateIntentId('valid query', datasetVersionId, SESSION_ID);
        const context: Module6Context = {
            ...CONTEXT,
            intent_id: intentId,
        };

        const payload = JSON.stringify({
            action: 'CREATE_CARD',
            intent_id: intentId,  // Correct echo
            ai_generated: true,
            dataset_version_id: datasetVersionId,
            kpi_id: 'kpi-001',
        });

        const result = runValidationPipeline(payload, context, intentId);
        expect(result.success).toBe(true);
        expect(result.stagesPassed).toBe(5);
    });
});
