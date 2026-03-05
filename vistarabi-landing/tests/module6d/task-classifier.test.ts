// task-classifier.test.ts — Module 6D deterministic classifier tests
import { describe, it, expect } from 'vitest';
import { classifyReasoningTask, getUnsupportedReasoningMessage } from '../../src/lib/module-6/infrastructure/task-classifier';

describe('task-classifier — classifyReasoningTask()', () => {
    it('INTENT_TRANSLATION → valid', () => {
        expect(classifyReasoningTask('INTENT_TRANSLATION')).toBe('INTENT_TRANSLATION');
    });

    it('EVENT_NARRATION → valid', () => {
        expect(classifyReasoningTask('EVENT_NARRATION')).toBe('EVENT_NARRATION');
    });

    it('CORRELATION_EXPLANATION → valid', () => {
        expect(classifyReasoningTask('CORRELATION_EXPLANATION')).toBe('CORRELATION_EXPLANATION');
    });

    it('STRATEGIC_SUMMARY → valid', () => {
        expect(classifyReasoningTask('STRATEGIC_SUMMARY')).toBe('STRATEGIC_SUMMARY');
    });

    it('ADVANCED_SYNTHESIS with hasMultipleKPIs → valid', () => {
        expect(classifyReasoningTask('ADVANCED_SYNTHESIS', { hasMultipleKPIs: true })).toBe('ADVANCED_SYNTHESIS');
    });

    it('ADVANCED_SYNTHESIS without hasMultipleKPIs → UNSUPPORTED', () => {
        expect(classifyReasoningTask('ADVANCED_SYNTHESIS')).toBe('UNSUPPORTED');
    });

    it('ADVANCED_SYNTHESIS with hasMultipleKPIs=false → UNSUPPORTED', () => {
        expect(classifyReasoningTask('ADVANCED_SYNTHESIS', { hasMultipleKPIs: false })).toBe('UNSUPPORTED');
    });

    it('lowercase input is normalized → valid', () => {
        expect(classifyReasoningTask('event_narration')).toBe('EVENT_NARRATION');
    });

    it('unknown type → UNSUPPORTED', () => {
        expect(classifyReasoningTask('WHAT_DO_YOU_THINK')).toBe('UNSUPPORTED');
    });

    it('null → UNSUPPORTED', () => {
        expect(classifyReasoningTask(null)).toBe('UNSUPPORTED');
    });

    it('undefined → UNSUPPORTED', () => {
        expect(classifyReasoningTask(undefined)).toBe('UNSUPPORTED');
    });

    it('empty string → UNSUPPORTED', () => {
        expect(classifyReasoningTask('')).toBe('UNSUPPORTED');
    });

    it('free-form question → UNSUPPORTED', () => {
        expect(classifyReasoningTask('what do you think about my business?')).toBe('UNSUPPORTED');
    });
});

describe('task-classifier — getUnsupportedReasoningMessage()', () => {
    it('null → generic no-type message', () => {
        const msg = getUnsupportedReasoningMessage(null);
        expect(msg).toContain('No reasoning task type');
    });

    it('ADVANCED_SYNTHESIS without context → multi-KPI requirement message', () => {
        const msg = getUnsupportedReasoningMessage('ADVANCED_SYNTHESIS');
        expect(msg).toContain('multiple KPIs');
    });

    it('unknown type → mentions supported types', () => {
        const msg = getUnsupportedReasoningMessage('MAGIC_ANALYSIS');
        expect(msg).toContain('not a supported reasoning scope');
        expect(msg).toContain('STRATEGIC_SUMMARY');
    });
});
