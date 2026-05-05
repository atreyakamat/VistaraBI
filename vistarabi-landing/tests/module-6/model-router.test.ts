// model-router.test.ts — Module 6D routing, feature flag, and rejection tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { routeTask, isRoutingDecision, isCloudRoutingEnabled } from '../../src/lib/module-6/infrastructure/model-router';
import { LOCAL_MODEL_ID, CLOUD_MODEL_ID } from '../../src/lib/module-6/infrastructure/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setCloudRouting(enabled: boolean) {
    process.env.ENABLE_CLOUD_ROUTING = enabled ? 'true' : 'false';
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('model-router — isCloudRoutingEnabled()', () => {
    afterEach(() => { delete process.env.ENABLE_CLOUD_ROUTING; });

    it('ENABLE_CLOUD_ROUTING=true → enabled', () => {
        process.env.ENABLE_CLOUD_ROUTING = 'true';
        expect(isCloudRoutingEnabled()).toBe(true);
    });

    it('ENABLE_CLOUD_ROUTING=false → disabled', () => {
        setCloudRouting(false);
        expect(isCloudRoutingEnabled()).toBe(false);
    });

    it('ENABLE_CLOUD_ROUTING not set → disabled', () => {
        delete process.env.ENABLE_CLOUD_ROUTING;
        expect(isCloudRoutingEnabled()).toBe(false);
    });
});

describe('model-router — routeTask() — Tier 1 & 2 (LOCAL)', () => {
    it('INTENT_TRANSLATION → LOCAL, qwen3:8b, temperature 0.0', () => {
        const result = routeTask('INTENT_TRANSLATION');
        expect(isRoutingDecision(result)).toBe(true);
        if (isRoutingDecision(result)) {
            expect(result.tier).toBe('LOCAL');
            expect(result.modelId).toBe(LOCAL_MODEL_ID);
            expect(result.temperature).toBe(0.0);
        }
    });

    it('EVENT_NARRATION → LOCAL, temperature 0.1', () => {
        const result = routeTask('EVENT_NARRATION');
        expect(isRoutingDecision(result)).toBe(true);
        if (isRoutingDecision(result)) {
            expect(result.tier).toBe('LOCAL');
            expect(result.temperature).toBe(0.1);
        }
    });

    it('CORRELATION_EXPLANATION → LOCAL', () => {
        const result = routeTask('CORRELATION_EXPLANATION');
        expect(isRoutingDecision(result)).toBe(true);
        if (isRoutingDecision(result)) {
            expect(result.tier).toBe('LOCAL');
        }
    });
});

describe('model-router — routeTask() — Tier 3 (CLOUD)', () => {
    afterEach(() => { delete process.env.ENABLE_CLOUD_ROUTING; });

    it('ADVANCED_SYNTHESIS + cloud enabled → CLOUD, qwen-max', () => {
        setCloudRouting(true);
        const result = routeTask('ADVANCED_SYNTHESIS');
        expect(isRoutingDecision(result)).toBe(true);
        if (isRoutingDecision(result)) {
            expect(result.tier).toBe('CLOUD');
            expect(result.modelId).toBe(CLOUD_MODEL_ID);
        }
    });

    it('STRATEGIC_SUMMARY + cloud enabled → CLOUD', () => {
        setCloudRouting(true);
        const result = routeTask('STRATEGIC_SUMMARY');
        expect(isRoutingDecision(result)).toBe(true);
        if (isRoutingDecision(result)) {
            expect(result.tier).toBe('CLOUD');
        }
    });

    it('ADVANCED_SYNTHESIS + cloud DISABLED → MODEL_UNAVAILABLE (no silent fallback)', () => {
        setCloudRouting(false);
        const result = routeTask('ADVANCED_SYNTHESIS');
        expect(isRoutingDecision(result)).toBe(false);
        if (!isRoutingDecision(result)) {
            expect(result.code).toBe('MODEL_UNAVAILABLE');
            expect(result.recoverable).toBe(true);  // User can retry when cloud is enabled
        }
    });

    it('STRATEGIC_SUMMARY + cloud DISABLED → MODEL_UNAVAILABLE', () => {
        delete process.env.ENABLE_CLOUD_ROUTING;
        const result = routeTask('STRATEGIC_SUMMARY');
        expect(isRoutingDecision(result)).toBe(false);
    });

    it('MODEL_UNAVAILABLE never silently routes to local', () => {
        setCloudRouting(false);
        const result = routeTask('ADVANCED_SYNTHESIS');
        if (!isRoutingDecision(result)) {
            // Must NOT be LOCAL — should be a rejection
            expect('tier' in result).toBe(false);
        }
    });
});

describe('model-router — routeTask() — UNSUPPORTED', () => {
    it('UNSUPPORTED → rejected with UNSUPPORTED_TASK code', () => {
        const result = routeTask('UNSUPPORTED');
        expect(isRoutingDecision(result)).toBe(false);
        if (!isRoutingDecision(result)) {
            expect(result.code).toBe('UNSUPPORTED_TASK');
            expect(result.recoverable).toBe(false);
        }
    });
});
