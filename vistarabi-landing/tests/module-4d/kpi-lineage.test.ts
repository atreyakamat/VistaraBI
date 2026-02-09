// Module 4D-B KPI Lineage Tests
// Tests for KPI Lineage & Explainability Engine

import { describe, it, expect, beforeAll } from 'vitest';
import {
    generateTechnicalExplanation,
    generateBusinessExplanation,
    generateQuickExplanation,
    ExplanationContext,
} from '../../src/lib/data-lineage/explanation-generator';
import { testKPIs, TestKPI } from './test-datasets';

describe('Module 4D-B: KPI Lineage & Explainability', () => {

    describe('Technical Explanation Generation', () => {
        it('should generate technical explanation for SUM aggregation', () => {
            const context: ExplanationContext = {
                kpiName: 'Total Revenue',
                formula: 'SUM(total_amount)',
                domain: 'Financial',
                category: 'Financial',
                sources: [
                    { sourceId: 'src-orders', sourceName: 'orders.csv', columns: ['total_amount'], role: 'AGGREGATED' }
                ],
                joins: [],
                aggregations: [
                    { function: 'SUM', column: 'total_amount', sourceId: 'src-orders' }
                ],
            };

            const explanation = generateTechnicalExplanation(context);

            expect(explanation).toContain('SUM');
            expect(explanation).toContain('total_amount');
            expect(explanation).toContain('orders');
            expect(explanation).toContain('Formula:');
        });

        it('should generate technical explanation for AVG aggregation', () => {
            const context: ExplanationContext = {
                kpiName: 'Average Order Value',
                formula: 'AVG(total_amount)',
                domain: 'Financial',
                category: 'Financial',
                sources: [
                    { sourceId: 'src-orders', sourceName: 'orders.csv', columns: ['total_amount'], role: 'AGGREGATED' }
                ],
                joins: [],
                aggregations: [
                    { function: 'AVG', column: 'total_amount', sourceId: 'src-orders' }
                ],
            };

            const explanation = generateTechnicalExplanation(context);

            expect(explanation).toContain('AVG');
            expect(explanation).toContain('total_amount');
        });

        it('should include join information for multi-table KPIs', () => {
            const context: ExplanationContext = {
                kpiName: 'Revenue per Customer',
                formula: 'SUM(total_amount) / COUNT(DISTINCT customer_id)',
                domain: 'Financial',
                category: 'Financial',
                sources: [
                    { sourceId: 'src-orders', sourceName: 'orders.csv', columns: ['total_amount', 'customer_id'], role: 'AGGREGATED' },
                    { sourceId: 'src-customers', sourceName: 'customers.csv', columns: ['customer_id'], role: 'JOINED' }
                ],
                joins: [
                    {
                        relationshipId: 'rel-1',
                        sourceTable: 'orders',
                        sourceColumn: 'customer_id',
                        targetTable: 'customers',
                        targetColumn: 'customer_id',
                        joinType: 'INNER',
                        confidence: 0.9,
                    }
                ],
                aggregations: [
                    { function: 'SUM', column: 'total_amount', sourceId: 'src-orders' },
                    { function: 'COUNT_DISTINCT', column: 'customer_id', sourceId: 'src-orders' }
                ],
            };

            const explanation = generateTechnicalExplanation(context);

            expect(explanation).toContain('JOIN');
            expect(explanation).toContain('customer_id');
            expect(explanation).toContain('orders');
            expect(explanation).toContain('customers');
        });
    });

    describe('Business Explanation Generation', () => {
        it('should generate human-friendly explanation for Total Revenue', () => {
            const context: ExplanationContext = {
                kpiName: 'Total Revenue',
                formula: 'SUM(total_amount)',
                domain: 'Financial',
                category: 'Financial',
                sources: [
                    { sourceId: 'src-orders', sourceName: 'orders.csv', columns: ['total_amount'], role: 'AGGREGATED' }
                ],
                joins: [],
                aggregations: [
                    { function: 'SUM', column: 'total_amount', sourceId: 'src-orders' }
                ],
            };

            const explanation = generateBusinessExplanation(context);

            expect(explanation).toContain('Total Revenue');
            expect(explanation).toContain('total');
            expect(explanation.toLowerCase()).not.toContain('sum('); // Should not have raw formula
        });

        it('should mention domain context in explanation', () => {
            const context: ExplanationContext = {
                kpiName: 'Order Count',
                formula: 'COUNT(order_id)',
                domain: 'Operational',
                category: 'Operational',
                sources: [
                    { sourceId: 'src-orders', sourceName: 'orders.csv', columns: ['order_id'], role: 'AGGREGATED' }
                ],
                joins: [],
                aggregations: [
                    { function: 'COUNT', column: 'order_id', sourceId: 'src-orders' }
                ],
            };

            const explanation = generateBusinessExplanation(context);

            expect(explanation.toLowerCase()).toContain('operational');
        });

        it('should describe joins in business terms', () => {
            const context: ExplanationContext = {
                kpiName: 'Revenue per Customer',
                formula: 'SUM(total_amount) / COUNT(DISTINCT customer_id)',
                domain: 'Financial',
                category: 'Financial',
                sources: [
                    { sourceId: 'src-orders', sourceName: 'orders.csv', columns: ['total_amount', 'customer_id'], role: 'AGGREGATED' },
                    { sourceId: 'src-customers', sourceName: 'customers.csv', columns: ['customer_id'], role: 'JOINED' }
                ],
                joins: [
                    {
                        relationshipId: 'rel-1',
                        sourceTable: 'orders',
                        sourceColumn: 'customer_id',
                        targetTable: 'customers',
                        targetColumn: 'customer_id',
                        joinType: 'INNER',
                        confidence: 0.9,
                    }
                ],
                aggregations: [
                    { function: 'SUM', column: 'total_amount', sourceId: 'src-orders' }
                ],
            };

            const explanation = generateBusinessExplanation(context);

            // Should use business terms like "linked" or "combining"
            expect(explanation.toLowerCase()).toMatch(/link|combin|from/);
        });
    });

    describe('Quick Explanation (No AI)', () => {
        it('should generate both explanations without AI', () => {
            const context: ExplanationContext = {
                kpiName: 'Total Revenue',
                formula: 'SUM(total_amount)',
                domain: 'Financial',
                category: 'Financial',
                sources: [
                    { sourceId: 'src-orders', sourceName: 'orders.csv', columns: ['total_amount'], role: 'AGGREGATED' }
                ],
                joins: [],
                aggregations: [
                    { function: 'SUM', column: 'total_amount', sourceId: 'src-orders' }
                ],
            };

            const result = generateQuickExplanation(context);

            expect(result.technical).toBeDefined();
            expect(result.business).toBeDefined();
            expect(result.aiEnhanced).toBe(false);
        });
    });

    describe('Explanation Accuracy Validation', () => {
        it('should not invent non-existent joins', () => {
            const context: ExplanationContext = {
                kpiName: 'Total Revenue',
                formula: 'SUM(total_amount)',
                domain: 'Financial',
                category: 'Financial',
                sources: [
                    { sourceId: 'src-orders', sourceName: 'orders.csv', columns: ['total_amount'], role: 'AGGREGATED' }
                ],
                joins: [], // No joins
                aggregations: [
                    { function: 'SUM', column: 'total_amount', sourceId: 'src-orders' }
                ],
            };

            const technical = generateTechnicalExplanation(context);

            // Should not mention JOIN for single-table KPI
            expect(technical).not.toContain('JOIN');
        });

        it('should not invent non-existent columns', () => {
            const context: ExplanationContext = {
                kpiName: 'Order Count',
                formula: 'COUNT(order_id)',
                domain: 'Operational',
                category: 'Operational',
                sources: [
                    { sourceId: 'src-orders', sourceName: 'orders.csv', columns: ['order_id'], role: 'AGGREGATED' }
                ],
                joins: [],
                aggregations: [
                    { function: 'COUNT', column: 'order_id', sourceId: 'src-orders' }
                ],
            };

            const explanation = generateTechnicalExplanation(context);

            // Should only mention order_id, not other columns
            expect(explanation).toContain('order_id');
            expect(explanation).not.toContain('customer_id');
            expect(explanation).not.toContain('product_id');
        });
    });

    describe('Test KPI Dataset Validation', () => {
        it('should have valid test KPIs', () => {
            expect(testKPIs.length).toBeGreaterThan(0);

            for (const kpi of testKPIs) {
                expect(kpi.kpiId).toBeDefined();
                expect(kpi.kpiName).toBeDefined();
                expect(kpi.formula).toBeDefined();
                expect(kpi.matchedColumns.length).toBeGreaterThan(0);
            }
        });

        it('should have both single-table and multi-table KPIs', () => {
            const singleTable = testKPIs.filter(k => k.expectedJoins === 0);
            const multiTable = testKPIs.filter(k => k.expectedJoins > 0);

            expect(singleTable.length).toBeGreaterThan(0);
            expect(multiTable.length).toBeGreaterThan(0);
        });
    });
});
