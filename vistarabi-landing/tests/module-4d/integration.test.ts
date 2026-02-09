// Module 4D Integration Tests
// End-to-end tests for relationship detection → KPI lineage flow

import { describe, it, expect, beforeAll } from 'vitest';
import {
    detectRelationships,
    calculateConfidence,
    SourceMetadata,
    RelationshipCandidate,
} from '../../src/lib/data-lineage/relationship-detector';
import {
    generateQuickExplanation,
    ExplanationContext,
} from '../../src/lib/data-lineage/explanation-generator';
import {
    createTestSources,
    expectedRelationships,
    testKPIs,
    TestSource,
    TestKPI,
    ExpectedRelationship,
} from './test-datasets';

describe('Module 4D Integration Tests', () => {
    let testSources: SourceMetadata[];
    let detectedRelationships: ReturnType<typeof detectRelationships>;

    beforeAll(() => {
        testSources = createTestSources().map(s => ({
            id: s.id,
            name: s.fileName,
            columns: s.columns,
            data: s.data as Record<string, unknown>[],
        }));

        detectedRelationships = detectRelationships(testSources);
    });

    describe('End-to-End: Relationship → Lineage Flow', () => {
        it('should detect all expected relationships', () => {
            for (const expected of expectedRelationships) {
                const found = detectedRelationships.find(
                    r => r.sourceTableName.includes(expected.source.replace('.csv', '')) &&
                        r.targetTableName.includes(expected.target.replace('.csv', '')) &&
                        r.sourceColumn === expected.sourceCol
                );

                expect(found).toBeDefined();
                if (found) {
                    expect(calculateConfidence(found.confidenceFactors)).toBeGreaterThan(0.5);
                }
            }
        });

        it('should use detected relationships for multi-table KPI', () => {
            // Find customer relationship for Revenue per Customer KPI
            const customerRel = detectedRelationships.find(
                r => r.sourceColumn === 'customer_id' &&
                    r.targetColumn === 'customer_id' &&
                    r.sourceTableName.includes('orders')
            );

            expect(customerRel).toBeDefined();

            // This relationship should be usable in lineage
            const kpi = testKPIs.find(k => k.kpiId === 'kpi-revenue-per-customer');
            expect(kpi).toBeDefined();
            expect(kpi!.expectedJoins).toBe(1);
        });
    });

    describe('Registry Consistency', () => {
        it('should have relationships referencing valid tables', () => {
            const sourceNames = testSources.map(s => s.name);

            for (const rel of detectedRelationships) {
                // Source and target should be in our dataset
                const sourceExists = sourceNames.some(n => rel.sourceTableName.includes(n.replace('.csv', '')));
                const targetExists = sourceNames.some(n => rel.targetTableName.includes(n.replace('.csv', '')));

                expect(sourceExists).toBe(true);
                expect(targetExists).toBe(true);
            }
        });

        it('should have relationships referencing valid columns', () => {
            for (const rel of detectedRelationships) {
                const source = testSources.find(s => rel.sourceTableName.includes(s.name.replace('.csv', '')));
                const target = testSources.find(s => rel.targetTableName.includes(s.name.replace('.csv', '')));

                if (source && target) {
                    expect(source.columns).toContain(rel.sourceColumn);
                    expect(target.columns).toContain(rel.targetColumn);
                }
            }
        });
    });

    describe('Explanation Consistency with Lineage', () => {
        it('should generate consistent explanations for all test KPIs', () => {
            for (const kpi of testKPIs) {
                // Build context from test KPI
                const sources = kpi.expectedSources.map((sourceName, i) => ({
                    sourceId: `src-${i}`,
                    sourceName,
                    columns: kpi.matchedColumns,
                    role: (i === 0 ? 'AGGREGATED' : 'JOINED') as 'PRIMARY' | 'JOINED' | 'AGGREGATED' | 'FILTERED',
                }));

                // Find relevant relationships for joins
                const joins = kpi.expectedJoins > 0 ?
                    detectedRelationships
                        .filter(r => r.sourceColumn === 'customer_id')
                        .slice(0, kpi.expectedJoins)
                        .map(r => ({
                            relationshipId: 'rel-1',
                            sourceTable: r.sourceTableName.replace('.csv', ''),
                            sourceColumn: r.sourceColumn,
                            targetTable: r.targetTableName.replace('.csv', ''),
                            targetColumn: r.targetColumn,
                            joinType: 'INNER' as const,
                            confidence: calculateConfidence(r.confidenceFactors),
                        }))
                    : [];

                const context: ExplanationContext = {
                    kpiName: kpi.kpiName,
                    formula: kpi.formula,
                    domain: 'Business',
                    category: kpi.category,
                    sources,
                    joins,
                    aggregations: [],
                };

                const explanations = generateQuickExplanation(context);

                expect(explanations.technical).toBeDefined();
                expect(explanations.business).toBeDefined();
                expect(explanations.technical.length).toBeGreaterThan(0);
                expect(explanations.business.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Downstream Compatibility', () => {
        it('should produce data suitable for dashboard "Show calculation" feature', () => {
            const kpi = testKPIs.find(k => k.kpiId === 'kpi-total-revenue')!;

            const context: ExplanationContext = {
                kpiName: kpi.kpiName,
                formula: kpi.formula,
                domain: 'Financial',
                category: kpi.category,
                sources: [{
                    sourceId: 'src-orders',
                    sourceName: 'orders.csv',
                    columns: ['total_amount'],
                    role: 'AGGREGATED',
                }],
                joins: [],
                aggregations: [{ function: 'SUM', column: 'total_amount', sourceId: 'src-orders' }],
            };

            const result = generateQuickExplanation(context);

            // Should be ready for UI display
            expect(result.business).not.toContain('undefined');
            expect(result.business).not.toContain('null');
            expect(result.technical).toContain(kpi.formula);
        });

        it('should produce data suitable for AI chat grounding', () => {
            const kpi = testKPIs.find(k => k.kpiId === 'kpi-revenue-per-customer')!;

            const customerRel = detectedRelationships.find(
                r => r.sourceColumn === 'customer_id' && r.sourceTableName.includes('orders')
            );

            const context: ExplanationContext = {
                kpiName: kpi.kpiName,
                formula: kpi.formula,
                domain: 'Financial',
                category: kpi.category,
                sources: [
                    { sourceId: 'src-orders', sourceName: 'orders.csv', columns: ['total_amount', 'customer_id'], role: 'AGGREGATED' },
                    { sourceId: 'src-customers', sourceName: 'customers.csv', columns: ['customer_id'], role: 'JOINED' }
                ],
                joins: customerRel ? [{
                    relationshipId: 'rel-1',
                    sourceTable: 'orders',
                    sourceColumn: 'customer_id',
                    targetTable: 'customers',
                    targetColumn: 'customer_id',
                    joinType: 'INNER',
                    confidence: calculateConfidence(customerRel.confidenceFactors),
                }] : [],
                aggregations: [{ function: 'SUM', column: 'total_amount', sourceId: 'src-orders' }],
            };

            const result = generateQuickExplanation(context);

            // Should have enough context for AI to explain
            expect(result.technical).toContain('orders');
            expect(result.business.length).toBeGreaterThan(50); // Meaningful explanation
        });
    });
});
