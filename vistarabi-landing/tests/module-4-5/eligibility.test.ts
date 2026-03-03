// Module 4.5 — Eligibility Engine Tests
// Tests all 8 domains × 5 scenarios using vitest (pure unit tests, no DB).

import { describe, it, expect } from 'vitest';
import { evaluateEligibility } from '../../src/lib/kpi/kpi-eligibility-engine';
import type { SemanticColumnMap } from '../../src/lib/kpi/semantic-types';
import type { RelationshipEntry } from '../../src/lib/prisma';

// ─── Shared Helpers ────────────────────────────────────────────────────────────

const mockRelationship = (
    sourceId: string,
    targetId: string,
    confidence = 0.9
): RelationshipEntry => ({
    id: `rel-${sourceId}-${targetId}`,
    projectId: 'test-project',
    sourceTableId: sourceId,
    sourceTableName: `${sourceId}.csv`,
    sourceColumn: 'id',
    targetTableId: targetId,
    targetTableName: `${targetId}.csv`,
    targetColumn: 'id',
    relationshipType: 'FOREIGN_KEY',
    joinCardinality: 'ONE_TO_MANY',
    confidence,
    detectionMethod: 'NAME_MATCH',
    confidenceFactors: { nameScore: 0.9, overlapScore: 0.8, uniquenessScore: 0.9, dataTypeScore: 1.0 },
    explanation: 'Mock relationship for test',
    detectedAt: new Date().toISOString(),
});

// ─── ECOMMERCE ─────────────────────────────────────────────────────────────────

describe('Module 4.5 — ECOMMERCE', () => {

    it('[minimum_roles] Only revenue → only Total Revenue and similar unlocks', () => {
        const semanticColumns: SemanticColumnMap = { revenue: 'order_value' };
        const result = evaluateEligibility('ECOMMERCE', semanticColumns, []);

        const unlockedIds = result.unlockedKPIs.map(k => k.id);
        expect(unlockedIds).toContain('ec-001'); // Total Revenue (requires: revenue)

        // Should NOT unlock KPIs requiring more roles
        expect(unlockedIds).not.toContain('ec-003'); // AOV (requires revenue + order_id)
        expect(unlockedIds).not.toContain('ec-004'); // Conversion Rate (requires order_id + session_id)
        expect(result.skippedKPIs.length).toBeGreaterThan(0);
    });

    it('[missing_one_role] Missing order_id → AOV is skipped with reason', () => {
        const semanticColumns: SemanticColumnMap = {
            revenue: 'order_value',
            // order_id intentionally missing
        };
        const result = evaluateEligibility('ECOMMERCE', semanticColumns, []);

        const skippedIds = result.skippedKPIs.map(s => s.rule.id);
        expect(skippedIds).toContain('ec-003'); // AOV needs order_id

        const aovSkip = result.skippedKPIs.find(s => s.rule.id === 'ec-003')!;
        expect(aovSkip.reason).toBeTruthy();
        expect(aovSkip.reason.toLowerCase()).toContain('order_id');
    });

    it('[with_join] No join-required KPIs in ecommerce default set — all non-join KPIs unlock when roles present', () => {
        const semanticColumns: SemanticColumnMap = {
            revenue: 'order_value',
            order_id: 'order_id',
            customer_id: 'cust_id',
            session_id: 'session_id',
            cart_id: 'cart_id',
            cogs: 'cost',
            date: 'order_date',
            category: 'product_category',
            marketing_cost: 'ad_spend',
        };
        const result = evaluateEligibility('ECOMMERCE', semanticColumns, []);
        const unlockedIds = result.unlockedKPIs.map(k => k.id);

        expect(unlockedIds).toContain('ec-001');
        expect(unlockedIds).toContain('ec-002');
        expect(unlockedIds).toContain('ec-003');
        expect(unlockedIds).toContain('ec-004');
        expect(unlockedIds).toContain('ec-006');
    });

    it('[no_join] All roles present, no relationships — standard KPIs still unlock (ecommerce has no join-required KPIs)', () => {
        const semanticColumns: SemanticColumnMap = {
            revenue: 'total_amount',
            order_id: 'order_id',
        };
        const result = evaluateEligibility('ECOMMERCE', semanticColumns, []);
        const unlockedIds = result.unlockedKPIs.map(k => k.id);

        // ec-001 (revenue only) and ec-002 (order_id only) should unlock
        expect(unlockedIds).toContain('ec-001');
        expect(unlockedIds).toContain('ec-002');
    });

    it('[extra_columns] Extra irrelevant semantic roles do NOT unlock extra KPIs', () => {
        const semanticColumns: SemanticColumnMap = {
            revenue: 'amount',
            // Extra roles that don't match any ECOMMERCE rules
            patient_id: 'patient_id' as any, // Healthcare role
            beds_total: 'beds_total' as any,
        };
        const result = evaluateEligibility('ECOMMERCE', semanticColumns, []);
        const unlockedIds = result.unlockedKPIs.map(k => k.id);

        expect(unlockedIds).toContain('ec-001'); // revenue is valid
        // No extra KPIs beyond what revenue allows
        expect(unlockedIds).not.toContain('ec-003'); // still needs order_id
    });

});

// ─── SAAS ──────────────────────────────────────────────────────────────────────

describe('Module 4.5 — SAAS', () => {

    it('[minimum_roles] Only mrr → MRR and ARR unlock', () => {
        const semanticColumns: SemanticColumnMap = { mrr: 'monthly_revenue' };
        const result = evaluateEligibility('SAAS', semanticColumns, []);

        const unlockedIds = result.unlockedKPIs.map(k => k.id);
        expect(unlockedIds).toContain('saas-001'); // MRR
        expect(unlockedIds).toContain('saas-002'); // ARR (also needs only mrr)
        expect(unlockedIds).not.toContain('saas-003'); // Churn Rate needs churn_flag + customer_id
    });

    it('[missing_one_role] Missing churn_flag → Churn Rate skipped', () => {
        const semanticColumns: SemanticColumnMap = {
            mrr: 'mrr',
            customer_id: 'customer_id',
            // churn_flag missing
        };
        const result = evaluateEligibility('SAAS', semanticColumns, []);

        const skippedIds = result.skippedKPIs.map(s => s.rule.id);
        expect(skippedIds).toContain('saas-003');
        const churnSkip = result.skippedKPIs.find(s => s.rule.id === 'saas-003')!;
        expect(churnSkip.reason).toContain('churn_flag');
    });

    it('[with_join] Full role set with relationships unlocks all saas rules', () => {
        const semanticColumns: SemanticColumnMap = {
            mrr: 'mrr', customer_id: 'cust_id', churn_flag: 'churned',
            expansion_mrr: 'expansion', contraction_mrr: 'contraction',
            user_id: 'user_id', login_date: 'last_login', trial_flag: 'is_trial',
            converted_flag: 'converted', marketing_cost: 'ad_spend', date: 'created_at',
        };
        const result = evaluateEligibility('SAAS', semanticColumns, [mockRelationship('src1', 'src2')]);

        expect(result.unlockedKPIs.length).toBeGreaterThanOrEqual(8);
    });

    it('[no_join] SAAS has no join-required rules — absence of relationships is fine', () => {
        const semanticColumns: SemanticColumnMap = { mrr: 'mrr', customer_id: 'cust_id', churn_flag: 'churned' };
        const result = evaluateEligibility('SAAS', semanticColumns, []);

        expect(result.unlockedKPIs.map(k => k.id)).toContain('saas-003');
    });

    it('[extra_columns] Extra roles do not inflate unlocked count', () => {
        const semanticColumns: SemanticColumnMap = {
            mrr: 'mrr',
            beds_total: 'beds' as any, // Healthcare role, irrelevant for SAAS
        };
        const r1 = evaluateEligibility('SAAS', { mrr: 'mrr' }, []);
        const r2 = evaluateEligibility('SAAS', semanticColumns, []);

        // Same count — extra roles don't create new KPIs
        expect(r2.unlockedKPIs.length).toBe(r1.unlockedKPIs.length);
    });

});

// ─── EDTECH ────────────────────────────────────────────────────────────────────

describe('Module 4.5 — EDTECH', () => {

    it('[minimum_roles] Only enrollment_id → Total Enrollments unlocks', () => {
        const result = evaluateEligibility('EDTECH', { enrollment_id: 'reg_id' }, []);
        expect(result.unlockedKPIs.map(k => k.id)).toContain('ed-001');
        expect(result.unlockedKPIs.map(k => k.id)).not.toContain('ed-002'); // needs completion_flag too
    });

    it('[missing_one_role] Missing completion_flag → Completion Rate skipped', () => {
        const result = evaluateEligibility('EDTECH', { enrollment_id: 'reg_id' }, []);
        const skip = result.skippedKPIs.find(s => s.rule.id === 'ed-002')!;
        expect(skip).toBeDefined();
        expect(skip.reason).toContain('completion_flag');
    });

    it('[with_join] Cross-course KPI (ed-010) unlocks when join present', () => {
        const semanticColumns: SemanticColumnMap = {
            student_id: 'student_id',
            enrollment_id: 'enrollment_id',
            course_id: 'course_id',
        };
        const result = evaluateEligibility('EDTECH', semanticColumns, [mockRelationship('enrollments', 'courses')]);
        expect(result.unlockedKPIs.map(k => k.id)).toContain('ed-010');
    });

    it('[no_join] Cross-course KPI (ed-010) stays locked without relationships', () => {
        const semanticColumns: SemanticColumnMap = {
            student_id: 'student_id',
            enrollment_id: 'enrollment_id',
            course_id: 'course_id',
        };
        const result = evaluateEligibility('EDTECH', semanticColumns, []);
        expect(result.unlockedKPIs.map(k => k.id)).not.toContain('ed-010');
    });

    it('[extra_columns] Unrelated roles (e.g. mrr) do not unlock EDTECH KPIs', () => {
        const r1 = evaluateEligibility('EDTECH', { enrollment_id: 'reg_id' }, []);
        const r2 = evaluateEligibility('EDTECH', { enrollment_id: 'reg_id', mrr: 'mrr' as any }, []);
        expect(r2.unlockedKPIs.length).toBe(r1.unlockedKPIs.length);
    });

});

// ─── RETAIL ────────────────────────────────────────────────────────────────────

describe('Module 4.5 — RETAIL', () => {

    it('[minimum_roles] Only revenue → Total Sales unlocks', () => {
        const result = evaluateEligibility('RETAIL', { revenue: 'sales_amount' }, []);
        expect(result.unlockedKPIs.map(k => k.id)).toContain('rt-001');
        expect(result.unlockedKPIs.map(k => k.id)).not.toContain('rt-002'); // needs cogs + inventory
    });

    it('[missing_one_role] Missing cogs → Inventory Turnover and Gross Margin skipped', () => {
        const result = evaluateEligibility('RETAIL', { revenue: 'sales', inventory: 'stock' }, []);
        const skippedIds = result.skippedKPIs.map(s => s.rule.id);
        expect(skippedIds).toContain('rt-002'); // needs cogs
        expect(skippedIds).toContain('rt-003'); // needs cogs
    });

    it('[with_join] All retail roles with relationships — all non-join rules unlock', () => {
        const semanticColumns: SemanticColumnMap = {
            revenue: 'sales', cogs: 'cogs', inventory: 'stock_value',
            store_id: 'store_id', items_in_basket: 'basket_size',
            transaction_id: 'txn_id', shrinkage: 'shrinkage',
            sold_units: 'qty_sold', received_units: 'qty_received',
            date: 'sale_date', category: 'dept',
            visitor_count: 'visitors',
        };
        const result = evaluateEligibility('RETAIL', semanticColumns, [mockRelationship('s1', 's2')]);
        expect(result.unlockedKPIs.length).toBeGreaterThanOrEqual(8);
    });

    it('[no_join] All roles, no relationships — non-join KPIs still unlock', () => {
        const result = evaluateEligibility('RETAIL', { revenue: 'sales', date: 'sale_date' }, []);
        expect(result.unlockedKPIs.map(k => k.id)).toContain('rt-008'); // Sales Growth (date + revenue)
    });

    it('[extra_columns] Extra roles do not unlock RETAIL KPIs beyond available roles', () => {
        const r1 = evaluateEligibility('RETAIL', { revenue: 'sales' }, []);
        const r2 = evaluateEligibility('RETAIL', { revenue: 'sales', mrr: 'val' as any }, []);
        expect(r2.unlockedKPIs.length).toBe(r1.unlockedKPIs.length);
    });

});

// ─── SERVICES ──────────────────────────────────────────────────────────────────

describe('Module 4.5 — SERVICES', () => {

    it('[minimum_roles] Only revenue → Total Revenue unlocks', () => {
        const result = evaluateEligibility('SERVICES', { revenue: 'billing_amount' }, []);
        expect(result.unlockedKPIs.map(k => k.id)).toContain('sv-001');
        expect(result.unlockedKPIs.map(k => k.id)).not.toContain('sv-002'); // needs billable_hours + total_hours
    });

    it('[missing_one_role] Missing total_hours → Billable Utilization skipped', () => {
        const result = evaluateEligibility('SERVICES', { billable_hours: 'bh' }, []);
        const skip = result.skippedKPIs.find(s => s.rule.id === 'sv-002')!;
        expect(skip).toBeDefined();
        expect(skip.reason).toContain('total_hours');
    });

    it('[with_join] Cross-table client revenue (sv-010) unlocks with join', () => {
        const semanticColumns: SemanticColumnMap = {
            revenue: 'billing', invoice_id: 'inv_id', client_id: 'client_id',
        };
        const result = evaluateEligibility('SERVICES', semanticColumns, [mockRelationship('invoices', 'clients')]);
        expect(result.unlockedKPIs.map(k => k.id)).toContain('sv-010');
    });

    it('[no_join] Cross-table client revenue (sv-010) stays locked without relationship', () => {
        const semanticColumns: SemanticColumnMap = {
            revenue: 'billing', invoice_id: 'inv_id', client_id: 'client_id',
        };
        const result = evaluateEligibility('SERVICES', semanticColumns, []);
        expect(result.unlockedKPIs.map(k => k.id)).not.toContain('sv-010');
    });

    it('[extra_columns] Irrelevant SAAS roles do not increase services KPI count', () => {
        const r1 = evaluateEligibility('SERVICES', { revenue: 'billing' }, []);
        const r2 = evaluateEligibility('SERVICES', { revenue: 'billing', mrr: 'mrr' as any }, []);
        expect(r2.unlockedKPIs.length).toBe(r1.unlockedKPIs.length);
    });

});

// ─── MANUFACTURING ────────────────────────────────────────────────────────────

describe('Module 4.5 — MANUFACTURING', () => {

    it('[minimum_roles] Only units_produced → Production Output unlocks', () => {
        const result = evaluateEligibility('MANUFACTURING', { units_produced: 'qty_made' }, []);
        expect(result.unlockedKPIs.map(k => k.id)).toContain('mf-001');
        expect(result.unlockedKPIs.map(k => k.id)).not.toContain('mf-002'); // needs good_units + total_units
    });

    it('[missing_one_role] Missing total_units → Yield Rate and Defect Rate skipped', () => {
        const result = evaluateEligibility('MANUFACTURING', { good_units: 'good_qty', defects: 'defects' }, []);
        const skippedIds = result.skippedKPIs.map(s => s.rule.id);
        expect(skippedIds).toContain('mf-002');
        expect(skippedIds).toContain('mf-003');
    });

    it('[with_join] All manufacturing roles plus relationship unlocks most rules', () => {
        const semanticColumns: SemanticColumnMap = {
            units_produced: 'qty', good_units: 'good', total_units: 'total',
            defects: 'defects', availability: 'avail', performance: 'perf',
            quality_ratio: 'qual', downtime: 'downtime', unit_cost: 'cost_per',
            running_time: 'run_time', available_time: 'avail_time',
            scrap: 'scrap', material_used: 'material', time_period: 'shift',
            delivery_date: 'delivered_at', order_date: 'ordered_at',
        };
        const result = evaluateEligibility('MANUFACTURING', semanticColumns, [mockRelationship('m1', 'm2')]);
        expect(result.unlockedKPIs.length).toBeGreaterThanOrEqual(8);
    });

    it('[no_join] Manufacturing has no join-required rules — all roles without relationship work', () => {
        const result = evaluateEligibility('MANUFACTURING', { downtime: 'idle_hours' }, []);
        expect(result.unlockedKPIs.map(k => k.id)).toContain('mf-005');
    });

    it('[extra_columns] Finance roles do not unlock manufacturing KPIs', () => {
        const r1 = evaluateEligibility('MANUFACTURING', { units_produced: 'qty' }, []);
        const r2 = evaluateEligibility('MANUFACTURING', { units_produced: 'qty', fraud_flag: 'fraud' as any }, []);
        expect(r2.unlockedKPIs.length).toBe(r1.unlockedKPIs.length);
    });

});

// ─── HEALTHCARE ────────────────────────────────────────────────────────────────

describe('Module 4.5 — HEALTHCARE', () => {

    it('[minimum_roles] Only patient_id → Patient Count unlocks', () => {
        const result = evaluateEligibility('HEALTHCARE', { patient_id: 'pat_id' }, []);
        expect(result.unlockedKPIs.map(k => k.id)).toContain('hc-001');
        expect(result.unlockedKPIs.map(k => k.id)).not.toContain('hc-003'); // needs beds_occupied + beds_total
    });

    it('[missing_one_role] Missing beds_total → Bed Occupancy Rate skipped', () => {
        const result = evaluateEligibility('HEALTHCARE', { beds_occupied: 'occ_beds' }, []);
        const skip = result.skippedKPIs.find(s => s.rule.id === 'hc-003')!;
        expect(skip).toBeDefined();
        expect(skip.reason).toContain('beds_total');
    });

    it('[with_join] Revenue per Patient (hc-010) unlocks when join present', () => {
        const semanticColumns: SemanticColumnMap = {
            patient_id: 'pat_id', revenue: 'billed_amount',
        };
        const result = evaluateEligibility('HEALTHCARE', semanticColumns, [mockRelationship('patients', 'billing')]);
        expect(result.unlockedKPIs.map(k => k.id)).toContain('hc-010');
    });

    it('[no_join] Revenue per Patient (hc-010) stays locked without relationship', () => {
        const semanticColumns: SemanticColumnMap = {
            patient_id: 'pat_id', revenue: 'billed_amount',
        };
        const result = evaluateEligibility('HEALTHCARE', semanticColumns, []);
        expect(result.unlockedKPIs.map(k => k.id)).not.toContain('hc-010');
    });

    it('[extra_columns] Retail roles do not unlock healthcare KPIs', () => {
        const r1 = evaluateEligibility('HEALTHCARE', { patient_id: 'pid' }, []);
        const r2 = evaluateEligibility('HEALTHCARE', { patient_id: 'pid', shrinkage: 'shrink' as any }, []);
        expect(r2.unlockedKPIs.length).toBe(r1.unlockedKPIs.length);
    });

});

// ─── FINANCE ──────────────────────────────────────────────────────────────────

describe('Module 4.5 — FINANCE', () => {

    it('[minimum_roles] Only transaction_id → Total Transactions unlocks', () => {
        const result = evaluateEligibility('FINANCE', { transaction_id: 'txn_id' }, []);
        expect(result.unlockedKPIs.map(k => k.id)).toContain('fn-001');
        expect(result.unlockedKPIs.map(k => k.id)).not.toContain('fn-002'); // needs revenue + expenses
    });

    it('[missing_one_role] Missing expenses → Net Profit skipped', () => {
        const result = evaluateEligibility('FINANCE', { revenue: 'income', transaction_id: 'txn' }, []);
        const skip = result.skippedKPIs.find(s => s.rule.id === 'fn-002')!;
        expect(skip).toBeDefined();
        expect(skip.reason).toContain('expenses');
    });

    it('[with_join] Finance has no join-required rules — with relationships all role-satisfied rules unlock', () => {
        const semanticColumns: SemanticColumnMap = {
            transaction_id: 'txn_id', revenue: 'income', expenses: 'costs',
            inflow: 'receipts', outflow: 'payments',
        };
        const result = evaluateEligibility('FINANCE', semanticColumns, [mockRelationship('f1', 'f2')]);
        const unlockedIds = result.unlockedKPIs.map(k => k.id);
        expect(unlockedIds).toContain('fn-001');
        expect(unlockedIds).toContain('fn-002');
        expect(unlockedIds).toContain('fn-003');
    });

    it('[no_join] Finance KPIs unlock without relationships (none are join-required)', () => {
        const result = evaluateEligibility('FINANCE', { inflow: 'receipts', outflow: 'payments' }, []);
        expect(result.unlockedKPIs.map(k => k.id)).toContain('fn-003');
    });

    it('[extra_columns] Manufacturing roles do not unlock finance KPIs', () => {
        const r1 = evaluateEligibility('FINANCE', { transaction_id: 'txn' }, []);
        const r2 = evaluateEligibility('FINANCE', { transaction_id: 'txn', downtime: 'dt' as any }, []);
        expect(r2.unlockedKPIs.length).toBe(r1.unlockedKPIs.length);
    });

});

// ─── Cross-domain Invariants ───────────────────────────────────────────────────

describe('Module 4.5 — Cross-domain Invariants', () => {

    it('No skipped KPI should appear in unlockedKPIs', () => {
        const semanticColumns: SemanticColumnMap = { revenue: 'amount', order_id: 'oid' };
        const result = evaluateEligibility('ECOMMERCE', semanticColumns, []);

        const unlockedIds = new Set(result.unlockedKPIs.map(k => k.id));
        const skippedIds = result.skippedKPIs.map(s => s.rule.id);

        for (const id of skippedIds) {
            expect(unlockedIds.has(id)).toBe(false);
        }
    });

    it('All skipped KPIs have a non-empty reason', () => {
        const result = evaluateEligibility('ECOMMERCE', { revenue: 'amount' }, []);
        for (const s of result.skippedKPIs) {
            expect(s.reason).toBeTruthy();
            expect(s.reason.length).toBeGreaterThan(0);
        }
    });

    it('Total KPIs = unlocked + skipped', () => {
        const result = evaluateEligibility('ECOMMERCE', { revenue: 'amount' }, []);
        const { unlockedKPIs, skippedKPIs, log } = result;
        expect(unlockedKPIs.length + skippedKPIs.length).toBe(log.length);
    });

    it('Empty semanticColumns → all KPIs skipped for every domain', () => {
        const domains = ['ECOMMERCE', 'SAAS', 'EDTECH', 'RETAIL', 'SERVICES', 'MANUFACTURING', 'HEALTHCARE', 'FINANCE'] as const;
        for (const domain of domains) {
            const result = evaluateEligibility(domain, {}, []);
            expect(result.unlockedKPIs.length).toBe(0);
            expect(result.skippedKPIs.length).toBeGreaterThan(0);
        }
    });

    it('Low-confidence relationships do not unlock join-required KPIs', () => {
        const semanticColumns: SemanticColumnMap = {
            student_id: 'sid', enrollment_id: 'eid', course_id: 'cid',
        };
        const lowConfidenceRel = mockRelationship('enrollments', 'courses', 0.3); // below 0.5 threshold
        const result = evaluateEligibility('EDTECH', semanticColumns, [lowConfidenceRel]);
        expect(result.unlockedKPIs.map(k => k.id)).not.toContain('ed-010');
    });

});
