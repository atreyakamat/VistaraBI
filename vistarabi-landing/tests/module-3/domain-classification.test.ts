// Module 3 — Domain Classifier & Scorer Unit Tests
// Tests the deterministic domain classification pipeline (no DB, no AI required)

import { describe, it, expect } from 'vitest';
import { classifyDomain } from '@/lib/domain/domain-classifier';
import { calculateDomainScores } from '@/lib/domain/domain-scorer';
import { AUTO_ASSIGN_THRESHOLD } from '@/lib/domain/domain-keywords';
import type { ScanResult } from '@/lib/domain/column-scanner';

// ─── Helpers ─────────────────────────────────────────────────────

function buildScanResult(columns: string[], domain?: string): ScanResult {
    // Simulate a scan result by matching column names against domain keywords
    const matchesByDomain: ScanResult['matchesByDomain'] = {
        ECOMMERCE: [],
        SAAS: [],
        EDTECH: [],
        RETAIL: [],
        SERVICES: [],
        MANUFACTURING: [],
        HEALTHCARE: [],
        FINANCE: [],
    };

    const ecommerceKeywords = ['order', 'product', 'sku', 'price', 'quantity', 'customer', 'cart', 'checkout', 'shipping'];
    const saasKeywords = ['subscription', 'mrr', 'churn', 'trial', 'user', 'billing', 'plan'];
    const healthcareKeywords = ['patient', 'doctor', 'appointment', 'diagnosis', 'prescription'];
    const financeKeywords = ['account', 'transaction', 'debit', 'credit', 'balance', 'ledger'];
    const retailKeywords = ['store', 'inventory', 'shrinkage', 'footfall', 'sell-through'];
    const servicesKeywords = ['project', 'timesheet', 'billable', 'client', 'employee'];
    const manufacturingKeywords = ['machine', 'downtime', 'scrap', 'yield', 'batch'];

    for (const col of columns) {
        const lower = col.toLowerCase();
        for (const kw of ecommerceKeywords) {
            if (lower.includes(kw)) {
                matchesByDomain.ECOMMERCE.push({ columnName: col, matchedKeyword: kw, confidence: 80 });
                break;
            }
        }
        for (const kw of saasKeywords) {
            if (lower.includes(kw)) {
                matchesByDomain.SAAS.push({ columnName: col, matchedKeyword: kw, confidence: 80 });
                break;
            }
        }
        for (const kw of healthcareKeywords) {
            if (lower.includes(kw)) {
                matchesByDomain.HEALTHCARE.push({ columnName: col, matchedKeyword: kw, confidence: 80 });
                break;
            }
        }
        for (const kw of financeKeywords) {
            if (lower.includes(kw)) {
                matchesByDomain.FINANCE.push({ columnName: col, matchedKeyword: kw, confidence: 80 });
                break;
            }
        }
        for (const kw of retailKeywords) {
            if (lower.includes(kw)) {
                matchesByDomain.RETAIL.push({ columnName: col, matchedKeyword: kw, confidence: 80 });
                break;
            }
        }
        for (const kw of servicesKeywords) {
            if (lower.includes(kw)) {
                matchesByDomain.SERVICES.push({ columnName: col, matchedKeyword: kw, confidence: 80 });
                break;
            }
        }
        for (const kw of manufacturingKeywords) {
            if (lower.includes(kw)) {
                matchesByDomain.MANUFACTURING.push({ columnName: col, matchedKeyword: kw, confidence: 80 });
                break;
            }
        }
    }

    return {
        projectId: 'test-project',
        totalColumns: columns.length,
        matchesByDomain,
        unmatchedColumns: [],
        sampleValues: {},
    };
}

// ─── Domain Scorer Tests ──────────────────────────────────────────

describe('Module 3 — Domain Scorer', () => {
    it('scores ECOMMERCE highest for order/product/price columns', () => {
        const scanResult = buildScanResult([
            'order_id', 'product_id', 'price', 'quantity', 'customer_id', 'shipping_address',
        ]);
        const result = calculateDomainScores(scanResult);
        expect(result.topDomain).toBe('ECOMMERCE');
        expect(result.topConfidence).toBeGreaterThan(0);
    });

    it('scores SAAS highest for subscription/churn/mrr columns', () => {
        const scanResult = buildScanResult([
            'user_id', 'subscription_id', 'mrr', 'churn_date', 'plan', 'trial',
        ]);
        const result = calculateDomainScores(scanResult);
        expect(result.topDomain).toBe('SAAS');
        expect(result.topConfidence).toBeGreaterThan(0);
    });

    it('returns null topDomain when no columns match any domain', () => {
        const scanResult = buildScanResult([]);
        const result = calculateDomainScores(scanResult);
        expect(result.topDomain).toBeNull();
        expect(result.topConfidence).toBe(0);
    });

    it('sorts scores in descending confidence order', () => {
        const scanResult = buildScanResult(['order_id', 'product_id', 'price', 'quantity', 'customer_id']);
        const result = calculateDomainScores(scanResult);
        for (let i = 0; i < result.scores.length - 1; i++) {
            expect(result.scores[i].confidence).toBeGreaterThanOrEqual(result.scores[i + 1].confidence);
        }
    });

    it('returns scores for all 8 domains', () => {
        const scanResult = buildScanResult(['order_id', 'price']);
        const result = calculateDomainScores(scanResult);
        expect(result.scores.length).toBe(8);
    });

    it('confidence is between 0 and 100 for all scores', () => {
        const scanResult = buildScanResult(['order_id', 'price', 'quantity', 'patient', 'mrr']);
        const result = calculateDomainScores(scanResult);
        for (const score of result.scores) {
            expect(score.confidence).toBeGreaterThanOrEqual(0);
            expect(score.confidence).toBeLessThanOrEqual(100);
        }
    });

    it('HEALTHCARE columns score HEALTHCARE domain higher', () => {
        const scanResult = buildScanResult([
            'patient_id', 'doctor', 'appointment_date', 'diagnosis', 'prescription',
        ]);
        const result = calculateDomainScores(scanResult);
        const healthcareScore = result.scores.find(s => s.domain === 'HEALTHCARE');
        expect(healthcareScore?.confidence).toBeGreaterThan(0);
    });

    it('FINANCE columns score FINANCE domain higher', () => {
        const scanResult = buildScanResult([
            'account', 'debit', 'credit', 'balance', 'transaction',
        ]);
        const result = calculateDomainScores(scanResult);
        const finScore = result.scores.find(s => s.domain === 'FINANCE');
        expect(finScore?.confidence).toBeGreaterThan(0);
    });
});

// ─── Domain Classifier Tests ──────────────────────────────────────

describe('Module 3 — Domain Classifier', () => {
    it('auto-assigns domain when confidence >= AUTO_ASSIGN_THRESHOLD', () => {
        // Build a scoring result with high ECOMMERCE confidence
        const highConfidenceScoringResult = {
            projectId: 'proj-1',
            scores: [
                { domain: 'ECOMMERCE' as const, matchCount: 20, totalKeywords: 30, confidence: 70, matchedColumns: ['order_id', 'product_id'] },
                { domain: 'SAAS' as const, matchCount: 2, totalKeywords: 30, confidence: 10, matchedColumns: [] },
            ],
            topDomain: 'ECOMMERCE' as const,
            topConfidence: 70,
            totalMatches: 22,
        };

        const result = classifyDomain(highConfidenceScoringResult);
        expect(result.status).toBe('AUTO_ASSIGNED');
        expect(result.detectedDomain).toBe('ECOMMERCE');
        expect(result.confidence).toBeGreaterThanOrEqual(AUTO_ASSIGN_THRESHOLD);
    });

    it('requires manual confirmation when confidence < AUTO_ASSIGN_THRESHOLD', () => {
        const lowConfidenceScoringResult = {
            projectId: 'proj-2',
            scores: [
                { domain: 'SAAS' as const, matchCount: 5, totalKeywords: 30, confidence: 40, matchedColumns: ['user_id', 'plan'] },
                { domain: 'ECOMMERCE' as const, matchCount: 2, totalKeywords: 30, confidence: 10, matchedColumns: [] },
            ],
            topDomain: 'SAAS' as const,
            topConfidence: 40,
            totalMatches: 7,
        };

        const result = classifyDomain(lowConfidenceScoringResult);
        expect(result.status).toBe('MANUAL_REQUIRED');
    });

    it('returns null detectedDomain when no domain keywords found', () => {
        const noMatchScoringResult = {
            projectId: 'proj-3',
            scores: [
                { domain: 'ECOMMERCE' as const, matchCount: 0, totalKeywords: 30, confidence: 0, matchedColumns: [] },
            ],
            topDomain: null,
            topConfidence: 0,
            totalMatches: 0,
        };

        const result = classifyDomain(noMatchScoringResult);
        expect(result.detectedDomain).toBeNull();
        expect(result.status).toBe('MANUAL_REQUIRED');
    });

    it('populates explanation string for auto-assigned domains', () => {
        const scoringResult = {
            projectId: 'proj-4',
            scores: [
                { domain: 'HEALTHCARE' as const, matchCount: 20, totalKeywords: 30, confidence: 75, matchedColumns: ['patient_id', 'doctor'] },
            ],
            topDomain: 'HEALTHCARE' as const,
            topConfidence: 75,
            totalMatches: 20,
        };

        const result = classifyDomain(scoringResult);
        expect(result.explanation).toContain('Healthcare');
        expect(result.explanation.length).toBeGreaterThan(10);
    });

    it('populates explanation string for manual-required domains', () => {
        const scoringResult = {
            projectId: 'proj-5',
            scores: [
                { domain: 'FINANCE' as const, matchCount: 5, totalKeywords: 30, confidence: 30, matchedColumns: ['account'] },
            ],
            topDomain: 'FINANCE' as const,
            topConfidence: 30,
            totalMatches: 5,
        };

        const result = classifyDomain(scoringResult);
        expect(result.explanation).toBeTruthy();
        expect(result.explanation.length).toBeGreaterThan(0);
    });

    it('builds correct scoring breakdown for all domains', () => {
        const scoringResult = {
            projectId: 'proj-6',
            scores: [
                { domain: 'ECOMMERCE' as const, matchCount: 10, totalKeywords: 30, confidence: 65, matchedColumns: [] },
                { domain: 'SAAS' as const, matchCount: 2, totalKeywords: 30, confidence: 15, matchedColumns: [] },
            ],
            topDomain: 'ECOMMERCE' as const,
            topConfidence: 65,
            totalMatches: 12,
        };

        const result = classifyDomain(scoringResult);
        expect(result.scoringBreakdown['ECOMMERCE']).toBe(65);
        expect(result.scoringBreakdown['SAAS']).toBe(15);
    });
});

// ─── End-to-End: Scanner → Scorer → Classifier Flow ──────────────

describe('Module 3 — Full Classification Pipeline', () => {
    it('classifies e-commerce dataset end-to-end', () => {
        const ecomColumns = ['order_id', 'product', 'sku', 'price', 'quantity', 'customer', 'cart', 'checkout', 'shipping'];
        const scanResult = buildScanResult(ecomColumns);
        const scored = calculateDomainScores(scanResult);
        const classified = classifyDomain(scored);

        expect(classified.detectedDomain).toBe('ECOMMERCE');
        expect(['AUTO_ASSIGNED', 'MANUAL_REQUIRED']).toContain(classified.status);
    });

    it('classifies SaaS dataset end-to-end', () => {
        const saasColumns = ['user_id', 'subscription', 'mrr', 'churn', 'trial', 'plan', 'billing'];
        const scanResult = buildScanResult(saasColumns);
        const scored = calculateDomainScores(scanResult);
        const classified = classifyDomain(scored);

        expect(classified.detectedDomain).toBe('SAAS');
    });

    it('classifies Retail dataset end-to-end', () => {
        const retailColumns = ['store_id', 'inventory_value', 'shrinkage', 'footfall_count', 'sell-through'];
        const scanResult = buildScanResult(retailColumns);
        const scored = calculateDomainScores(scanResult);
        const classified = classifyDomain(scored);

        expect(classified.detectedDomain).toBe('RETAIL');
    });

    it('classifies Services dataset end-to-end', () => {
        const servicesColumns = ['project_id', 'client_id', 'timesheet', 'billable_hours', 'employee_id'];
        const scanResult = buildScanResult(servicesColumns);
        const scored = calculateDomainScores(scanResult);
        const classified = classifyDomain(scored);

        expect(classified.detectedDomain).toBe('SERVICES');
    });

    it('classifies Manufacturing dataset end-to-end', () => {
        const manufacturingColumns = ['machine_id', 'downtime_hours', 'scrap_rate', 'yield', 'batch_id'];
        const scanResult = buildScanResult(manufacturingColumns);
        const scored = calculateDomainScores(scanResult);
        const classified = classifyDomain(scored);

        expect(classified.detectedDomain).toBe('MANUFACTURING');
    });

    it('handles empty column list gracefully end-to-end', () => {
        const scanResult = buildScanResult([]);
        const scored = calculateDomainScores(scanResult);
        const classified = classifyDomain(scored);

        expect(classified.detectedDomain).toBeNull();
        expect(classified.status).toBe('MANUAL_REQUIRED');
        expect(classified.confidence).toBe(0);
    });
});
