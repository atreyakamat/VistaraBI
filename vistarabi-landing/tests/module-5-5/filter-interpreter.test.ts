// Module 5.5 — Filter Interpreter Tests
// Covers all 7 expression categories × happy path + edge cases + error cases
// Pure unit tests: no DB, no network.

import { describe, it, expect } from 'vitest';
import { parseBusinessFilter, normalizeFilters } from '../../src/lib/dashboard-state/filter-interpreter';
import { FilterValidationError } from '../../src/lib/dashboard-state/types';
import type { NormalizedDateFilter, NormalizedRankFilter, NormalizedValueFilter, NormalizedCategoryFilter } from '../../src/lib/dashboard-state/types';

// Reference: 2025-03-15 (Saturday)
const REF_DATE = new Date('2025-03-15T00:00:00.000Z');
const cfg = { fiscalYearConvention: 'april_march' as const, referenceDate: REF_DATE };

// ─── Fiscal Year ──────────────────────────────────────────────────────────────

describe('Filter Interpreter — Fiscal Year (April–March)', () => {

    it('FY2025 → April 2024 – March 2025', () => {
        const f = parseBusinessFilter('FY2025', cfg) as NormalizedDateFilter;
        expect(f.type).toBe('date_range');
        expect(f.from).toBe('2024-04-01');
        expect(f.to).toBe('2025-03-31');
        expect(f.label).toBe('FY2025');
    });

    it('FY2024 → April 2023 – March 2024', () => {
        const f = parseBusinessFilter('FY2024', cfg) as NormalizedDateFilter;
        expect(f.from).toBe('2023-04-01');
        expect(f.to).toBe('2024-03-31');
    });

    it('Case insensitive: fy2025 parses correctly', () => {
        const f = parseBusinessFilter('fy2025', cfg) as NormalizedDateFilter;
        expect(f.from).toBe('2024-04-01');
    });

    it('FY2025 with January–December convention', () => {
        const f = parseBusinessFilter('FY2025', { ...cfg, fiscalYearConvention: 'january_december' }) as NormalizedDateFilter;
        expect(f.from).toBe('2025-01-01');
        expect(f.to).toBe('2025-12-31');
    });

    it('FY2024-25 variant parses as FY2024', () => {
        const f = parseBusinessFilter('FY2024-25', cfg) as NormalizedDateFilter;
        expect(f.from).toBe('2023-04-01');
    });

});

// ─── Quarters ─────────────────────────────────────────────────────────────────

describe('Filter Interpreter — Quarters', () => {

    it('Q1 → Jan 1 – Mar 31 of current year', () => {
        const f = parseBusinessFilter('Q1', cfg) as NormalizedDateFilter;
        expect(f.from).toBe('2025-01-01');
        expect(f.to).toBe('2025-03-31');
        expect(f.label).toBe('Q1 2025');
    });

    it('Q3 2024 → Jul 1 – Sep 30 2024', () => {
        const f = parseBusinessFilter('Q3 2024', cfg) as NormalizedDateFilter;
        expect(f.from).toBe('2024-07-01');
        expect(f.to).toBe('2024-09-30');
    });

    it('Q4 2025 → Oct 1 – Dec 31 2025', () => {
        const f = parseBusinessFilter('Q4 2025', cfg) as NormalizedDateFilter;
        expect(f.from).toBe('2025-10-01');
        expect(f.to).toBe('2025-12-31');
    });

    it('Q2-2023 (hyphen format) → Apr 1 – Jun 30 2023', () => {
        const f = parseBusinessFilter('Q2-2023', cfg) as NormalizedDateFilter;
        expect(f.from).toBe('2023-04-01');
        expect(f.to).toBe('2023-06-30');
    });

});

// ─── Relative Dates ───────────────────────────────────────────────────────────

describe('Filter Interpreter — Relative Dates', () => {

    it('Last 7 days from 2025-03-15 → 2025-03-08 to 2025-03-15', () => {
        const f = parseBusinessFilter('Last 7 days', cfg) as NormalizedDateFilter;
        expect(f.to).toBe('2025-03-15');
        expect(f.from).toBe('2025-03-08');
    });

    it('Last 30 days → 30 days before ref', () => {
        const f = parseBusinessFilter('Last 30 days', cfg) as NormalizedDateFilter;
        expect(f.to).toBe('2025-03-15');
        expect(f.from).toBe('2025-02-13');
    });

    it('Last 3 months → earlier month', () => {
        const f = parseBusinessFilter('Last 3 months', cfg) as NormalizedDateFilter;
        expect(f.to).toBe('2025-03-15');
        expect(f.from).toBe('2024-12-15');
    });

    it('Last 1 year', () => {
        const f = parseBusinessFilter('Last 1 year', cfg) as NormalizedDateFilter;
        expect(f.from).toBe('2024-03-15');
    });

    it('This month → 2025-03-01 to 2025-03-31', () => {
        const f = parseBusinessFilter('This month', cfg) as NormalizedDateFilter;
        expect(f.from).toBe('2025-03-01');
        expect(f.to).toBe('2025-03-31');
    });

    it('This quarter (Q1) → 2025-01-01 to 2025-03-31', () => {
        const f = parseBusinessFilter('This quarter', cfg) as NormalizedDateFilter;
        expect(f.from).toBe('2025-01-01');
        expect(f.to).toBe('2025-03-31');
    });

    it('This year → 2025-01-01 to 2025-12-31', () => {
        const f = parseBusinessFilter('This year', cfg) as NormalizedDateFilter;
        expect(f.from).toBe('2025-01-01');
        expect(f.to).toBe('2025-12-31');
    });

    it('Last 90 days label is human-readable', () => {
        const f = parseBusinessFilter('Last 90 days', cfg);
        expect(f.label).toBe('Last 90 days');
    });

});

// ─── Rank Filters ─────────────────────────────────────────────────────────────

describe('Filter Interpreter — Rank Filters', () => {

    it('Top 5 products → rank filter, limit=5, desc', () => {
        const f = parseBusinessFilter('Top 5 products', cfg) as NormalizedRankFilter;
        expect(f.type).toBe('rank');
        expect(f.limit).toBe(5);
        expect(f.orderDir).toBe('desc');
    });

    it('Top 10 by revenue → column=revenue, limit=10', () => {
        const f = parseBusinessFilter('Top 10 by revenue', cfg) as NormalizedRankFilter;
        expect(f.column).toBe('revenue');
        expect(f.limit).toBe(10);
    });

    it('Bottom 3 → orderDir=asc, limit=3', () => {
        const f = parseBusinessFilter('Bottom 3 customers', cfg) as NormalizedRankFilter;
        expect(f.orderDir).toBe('asc');
        expect(f.limit).toBe(3);
    });

});

// ─── Value Comparisons ────────────────────────────────────────────────────────

describe('Filter Interpreter — Value Comparisons', () => {

    it('Revenue > 10000 → value filter, column=revenue, gt, 10000', () => {
        const f = parseBusinessFilter('Revenue > 10000', cfg) as NormalizedValueFilter;
        expect(f.type).toBe('value');
        expect(f.column).toBe('revenue');
        expect(f.operator).toBe('gt');
        expect(f.value).toBe(10000);
    });

    it('quantity <= 50 → lte, 50', () => {
        const f = parseBusinessFilter('quantity <= 50', cfg) as NormalizedValueFilter;
        expect(f.operator).toBe('lte');
        expect(f.value).toBe(50);
    });

    it('status = active → string value', () => {
        const f = parseBusinessFilter('status = active', cfg) as NormalizedValueFilter;
        expect(f.value).toBe('active');
        expect(f.operator).toBe('eq');
    });

    it('price != 0 → neq, zero', () => {
        const f = parseBusinessFilter('price != 0', cfg) as NormalizedValueFilter;
        expect(f.operator).toBe('neq');
        expect(f.value).toBe(0);
    });

});

// ─── Category Filters ─────────────────────────────────────────────────────────

describe('Filter Interpreter — Category Filters', () => {

    it('category: Electronics, Clothing → two values', () => {
        const f = parseBusinessFilter('category: Electronics, Clothing', cfg) as NormalizedCategoryFilter;
        expect(f.type).toBe('category');
        expect(f.values).toHaveLength(2);
        expect(f.values).toContain('Electronics');
        expect(f.values).toContain('Clothing');
    });

    it('region: North → single value', () => {
        const f = parseBusinessFilter('region: North', cfg) as NormalizedCategoryFilter;
        expect(f.values).toEqual(['North']);
    });

});

// ─── Error Cases ──────────────────────────────────────────────────────────────

describe('Filter Interpreter — Error Cases', () => {

    it('Throws FilterValidationError for unrecognized expression', () => {
        expect(() => parseBusinessFilter('gibberish nonsense ??? !!', cfg))
            .toThrow(FilterValidationError);
    });

    it('normalizeFilters skips empty strings', () => {
        const result = normalizeFilters(['', '  ', 'FY2025'], cfg);
        expect(result).toHaveLength(1);
        expect(result[0].label).toBe('FY2025');
    });

    it('normalizeFilters throws aggregate error if any fail', () => {
        expect(() => normalizeFilters(['FY2025', 'INVALID???'], cfg))
            .toThrow(FilterValidationError);
    });

});
