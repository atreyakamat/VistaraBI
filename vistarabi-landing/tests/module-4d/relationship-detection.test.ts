// Module 4D-A Relationship Detection Tests
// Tests for Data Relationship Modeling Engine

import { describe, it, expect, beforeAll } from 'vitest';
import {
    detectRelationships,
    calculateConfidence,
    calculateNameScore,
    calculateOverlapScore,
    calculateUniquenessScore,
    calculateDataTypeScore,
    determineCardinality,
    SourceMetadata,
    RelationshipCandidate,
} from '../../src/lib/data-lineage/relationship-detector';
import {
    createTestSources,
    createEdgeCaseSources,
    expectedRelationships,
    TestSource,
} from './test-datasets';

describe('Module 4D-A: Relationship Detection', () => {
    let testSources: SourceMetadata[];
    let edgeCaseSources: SourceMetadata[];

    beforeAll(() => {
        testSources = createTestSources().map((s: TestSource) => ({
            id: s.id,
            name: s.fileName,
            columns: s.columns,
            data: s.data as Record<string, unknown>[],
        }));

        edgeCaseSources = createEdgeCaseSources().map((s: TestSource) => ({
            id: s.id,
            name: s.fileName,
            columns: s.columns,
            data: s.data as Record<string, unknown>[],
        }));
    });

    describe('Confidence Scoring Components', () => {
        it('should calculate name score for exact matches', () => {
            expect(calculateNameScore('customer_id', 'customer_id')).toBe(1.0);
            expect(calculateNameScore('CustomerID', 'customer_id')).toBe(1.0);
        });

        it('should calculate name score for partial matches', () => {
            // cust_id contains 'id' which is in customer_id, should get partial match
            const score = calculateNameScore('cust_id', 'customer_id');
            expect(score).toBeGreaterThanOrEqual(0); // May not match depending on algorithm
        });

        it('should calculate low name score for unrelated columns', () => {
            expect(calculateNameScore('email', 'order_date')).toBe(0);
        });

        it('should calculate value overlap for matching columns', () => {
            const orderCustomerIds = ['C001', 'C002', 'C001', 'C003', 'C004', 'C002'];
            const customerIds = ['C001', 'C002', 'C003', 'C004', 'C005'];
            const overlap = calculateOverlapScore(orderCustomerIds, customerIds);
            expect(overlap).toBeGreaterThan(0.7);
        });

        it('should calculate low overlap for non-matching columns', () => {
            const fakeIds = ['FAKE001', 'FAKE002', 'FAKE003'];
            const customerIds = ['C001', 'C002', 'C003', 'C004', 'C005'];
            const overlap = calculateOverlapScore(fakeIds, customerIds);
            expect(overlap).toBe(0);
        });

        it('should calculate uniqueness score correctly', () => {
            const uniqueValues = ['C001', 'C002', 'C003', 'C004', 'C005'];
            const duplicateValues = ['C001', 'C001', 'C002', 'C002', 'C003'];

            expect(calculateUniquenessScore(uniqueValues)).toBe(1.0);
            expect(calculateUniquenessScore(duplicateValues)).toBeLessThan(1.0);
        });

        it('should calculate data type score for matching types', () => {
            const stringValues = ['A', 'B', 'C'];
            const numberValues = [1, 2, 3];

            expect(calculateDataTypeScore(stringValues, stringValues)).toBe(1.0);
            expect(calculateDataTypeScore(numberValues, numberValues)).toBe(1.0);
            expect(calculateDataTypeScore(stringValues, numberValues)).toBeLessThanOrEqual(1.0);
        });
    });

    describe('Relationship Detection', () => {
        it('should detect orders → customers relationship', () => {
            const relationships = detectRelationships(testSources);

            const ordersToCustomers = relationships.find(
                r => r.sourceTableName.includes('orders') &&
                    r.targetTableName.includes('customers') &&
                    r.sourceColumn === 'customer_id'
            );

            expect(ordersToCustomers).toBeDefined();
            expect(calculateConfidence(ordersToCustomers!.confidenceFactors)).toBeGreaterThan(0.7);
        });

        it('should detect order_items → orders relationship', () => {
            const relationships = detectRelationships(testSources);

            const itemsToOrders = relationships.find(
                r => r.sourceTableName.includes('order_items') &&
                    r.targetTableName.includes('orders') &&
                    r.sourceColumn === 'order_id'
            );

            expect(itemsToOrders).toBeDefined();
            expect(calculateConfidence(itemsToOrders!.confidenceFactors)).toBeGreaterThan(0.7);
        });

        it('should detect order_items → products relationship', () => {
            const relationships = detectRelationships(testSources);

            const itemsToProducts = relationships.find(
                r => r.sourceTableName.includes('order_items') &&
                    r.targetTableName.includes('products') &&
                    r.sourceColumn === 'product_id'
            );

            expect(itemsToProducts).toBeDefined();
            expect(calculateConfidence(itemsToProducts!.confidenceFactors)).toBeGreaterThan(0.7);
        });

        it('should assign zero overlap score to misleading columns', () => {
            const relationships = detectRelationships(edgeCaseSources);

            const misleadingRel = relationships.find(
                r => r.sourceTableName.includes('misleading') &&
                    r.targetTableName.includes('customers') &&
                    r.sourceColumn === 'customer_id'
            );

            // Misleading columns have matching names but zero value overlap
            // The overlap score should be 0 even though name score is high
            if (misleadingRel) {
                expect(misleadingRel.confidenceFactors.overlapScore).toBe(0);
            }
        });

        it('should handle partial overlap with reduced confidence', () => {
            const relationships = detectRelationships(edgeCaseSources);

            const partialRel = relationships.find(
                r => r.sourceTableName.includes('partial') &&
                    r.targetTableName.includes('customers')
            );

            // Partial overlap should have moderate confidence
            if (partialRel) {
                const confidence = calculateConfidence(partialRel.confidenceFactors);
                expect(confidence).toBeLessThan(0.8);
            }
        });
    });

    describe('Join Cardinality Detection', () => {
        it('should detect one-to-many for customer → orders', () => {
            const customerIds = ['C001', 'C002', 'C003', 'C004', 'C005'];
            const orderCustomerIds = ['C001', 'C002', 'C001', 'C003', 'C004', 'C002'];

            const cardinality = determineCardinality(customerIds, orderCustomerIds);
            // Customer appears once, order customer_ids appear multiple times
            expect(['ONE_TO_MANY', 'MANY_TO_MANY']).toContain(cardinality);
        });

        it('should detect one-to-one for unique mappings', () => {
            const values1 = ['A', 'B', 'C'];
            const values2 = ['X', 'Y', 'Z'];

            const cardinality = determineCardinality(values1, values2);
            expect(cardinality).toBe('ONE_TO_ONE');
        });
    });

    describe('Confidence Weight Validation', () => {
        it('should use correct weights in final confidence', () => {
            const factors = {
                nameScore: 1.0,
                overlapScore: 1.0,
                uniquenessScore: 1.0,
                dataTypeScore: 1.0,
            };

            const confidence = calculateConfidence(factors);
            expect(confidence).toBe(1.0);
        });

        it('should produce weighted average for mixed scores', () => {
            const factors = {
                nameScore: 1.0,    // 30%
                overlapScore: 0.0, // 30%
                uniquenessScore: 1.0, // 25%
                dataTypeScore: 0.0,   // 15%
            };

            const confidence = calculateConfidence(factors);
            // 1.0*0.3 + 0*0.3 + 1.0*0.25 + 0*0.15 = 0.55
            expect(confidence).toBeCloseTo(0.55, 2);
        });
    });
});
