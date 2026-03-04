import { describe, it, expect } from 'vitest';
import { classifySynthesisTask, getUnsupportedScopeMessage } from '../../src/lib/module-6e/synthesis-classifier';

describe('synthesis-classifier — classifySynthesisTask()', () => {
    it('1 event, 0 correlations → SINGLE_PACKET_SUMMARY', () => {
        expect(classifySynthesisTask(1, 0)).toBe('SINGLE_PACKET_SUMMARY');
    });

    it('0 events, 1 correlation → SINGLE_PACKET_SUMMARY', () => {
        expect(classifySynthesisTask(0, 1)).toBe('SINGLE_PACKET_SUMMARY');
    });

    it('2 events → MULTI_PACKET_SYNTHESIS', () => {
        expect(classifySynthesisTask(2, 0)).toBe('MULTI_PACKET_SYNTHESIS');
    });

    it('0 events, 2 correlations → CORRELATION_CLUSTER_ANALYSIS', () => {
        expect(classifySynthesisTask(0, 2)).toBe('CORRELATION_CLUSTER_ANALYSIS');
    });

    it('2 events + 1 correlation → STRATEGIC_FINANCIAL_OVERVIEW', () => {
        expect(classifySynthesisTask(2, 1)).toBe('STRATEGIC_FINANCIAL_OVERVIEW');
    });

    it('3 events + 2 correlations → STRATEGIC_FINANCIAL_OVERVIEW', () => {
        expect(classifySynthesisTask(3, 2)).toBe('STRATEGIC_FINANCIAL_OVERVIEW');
    });

    it('risk keyword → RISK_SIGNAL_SYNTHESIS', () => {
        expect(classifySynthesisTask(1, 0, 'what is the risk exposure here?')).toBe('RISK_SIGNAL_SYNTHESIS');
    });

    it('volatility keyword → RISK_SIGNAL_SYNTHESIS', () => {
        expect(classifySynthesisTask(1, 1, 'is there volatility concern?')).toBe('RISK_SIGNAL_SYNTHESIS');
    });

    it('0 packets → UNSUPPORTED_SCOPE', () => {
        expect(classifySynthesisTask(0, 0)).toBe('UNSUPPORTED_SCOPE');
    });

    it('predict keyword → UNSUPPORTED_SCOPE (speculation)', () => {
        expect(classifySynthesisTask(3, 2, 'predict what will happen next quarter')).toBe('UNSUPPORTED_SCOPE');
    });

    it('forecast keyword → UNSUPPORTED_SCOPE', () => {
        expect(classifySynthesisTask(1, 1, 'can you forecast revenue?')).toBe('UNSUPPORTED_SCOPE');
    });

    it('future keyword → UNSUPPORTED_SCOPE', () => {
        expect(classifySynthesisTask(2, 1, 'what will the future hold?')).toBe('UNSUPPORTED_SCOPE');
    });

    it('speculation check happens before risk check', () => {
        expect(classifySynthesisTask(2, 1, 'predict the risk for next year')).toBe('UNSUPPORTED_SCOPE');
    });
});

describe('synthesis-classifier — getUnsupportedScopeMessage()', () => {
    it('speculation → mentions predictions/forecasts', () => {
        const msg = getUnsupportedScopeMessage('predict something');
        expect(msg).toContain('forward-looking');
    });

    it('no intent → mentions no packets', () => {
        const msg = getUnsupportedScopeMessage();
        expect(msg).toContain('No evidence packets');
    });
});
