// audit-logger.test.ts — Module 6D reasoning audit record tests
import { describe, it, expect, vi } from 'vitest';
import type { ModelAuditMetadata } from '../../src/lib/module-6d/types';

// ─── Mock writeAuditRecord ────────────────────────────────────────────────────

// Mock before importing audit-logger (static mock at module level)
vi.mock('@/lib/module-6/audit-log', () => ({
    writeAuditRecord: vi.fn().mockResolvedValue(undefined),
    readAuditRecord: vi.fn().mockResolvedValue(null),
}));

const { writeReasoningAuditRecord } = await import('../../src/lib/module-6d/audit-logger');
const { writeAuditRecord } = await import('@/lib/module-6/audit-log');

// ─── Fixture ─────────────────────────────────────────────────────────────────

const METADATA: ModelAuditMetadata = {
    taskType: 'CORRELATION_EXPLANATION',
    modelTier: 'LOCAL',
    modelId: 'qwen3:8b',
    temperature: 0.1,
    inputTokens: 120,
    outputTokens: 80,
    latencyMs: 245,
    status: 'success',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('audit-logger — writeReasoningAuditRecord()', () => {
    it('calls writeAuditRecord with a valid AuditRecord shape', async () => {
        vi.mocked(writeAuditRecord).mockClear();

        await writeReasoningAuditRecord({
            projectId: 'proj-001',
            taskType: 'CORRELATION_EXPLANATION',
            userQuery: 'What does this correlation mean?',
            sanitizedQuery: 'What does this correlation mean?',
            modelMetadata: METADATA,
            narrationStatus: 'success',
        });

        expect(writeAuditRecord).toHaveBeenCalledTimes(1);
        const record = vi.mocked(writeAuditRecord).mock.calls[0][0];
        expect(record.sessionId).toBe('proj-001');
        expect(record.rawUserQuery).toBeTruthy();
        expect(record.intentId).toBeTruthy();
    });

    it('modelMetadata is embedded in the record (structuredCommand)', async () => {
        vi.mocked(writeAuditRecord).mockClear();

        await writeReasoningAuditRecord({
            projectId: 'proj-002',
            taskType: 'ADVANCED_SYNTHESIS',
            userQuery: 'Synthesize KPIs',
            sanitizedQuery: 'Synthesize KPIs',
            modelMetadata: { ...METADATA, taskType: 'ADVANCED_SYNTHESIS', modelTier: 'CLOUD', modelId: 'qwen-max' },
            narrationStatus: 'success',
        });

        const record = vi.mocked(writeAuditRecord).mock.calls[0][0];
        // modelId should be accessible through structuredCommand or directly
        const command = record.structuredCommand as any;
        expect(command?.modelId).toBe('qwen-max');
    });

    it('latencyMs recorded in audit', async () => {
        vi.mocked(writeAuditRecord).mockClear();

        await writeReasoningAuditRecord({
            projectId: 'proj-003',
            taskType: 'EVENT_NARRATION',
            userQuery: 'Explain event',
            sanitizedQuery: 'Explain event',
            modelMetadata: { ...METADATA, latencyMs: 387 },
            narrationStatus: 'success',
        });

        const record = vi.mocked(writeAuditRecord).mock.calls[0][0];
        const command = record.structuredCommand as any;
        expect(command?.latencyMs).toBe(387);
    });

    it('writeAuditRecord failure → does NOT throw (audit is non-fatal)', async () => {
        vi.mocked(writeAuditRecord).mockRejectedValueOnce(new Error('DB unreachable'));

        // Should not throw
        await expect(writeReasoningAuditRecord({
            projectId: 'proj-004',
            taskType: 'EVENT_NARRATION',
            userQuery: 'test',
            sanitizedQuery: 'test',
            modelMetadata: METADATA,
            narrationStatus: 'success',
        })).resolves.not.toThrow();
    });

    it('error code recorded when provided', async () => {
        vi.mocked(writeAuditRecord).mockClear();
        vi.mocked(writeAuditRecord).mockResolvedValueOnce(undefined);

        await writeReasoningAuditRecord({
            projectId: 'proj-005',
            taskType: 'CORRELATION_EXPLANATION',
            userQuery: 'Explain',
            sanitizedQuery: 'Explain',
            modelMetadata: { ...METADATA, status: 'error' },
            narrationStatus: 'failed',
            errorCode: 'LOCAL_TIMEOUT',
        });

        const record = vi.mocked(writeAuditRecord).mock.calls[0][0];
        expect(record.errorCode).toBe('LOCAL_TIMEOUT');
    });
});
