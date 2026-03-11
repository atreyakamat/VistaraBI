// Module 7: Deterministic pipeline stages (no AI dependencies)
import { describe, it, expect } from 'vitest';
import { parseGoal } from '@/lib/module-7/goal-parser';
import { decomposeGoal } from '@/lib/module-7/goal-decomposer';
import { rankActions } from '@/lib/module-7/action-ranker';
import { splitByLocation } from '@/lib/module-7/location-splitter';

describe('Module 7: Goal Engine Pipeline', () => {

    // ─── 1. Goal Parser ──────────────────────────────────────────────

    describe('parseGoal', () => {
        it('parses a revenue / sales goal', async () => {
            const r = await parseGoal('Increase sales by 15% next month');
            expect(r.targetMetric).toBe('revenue');
            expect(r.targetValue).toBe('15%');
            expect(r.timeframe).toBe('next month');
            expect(r.changeDirection).toBe('increase');
            expect(r.changePercent).toBe(15);
        });

        it('parses a churn reduction goal', async () => {
            const r = await parseGoal('Reduce churn by 10% this quarter');
            expect(r.targetMetric).toBe('churn');
            expect(r.changeDirection).toBe('decrease');
            expect(r.changePercent).toBe(10);
        });

        it('parses an MRR goal', async () => {
            const r = await parseGoal('Grow MRR by $50k next month');
            expect(r.targetMetric).toBe('mrr');
            expect(r.changeDirection).toBe('increase');
        });

        it('handles unrecognized metric gracefully', async () => {
            const r = await parseGoal('Do something weird');
            expect(r.targetMetric).toBe('unknown');
            expect(r.changeDirection).toBe('maintain');
        });
    });

    // ─── 2. Goal Decomposer ──────────────────────────────────────────

    describe('decomposeGoal', () => {
        it('decomposes e-commerce revenue into Order Count, AOV, Discount Rate', () => {
            const g = { targetMetric: 'revenue', targetValue: '+20%', timeframe: 'this quarter', kpiId: 'ec-001', changeDirection: 'increase' as const, changePercent: 20 };
            const d = decomposeGoal(g, 'ECOMMERCE');
            expect(d.factors[0].metric).toBe('Order Count');
            const totalWeight = d.factors.reduce((sum: number, f: { weight: number }) => sum + f.weight, 0);
            expect(totalWeight).toBeCloseTo(1.0, 1);
        });

        it('decomposes SaaS churn into Customer Retention factors', () => {
            const g = { targetMetric: 'churn', targetValue: '10%', timeframe: 'next quarter', kpiId: 'saas-003', changeDirection: 'decrease' as const, changePercent: 10 };
            const d = decomposeGoal(g, 'SAAS');
            const names = d.factors.map((f: { metric: string }) => f.metric);
            expect(names).toContain('Customer Retention');
        });

        it('decomposes SaaS MRR into 2 factors', () => {
            const g = { targetMetric: 'mrr', targetValue: '$50k', timeframe: 'next month', kpiId: 'saas-001', changeDirection: 'increase' as const };
            const d = decomposeGoal(g, 'SAAS');
            expect(d.factors.length).toBe(2);
            expect(d.factors[0].metric).toBe('Seat Count / Active Subscribers');
        });

        it('includes formula string', () => {
            const g = { targetMetric: 'revenue', targetValue: '10%', timeframe: 'next quarter', kpiId: 'ec-001', changeDirection: 'increase' as const };
            const d = decomposeGoal(g, 'ECOMMERCE');
            expect(d.formula).toContain('Revenue');
        });

        it('uses generic fallback for unknown metric', () => {
            const g = { targetMetric: 'magic_metric', targetValue: '5%', timeframe: 'next month', changeDirection: 'increase' as const };
            const d = decomposeGoal(g, 'GENERAL');
            expect(d.factors.length).toBe(1);
        });
    });

    // ─── 3. Action Ranker ────────────────────────────────────────────

    describe('rankActions', () => {
        it('ranks correctly based on the composite formula', () => {
            const actions = [
                { id: '1', actionName: 'High', description: '', estimatedEffectiveness: 10, domainFit: 10, costToImplement: 1, speedToMarket: 10 },
                { id: '2', actionName: 'Low', description: '', estimatedEffectiveness: 5, domainFit: 5, costToImplement: 10, speedToMarket: 5 },
            ];
            const ranked = rankActions(actions, 2);
            expect(ranked[0].id).toBe('1');
            expect(ranked[0].confidenceScore).toBe(100);
            expect(ranked[1].id).toBe('2');
            expect(ranked[1].confidenceScore).toBe(1);
        });

        it('assigns tier high for score >= 70', () => {
            const actions = [{ id: 'h1', actionName: 'A', description: '', estimatedEffectiveness: 10, domainFit: 10, costToImplement: 1, speedToMarket: 10 }];
            expect(rankActions(actions, 1)[0].tier).toBe('high');
        });

        it('assigns tier low for score < 40', () => {
            const actions = [{ id: 'l1', actionName: 'A', description: '', estimatedEffectiveness: 2, domainFit: 2, costToImplement: 10, speedToMarket: 2 }];
            expect(rankActions(actions, 1)[0].tier).toBe('low');
        });

        it('returns only topN results', () => {
            const actions = Array.from({ length: 10 }, (_, i) => ({
                id: `a${i}`, actionName: `A${i}`, description: '',
                estimatedEffectiveness: i + 1, domainFit: 5, costToImplement: 5, speedToMarket: 5,
            }));
            expect(rankActions(actions, 3).length).toBe(3);
        });
    });

    // ─── 4. Location Splitter ────────────────────────────────────────

    describe('splitByLocation', () => {
        it('returns single global plan when no locations provided', () => {
            const plans = splitByLocation('20%', [], []);
            expect(plans.length).toBe(1);
            expect(plans[0].locationName).toBe('Global');
        });

        it('returns one plan per location', () => {
            const plans = splitByLocation('20%', [], ['Mumbai', 'Delhi', 'Bangalore']);
            expect(plans.length).toBe(3);
            expect(plans.map((p: { locationName: string }) => p.locationName)).toEqual(['Mumbai', 'Delhi', 'Bangalore']);
        });

        it('assigns HIGH, MEDIUM, LOW in round-robin order', () => {
            const plans = splitByLocation('20%', [], ['A', 'B', 'C']);
            expect(plans.map((p: { performanceTier: string }) => p.performanceTier)).toEqual(['HIGH', 'MEDIUM', 'LOW']);
        });

        it('includes a tier reason for each location', () => {
            const plans = splitByLocation('20%', [], ['City1']);
            expect(plans[0].tierReason.length).toBeGreaterThan(0);
        });
    });
});
