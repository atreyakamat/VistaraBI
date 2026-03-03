// Module 4.5 — Semantic Resolver Tests
// Verifies that semantic roles are correctly resolved to real column names,
// formulas are properly interpolated, and resolution fails hard when columns
// are missing from sources.

import { describe, it, expect } from 'vitest';
import { resolveKPI, SemanticResolutionError } from '../../src/lib/kpi/semantic-resolver';
import type { SemanticColumnMap, SourceInfo } from '../../src/lib/kpi/semantic-types';
import type { RelationshipEntry } from '../../src/lib/prisma';
import { getRuleById } from '../../src/lib/kpi/kpi-rule-registry';

// ─── Shared Fixtures ───────────────────────────────────────────────────────────

const ordersSource: SourceInfo = {
    id: 'src-orders',
    name: 'orders.csv',
    columns: ['order_value', 'order_id', 'cust_id', 'order_date', 'product_category', 'ad_spend'],
};

const customersSource: SourceInfo = {
    id: 'src-customers',
    name: 'customers.csv',
    columns: ['patient_ref', 'customer_name', 'signup_date'],
};

const mockRelationship: RelationshipEntry = {
    id: 'rel-001',
    projectId: 'test',
    sourceTableId: 'src-orders',
    sourceTableName: 'orders.csv',
    sourceColumn: 'cust_id',
    targetTableId: 'src-customers',
    targetTableName: 'customers.csv',
    targetColumn: 'cust_id',
    relationshipType: 'FOREIGN_KEY',
    joinCardinality: 'ONE_TO_MANY',
    confidence: 0.95,
    detectionMethod: 'NAME_MATCH',
    confidenceFactors: { nameScore: 0.9, overlapScore: 0.85, uniquenessScore: 0.9, dataTypeScore: 1.0 },
    explanation: 'Test relationship',
    detectedAt: new Date().toISOString(),
};

// ─── Basic Resolution ──────────────────────────────────────────────────────────

describe('SemanticResolver — Basic Resolution', () => {

    it('resolves Total Revenue formula with real column name', () => {
        const rule = getRuleById('ECOMMERCE', 'ec-001')!;
        const semanticColumns: SemanticColumnMap = { revenue: 'order_value' };

        const result = resolveKPI(rule, 'ECOMMERCE', semanticColumns, [ordersSource], []);

        expect(result.formula).toBe('SUM(order_value)');
        expect(result.formula).not.toContain('{revenue}');
        expect(result.formula).not.toContain('{');
    });

    it('formula contains actual column names, not semantic role names', () => {
        const rule = getRuleById('ECOMMERCE', 'ec-003')!; // AOV: SUM({revenue}) / COUNT({order_id})
        const semanticColumns: SemanticColumnMap = {
            revenue: 'order_value',
            order_id: 'order_id',
        };

        const result = resolveKPI(rule, 'ECOMMERCE', semanticColumns, [ordersSource], []);

        expect(result.formula).toContain('order_value');
        expect(result.formula).toContain('order_id');
        expect(result.formula).not.toContain('revenue');  // role name must not appear in formula
        expect(result.formula).not.toContain('{');
    });

    it('aggregations contain real column names, not semantic roles', () => {
        const rule = getRuleById('ECOMMERCE', 'ec-003')!;
        const semanticColumns: SemanticColumnMap = {
            revenue: 'order_value',
            order_id: 'order_number',
        };

        const result = resolveKPI(rule, 'ECOMMERCE', semanticColumns, [ordersSource.name !== 'orders.csv' ? ordersSource : { ...ordersSource, columns: ['order_value', 'order_number'] }], []);

        for (const agg of result.aggregations) {
            expect(['order_value', 'order_number']).toContain(agg.column);
            // Must not be a semantic role name
            expect(agg.column).not.toBe('revenue');
            expect(agg.column).not.toBe('order_id');
        }
    });

    it('sourceTable is a table name without extension', () => {
        const rule = getRuleById('ECOMMERCE', 'ec-001')!;
        const result = resolveKPI(rule, 'ECOMMERCE', { revenue: 'order_value' }, [ordersSource], []);

        expect(result.sourceTable).toBe('orders'); // extension stripped
        expect(result.sourceTable).not.toContain('.csv');
    });

    it('tables array contains all involved source table names', () => {
        const rule = getRuleById('ECOMMERCE', 'ec-001')!;
        const result = resolveKPI(rule, 'ECOMMERCE', { revenue: 'order_value' }, [ordersSource], []);

        expect(result.tables).toContain('orders');
        expect(Array.isArray(result.tables)).toBe(true);
    });

    it('semanticRolesUsed contains the roles consumed, not the column names', () => {
        const rule = getRuleById('ECOMMERCE', 'ec-003')!;
        const semanticColumns: SemanticColumnMap = { revenue: 'order_value', order_id: 'order_id' };
        const result = resolveKPI(rule, 'ECOMMERCE', semanticColumns, [ordersSource], []);

        expect(result.semanticRolesUsed).toContain('revenue');
        expect(result.semanticRolesUsed).toContain('order_id');
    });

});

// ─── Failure Mode — Hard Throws ────────────────────────────────────────────────

describe('SemanticResolver — Hard Failure (No Fallback)', () => {

    it('throws SemanticResolutionError when a semantic role is absent from column map', () => {
        const rule = getRuleById('ECOMMERCE', 'ec-003')!; // needs revenue + order_id
        const semanticColumns: SemanticColumnMap = {
            revenue: 'order_value',
            // order_id intentionally missing
        };

        expect(() =>
            resolveKPI(rule, 'ECOMMERCE', semanticColumns, [ordersSource], [])
        ).toThrow(SemanticResolutionError);
    });

    it('throws SemanticResolutionError when column is not found in any source', () => {
        const rule = getRuleById('ECOMMERCE', 'ec-001')!;
        const semanticColumns: SemanticColumnMap = { revenue: 'nonexistent_column_xyz' };

        expect(() =>
            resolveKPI(rule, 'ECOMMERCE', semanticColumns, [ordersSource], [])
        ).toThrow(SemanticResolutionError);
    });

    it('throws with rule id and name in the error message', () => {
        const rule = getRuleById('ECOMMERCE', 'ec-001')!;

        try {
            resolveKPI(rule, 'ECOMMERCE', { revenue: 'nonexistent' }, [ordersSource], []);
            expect.fail('Should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(SemanticResolutionError);
            const resErr = err as SemanticResolutionError;
            expect(resErr.ruleId).toBe('ec-001');
            expect(resErr.ruleName).toBe('Total Revenue');
            expect(resErr.detail).toBeTruthy();
        }
    });

    it('never returns partial or undefined column names in aggregations', () => {
        const rule = getRuleById('ECOMMERCE', 'ec-001')!;
        const result = resolveKPI(rule, 'ECOMMERCE', { revenue: 'order_value' }, [ordersSource], []);

        for (const agg of result.aggregations) {
            expect(agg.column).toBeTruthy();
            expect(typeof agg.column).toBe('string');
            expect(agg.column.length).toBeGreaterThan(0);
            expect(agg.column).not.toBe('unknown');
        }
    });

    it('never returns undefined source IDs in aggregations', () => {
        const rule = getRuleById('ECOMMERCE', 'ec-001')!;
        const result = resolveKPI(rule, 'ECOMMERCE', { revenue: 'order_value' }, [ordersSource], []);

        for (const agg of result.aggregations) {
            expect(agg.sourceId).toBeTruthy();
            expect(agg.sourceId).not.toBe('unknown');
        }
    });

});

// ─── Multi-Table Resolution ────────────────────────────────────────────────────

describe('SemanticResolver — Multi-table (Join) Resolution', () => {
    // patient_id maps to 'patient_ref' → only in customersSource
    // revenue maps to 'order_value' → only in ordersSource
    // Relationship links src-orders → src-customers
    // So the resolver must traverse two sources and generate a join.

    it('resolves join path when relationship exists between sources', () => {
        const rule = getRuleById('HEALTHCARE', 'hc-010')!; // Revenue per Patient (requiresJoin=true)
        const semanticColumns: SemanticColumnMap = {
            patient_id: 'patient_ref',   // → customersSource only
            revenue: 'order_value',       // → ordersSource only
        };

        const crossTableRel: RelationshipEntry = {
            ...mockRelationship,
            sourceTableId: 'src-orders',
            sourceTableName: 'orders.csv',
            targetTableId: 'src-customers',
            targetTableName: 'customers.csv',
        };

        const result = resolveKPI(
            rule, 'HEALTHCARE', semanticColumns,
            [ordersSource, customersSource],
            [crossTableRel]
        );

        expect(result.joins.length).toBeGreaterThan(0);
        expect(result.tables.length).toBeGreaterThanOrEqual(2); // both tables involved
    });

    it('join path contains real table names (not .csv), real column names', () => {
        const rule = getRuleById('HEALTHCARE', 'hc-010')!;
        const semanticColumns: SemanticColumnMap = {
            patient_id: 'patient_ref',
            revenue: 'order_value',
        };

        const crossTableRel: RelationshipEntry = {
            ...mockRelationship,
            sourceTableId: 'src-orders',
            sourceTableName: 'orders.csv',
            targetTableId: 'src-customers',
            targetTableName: 'customers.csv',
        };

        const result = resolveKPI(
            rule, 'HEALTHCARE', semanticColumns,
            [ordersSource, customersSource],
            [crossTableRel]
        );

        for (const join of result.joins) {
            expect(join.leftTable).not.toContain('.csv');
            expect(join.rightTable).not.toContain('.csv');
            expect(join.leftColumn).toBeTruthy();
            expect(join.rightColumn).toBeTruthy();
        }
    });

});

// ─── Formula Template Interpolation ───────────────────────────────────────────

describe('SemanticResolver — Formula Interpolation', () => {

    it('[SAAS] MRR formula interpolates correctly', () => {
        const rule = getRuleById('SAAS', 'saas-001')!;
        const source: SourceInfo = { id: 's1', name: 'subscriptions.csv', columns: ['monthly_rev'] };
        const result = resolveKPI(rule, 'SAAS', { mrr: 'monthly_rev' }, [source], []);

        expect(result.formula).toBe('SUM(monthly_rev)');
    });

    it('[FINANCE] Cash Flow formula interpolates both inflow and outflow', () => {
        const rule = getRuleById('FINANCE', 'fn-003')!;
        const source: SourceInfo = { id: 'f1', name: 'ledger.csv', columns: ['receipts', 'payments'] };
        const result = resolveKPI(rule, 'FINANCE', { inflow: 'receipts', outflow: 'payments' }, [source], []);

        expect(result.formula).toContain('receipts');
        expect(result.formula).toContain('payments');
        expect(result.formula).not.toContain('{inflow}');
        expect(result.formula).not.toContain('{outflow}');
    });

    it('[MANUFACTURING] OEE formula interpolates all three factors', () => {
        const rule = getRuleById('MANUFACTURING', 'mf-004')!;
        const source: SourceInfo = {
            id: 'm1', name: 'machines.csv',
            columns: ['avail_rate', 'perf_rate', 'qual_rate'],
        };
        const result = resolveKPI(rule, 'MANUFACTURING', {
            availability: 'avail_rate',
            performance: 'perf_rate',
            quality_ratio: 'qual_rate',
        }, [source], []);

        expect(result.formula).toContain('avail_rate');
        expect(result.formula).toContain('perf_rate');
        expect(result.formula).toContain('qual_rate');
        expect(result.formula).not.toContain('{');
    });

});
