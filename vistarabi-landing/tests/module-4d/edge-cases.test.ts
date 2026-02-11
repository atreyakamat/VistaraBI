// Module 4D-B Edge Case Tests
// Tests for robust KPI lineage handling under difficult conditions

import { describe, it, expect, beforeAll } from 'vitest';
import {
    parseAggregations,
    extractColumnsFromFormula,
    findSourceForColumn,
    findJoinPaths,
    traceKPILineage,
} from '../../src/lib/data-lineage/kpi-lineage-registry';
import {
    RelationshipEntry,
} from '../../src/lib/prisma';

// Mock data for edge cases
const mockSources = [
    { id: 'src-1', name: 'orders.csv', columns: ['order_id', 'user_id', 'amount', 'status'] },
    { id: 'src-2', name: 'users.csv', columns: ['user_id', 'name', 'country'] },
    { id: 'src-3', name: 'payments.csv', columns: ['payment_id', 'order_id', 'amount', 'status'] },
];

const mockRelationships: RelationshipEntry[] = [
    {
        id: 'rel-1',
        projectId: 'proj-1',
        sourceTableId: 'src-1',
        sourceTableName: 'orders.csv',
        sourceColumn: 'user_id',
        targetTableId: 'src-2',
        targetTableName: 'users.csv',
        targetColumn: 'user_id',
        confidence: 0.9,
        relationshipType: 'FOREIGN_KEY',
        cardinality: 'MANY_TO_ONE',
        detectionMethod: 'COMPOSITE',
        confidenceFactors: { nameScore: 1, overlapScore: 1, uniquenessScore: 1, dataTypeScore: 1 },
        isAiValidated: false,
        createdAt: new Date(),
    },
    // Ambiguous relationship: payments -> orders via order_id
    {
        id: 'rel-2',
        projectId: 'proj-1',
        sourceTableId: 'src-3',
        sourceTableName: 'payments.csv',
        sourceColumn: 'order_id',
        targetTableId: 'src-1',
        targetTableName: 'orders.csv',
        targetColumn: 'order_id',
        confidence: 0.95,
        relationshipType: 'FOREIGN_KEY',
        cardinality: 'ONE_TO_ONE',
        detectionMethod: 'COMPOSITE',
        confidenceFactors: { nameScore: 1, overlapScore: 1, uniquenessScore: 1, dataTypeScore: 1 },
        isAiValidated: false,
        createdAt: new Date(),
    },
    // Ambiguous relationship: payments -> orders via amount (wrong but possible)
    {
        id: 'rel-3',
        projectId: 'proj-1',
        sourceTableId: 'src-3',
        sourceTableName: 'payments.csv',
        sourceColumn: 'amount',
        targetTableId: 'src-1',
        targetTableName: 'orders.csv',
        targetColumn: 'amount',
        confidence: 0.4, // Low confidence
        relationshipType: 'LOOKUP',
        cardinality: 'MANY_TO_MANY',
        detectionMethod: 'VALUE_OVERLAP',
        confidenceFactors: { nameScore: 1, overlapScore: 0.4, uniquenessScore: 0, dataTypeScore: 1 },
        isAiValidated: false,
        createdAt: new Date(),
    },
];

describe('Module 4D-B Edge Cases', () => {

    describe('Formula Parsing Robustness', () => {
        it('should handle formula with no aggregations', () => {
            const formula = 'amount * 0.1'; // Simple calculation
            const cols = extractColumnsFromFormula(formula);
            expect(cols).toContain('amount');
        });

        it('should handle formula with complex whitespace', () => {
            const formula = 'SUM(  amount  ) /   COUNT(  DISTINCT   user_id  )';
            const cols = extractColumnsFromFormula(formula);
            expect(cols).toContain('amount');
            expect(cols).toContain('user_id');
        });

        it('should handle division by zero or empty formula gracefuly', () => {
            const formula = '';
            const cols = extractColumnsFromFormula(formula);
            expect(cols).toHaveLength(0);
        });

        it('should handle nested parentheses', () => {
            const formula = '(SUM(amount) + SUM(tax)) / 2';
            const cols = extractColumnsFromFormula(formula);
            expect(cols).toContain('amount');
            expect(cols).toContain('tax');
        });
    });

    describe('Ambiguous Join Handling', () => {
        it('should prioritize higher confidence relationship', () => {
            // Finding path between payments and orders
            // Should pick rel-2 (order_id, 0.95) over rel-3 (amount, 0.4)
            const paths = findJoinPaths(['src-3', 'src-1'], mockRelationships);

            expect(paths).toHaveLength(1);
            expect(paths[0].relationshipId).toBe('rel-2');
            expect(paths[0].sourceColumn).toBe('order_id');
        });

        it('should handle self-referencing joins gracefully', () => {
            // Path from orders to orders (should be empty)
            const paths = findJoinPaths(['src-1', 'src-1'], mockRelationships);
            expect(paths).toHaveLength(0);
        });
    });

    describe('Missing or Invalid Columns', () => {
        it('should return null source for non-existent column', () => {
            const result = findSourceForColumn('non_existent_col', mockSources);
            expect(result).toBeNull();
        });

        it('should identify correct source even with case mismatch', () => {
            const result = findSourceForColumn('ORDER_ID', mockSources);
            expect(result).not.toBeNull();
            expect(result?.sourceId).toBe('src-1');
        });
    });

    describe('Complex Aggregation Parsing', () => {
        it('should parse multiple aggregations in one formula', () => {
            const formula = 'SUM(amount) - AVG(cost)';
            const colMap = new Map([['amount', 'src-1'], ['cost', 'src-1']]);

            const aggs = parseAggregations(formula, colMap);
            expect(aggs).toHaveLength(2);
            expect(aggs.find(a => a.function === 'SUM')).toBeDefined();
            expect(aggs.find(a => a.function === 'AVG')).toBeDefined();
        });

        it('should parse COUNT DISTINCT correctly', () => {
            const formula = 'COUNT(DISTINCT user_id)';
            const colMap = new Map([['user_id', 'src-1']]);

            const aggs = parseAggregations(formula, colMap);
            expect(aggs).toHaveLength(1);
            expect(aggs[0].function).toBe('COUNT_DISTINCT');
            expect(aggs[0].column).toBe('user_id');
        });
    });

});
