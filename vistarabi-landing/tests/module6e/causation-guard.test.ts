import { describe, it, expect } from 'vitest';
import { checkCausation } from '../../src/lib/module-6e/causation-guard';

describe('causation-guard — checkCausation()', () => {
    it('clean text → passes', () => {
        const r = checkCausation('Revenue and Orders show a strong positive association with r = 0.78.');
        expect(r.passed).toBe(true);
    });

    it('"caused" → fails', () => {
        const r = checkCausation('Revenue increase caused higher orders.');
        expect(r.passed).toBe(false);
        expect(r.violatingPhrase).toBe('caused');
    });

    it('"causes" → fails', () => {
        const r = checkCausation('Marketing spend causes revenue growth.');
        expect(r.passed).toBe(false);
    });

    it('"drives" → fails', () => {
        const r = checkCausation('Demand drives revenue higher.');
        expect(r.passed).toBe(false);
        expect(r.violatingPhrase).toBe('drives');
    });

    it('"driven by" → fails', () => {
        const r = checkCausation('Revenue growth was driven by demand.');
        expect(r.passed).toBe(false);
    });

    it('"leads to" → fails', () => {
        const r = checkCausation('This trend leads to increased margins.');
        expect(r.passed).toBe(false);
        expect(r.violatingPhrase).toBe('leads to');
    });

    it('"results in" → fails', () => {
        const r = checkCausation('This pattern results in lower costs.');
        expect(r.passed).toBe(false);
    });

    it('"impacts" → fails', () => {
        const r = checkCausation('Marketing spend impacts revenue.');
        expect(r.passed).toBe(false);
    });

    it('"triggers" → fails', () => {
        const r = checkCausation('This event triggers a cascade.');
        expect(r.passed).toBe(false);
    });

    it('"influences" → fails', () => {
        const r = checkCausation('Demand influences pricing.');
        expect(r.passed).toBe(false);
    });

    it('"effect on" → fails', () => {
        const r = checkCausation('It has a strong effect on orders.');
        expect(r.passed).toBe(false);
    });

    it('"determines" → fails', () => {
        const r = checkCausation('Revenue determines profitability.');
        expect(r.passed).toBe(false);
    });

    it('safe words: correlated, associated, observed → passes', () => {
        const r = checkCausation('Revenue is correlated with demand. An associated pattern was observed.');
        expect(r.passed).toBe(true);
    });

    it('empty string → passes', () => {
        expect(checkCausation('').passed).toBe(true);
    });
});
