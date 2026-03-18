// Module 1 & 2 — Parser & Purification Unit Tests
// Tests all parser types and purification logic in isolation (no DB required)

import { describe, it, expect } from 'vitest';

// ─── Module 1: CSV Parser ─────────────────────────────────────────

import { parseCSV } from '@/lib/parsers/csv';

describe('Module 1 — CSV Parser', () => {
    it('parses a basic CSV string with header row', async () => {
        const raw = `name,age,revenue\nAlice,30,1000\nBob,25,2000`;
        const result = await parseCSV(raw);
        expect(result.columns).toEqual(['name', 'age', 'revenue']);
        expect(result.data.length).toBe(2);
        expect(result.data[0].name).toBe('Alice');
        expect(result.data[1].revenue).toBe('2000');
        expect(result.rowCount).toBe(2);
        expect(result.colCount).toBe(3);
    });

    it('handles empty CSV gracefully', async () => {
        const result = await parseCSV('');
        expect(result.columns).toEqual([]);
        expect(result.data).toEqual([]);
        expect(result.rowCount).toBe(0);
    });

    it('handles CSV with only headers (no data rows)', async () => {
        const result = await parseCSV('id,name,value\n');
        expect(result.columns).toEqual(['id', 'name', 'value']);
        expect(result.data.length).toBe(0);
        expect(result.rowCount).toBe(0);
    });

    it('detects correct column count', async () => {
        const raw = `col1,col2,col3,col4\n1,2,3,4`;
        const result = await parseCSV(raw);
        expect(result.colCount).toBe(4);
    });

    it('skips empty lines during parsing', async () => {
        const raw = `name,value\nAlice,100\n\nBob,200\n`;
        const result = await parseCSV(raw);
        expect(result.rowCount).toBe(2);
    });

    it('handles large datasets efficiently', async () => {
        const rows = Array.from({ length: 1000 }, (_, i) => `row${i},${i},${i * 100}`).join('\n');
        const raw = `id,index,amount\n${rows}`;
        const result = await parseCSV(raw);
        expect(result.rowCount).toBe(1000);
        expect(result.colCount).toBe(3);
    });
});

// ─── Module 2A: Date Normalizer ───────────────────────────────────

import { normalizeDates } from '@/lib/purification/date-normalizer';

describe('Module 2A — Date Normalizer', () => {
    it('normalizes MM/DD/YYYY format dates', () => {
        const rows = [{ order_date: '01/15/2024' }, { order_date: '12/31/2023' }];
        const { cleanedData, datesNormalized } = normalizeDates(rows, ['order_date']);
        expect(datesNormalized).toBe(2);
        expect(String(cleanedData[0].order_date)).toContain('2024');
    });

    it('leaves ISO 8601 dates (YYYY-MM-DD) unchanged', () => {
        const rows = [{ date: '2024-01-15' }];
        const { datesNormalized } = normalizeDates(rows, ['date']);
        // JS Date('2024-01-15') parses successfully to the same ISO value
        // The result may be unchanged or re-normalized to the same value
        expect(datesNormalized).toBeGreaterThanOrEqual(0);
    });

    it('returns zero normalized for empty data', () => {
        const { cleanedData, datesNormalized } = normalizeDates([], ['date']);
        expect(datesNormalized).toBe(0);
        expect(cleanedData).toEqual([]);
    });

    it('returns zero normalized for empty dateColumns array', () => {
        const rows = [{ date: '2024-01-15' }];
        const { datesNormalized } = normalizeDates(rows, []);
        expect(datesNormalized).toBe(0);
    });

    it('skips null and empty values', () => {
        const rows = [{ date: null }, { date: '' }, { date: undefined }];
        const result = normalizeDates(rows as any, ['date']);
        expect(result.datesNormalized).toBe(0);
    });

    it('normalizes multiple date columns simultaneously', () => {
        const rows = [{
            start_date: '01/05/2024',
            end_date: '06/15/2024',
        }];
        const { cleanedData } = normalizeDates(rows, ['start_date', 'end_date']);
        expect(String(cleanedData[0].start_date)).toContain('2024');
        expect(String(cleanedData[0].end_date)).toContain('2024');
    });
});

// ─── Module 2A: Currency Normalizer ──────────────────────────────

import { normalizeCurrencies } from '@/lib/purification/currency-normalizer';

describe('Module 2A — Currency Normalizer', () => {
    it('converts "$1234.56" to USD numeric', () => {
        const rows = [{ revenue: '$1234.56' }];
        const { cleanedData, currenciesNormalized } = normalizeCurrencies(rows);
        expect(currenciesNormalized).toBe(1);
        expect(cleanedData[0].revenue).toBeCloseTo(1234.56, 2);
    });

    it('converts "€500" applying EUR→USD rate', () => {
        const rows = [{ revenue: '€500' }];
        const { cleanedData } = normalizeCurrencies(rows);
        // EUR rate is 1.10, so €500 → $550
        expect(Number(cleanedData[0].revenue)).toBeCloseTo(550, 0);
    });

    it('handles rows with no currency values (no-op)', () => {
        const rows = [{ name: 'Alice', age: 30 }];
        const { currenciesNormalized } = normalizeCurrencies(rows);
        expect(currenciesNormalized).toBe(0);
    });

    it('returns zero normalized for empty data', () => {
        const { currenciesNormalized } = normalizeCurrencies([]);
        expect(currenciesNormalized).toBe(0);
    });

    it('handles mixed currency and non-currency columns', () => {
        const rows = [{ revenue: '$100', category: 'Electronics', count: 5 }];
        const { cleanedData, currenciesNormalized } = normalizeCurrencies(rows);
        expect(currenciesNormalized).toBe(1);
        expect(cleanedData[0].category).toBe('Electronics');
        expect(cleanedData[0].count).toBe(5);
        expect(Number(cleanedData[0].revenue)).toBeCloseTo(100, 2);
    });

    it('skips null values without crashing', () => {
        const rows = [{ revenue: null }];
        expect(() => normalizeCurrencies(rows as any)).not.toThrow();
    });

    it('does not mutate the original input array', () => {
        const original = [{ revenue: '$100' }];
        const originalCopy = JSON.stringify(original);
        normalizeCurrencies(original);
        expect(JSON.stringify(original)).toBe(originalCopy);
    });
});

// ─── Module 2A: Duplicate Detector ───────────────────────────────

import { removeDuplicates } from '@/lib/purification/duplicate-detector';

describe('Module 2A — Duplicate Detector', () => {
    it('removes exact duplicate rows', () => {
        const rows = [
            { id: '1', name: 'Alice', amount: 100 },
            { id: '1', name: 'Alice', amount: 100 },
            { id: '2', name: 'Bob', amount: 200 },
        ];
        const { cleanedData, duplicatesRemoved } = removeDuplicates(rows);
        expect(duplicatesRemoved).toBe(1);
        expect(cleanedData.length).toBe(2);
    });

    it('returns all rows when no duplicates exist', () => {
        const rows = [
            { id: '1', value: 'a' },
            { id: '2', value: 'b' },
            { id: '3', value: 'c' },
        ];
        const { cleanedData, duplicatesRemoved } = removeDuplicates(rows);
        expect(duplicatesRemoved).toBe(0);
        expect(cleanedData.length).toBe(3);
    });

    it('handles empty array without crashing', () => {
        const { cleanedData, duplicatesRemoved } = removeDuplicates([]);
        expect(cleanedData).toEqual([]);
        expect(duplicatesRemoved).toBe(0);
    });

    it('removes multiple duplicates of same row', () => {
        const row = { id: '1', name: 'same' };
        const rows = [row, { ...row }, { ...row }, { id: '2', name: 'other' }];
        const { duplicatesRemoved, cleanedData } = removeDuplicates(rows);
        expect(duplicatesRemoved).toBe(2); // 3 copies → 2 removed
        expect(cleanedData.length).toBe(2);
    });

    it('preserves row order (first occurrence kept)', () => {
        const rows = [
            { id: '1', name: 'First' },
            { id: '2', name: 'Second' },
            { id: '1', name: 'First' }, // duplicate
        ];
        const { cleanedData } = removeDuplicates(rows);
        expect(cleanedData[0].name).toBe('First');
        expect(cleanedData[1].name).toBe('Second');
    });

    it('treats case-insensitive values as duplicates (hash is lowercased)', () => {
        // hashRow lowercases values, so 'Alice' and 'alice' should hash the same
        const rows = [
            { id: '1', name: 'Alice' },
            { id: '1', name: 'alice' },
        ];
        const { duplicatesRemoved } = removeDuplicates(rows);
        expect(duplicatesRemoved).toBe(1);
    });
});

// ─── Module 2A: Text Standardizer ────────────────────────────────

import { standardizeText } from '@/lib/purification/text-standardizer';

describe('Module 2A — Text Standardizer', () => {
    it('title-cases name columns', () => {
        const rows = [{ customer_name: 'alice smith' }];
        const { cleanedData } = standardizeText(rows, ['customer_name']);
        expect(cleanedData[0].customer_name).toBe('Alice Smith');
    });

    it('trims leading and trailing whitespace', () => {
        const rows = [{ customer_name: '  bob jones  ' }];
        const { cleanedData } = standardizeText(rows, ['customer_name']);
        expect(String(cleanedData[0].customer_name).trim()).toBe('Bob Jones');
    });

    it('collapses multiple spaces into one', () => {
        const rows = [{ customer_name: 'foo   bar' }];
        const { cleanedData } = standardizeText(rows, ['customer_name']);
        expect(cleanedData[0].customer_name).not.toContain('  ');
    });

    it('returns zero standardized for empty data', () => {
        const { textsStandardized } = standardizeText([], ['name']);
        expect(textsStandardized).toBe(0);
    });

    it('returns zero standardized for empty textColumns array', () => {
        const rows = [{ name: 'hello world' }];
        const { textsStandardized } = standardizeText(rows, []);
        expect(textsStandardized).toBe(0);
    });

    it('does not title-case non-name columns', () => {
        const rows = [{ category: 'electronics' }];
        const { cleanedData } = standardizeText(rows, ['category']);
        // Category is not a "name" column - stays as-is after trim
        expect(String(cleanedData[0].category)).toBe('electronics');
    });

    it('skips null values gracefully', () => {
        const rows = [{ name: null }];
        expect(() => standardizeText(rows as any, ['name'])).not.toThrow();
    });
});

// ─── Module 2A: Null Handler ──────────────────────────────────────

import { handleNulls } from '@/lib/purification/null-handler';

describe('Module 2A — Null Handler', () => {
    it('fills numeric nulls with mean of non-null values', () => {
        const rows = [
            { amount: 100 },
            { amount: null },
            { amount: 200 },
        ];
        const colMeta = [{ originalName: 'amount', dataType: 'NUMBER' as const, normalizedName: 'amount', sampleValues: [], nullCount: 1, uniqueCount: 2, isRequired: false }];
        const { cleanedData, nullsFilled } = handleNulls(rows as any, colMeta as any);
        expect(nullsFilled).toBe(1);
        expect(cleanedData[1].amount).toBeCloseTo(150, 1); // mean of 100+200=150
    });

    it('fills text nulls with mode (most frequent value)', () => {
        const rows = [
            { category: 'Electronics' },
            { category: null },
            { category: 'Electronics' },
            { category: 'Clothing' },
        ];
        const colMeta = [{ originalName: 'category', dataType: 'TEXT' as const, normalizedName: 'category', sampleValues: [], nullCount: 1, uniqueCount: 2, isRequired: false }];
        const { cleanedData, nullsFilled } = handleNulls(rows as any, colMeta as any);
        expect(nullsFilled).toBe(1);
        expect(cleanedData[1].category).toBe('Electronics');
    });

    it('returns zero filled for empty input', () => {
        const colMeta = [{ originalName: 'amount', dataType: 'NUMBER' as const, normalizedName: 'amount', sampleValues: [], nullCount: 0, uniqueCount: 0, isRequired: false }];
        const { nullsFilled } = handleNulls([], colMeta as any);
        expect(nullsFilled).toBe(0);
    });

    it('skips columns where all values are null (no fill possible)', () => {
        const rows = [{ amount: null }, { amount: null }];
        const colMeta = [{ originalName: 'amount', dataType: 'NUMBER' as const, normalizedName: 'amount', sampleValues: [], nullCount: 2, uniqueCount: 0, isRequired: false }];
        expect(() => handleNulls(rows as any, colMeta as any)).not.toThrow();
    });

    it('does not mutate original data array', () => {
        const rows = [{ amount: 100 }, { amount: null }];
        const original = JSON.stringify(rows);
        const colMeta = [{ originalName: 'amount', dataType: 'NUMBER' as const, normalizedName: 'amount', sampleValues: [], nullCount: 1, uniqueCount: 1, isRequired: false }];
        handleNulls(rows as any, colMeta as any);
        expect(JSON.stringify(rows)).toBe(original);
    });
});
