import { describe, it, expect } from 'vitest';
import { parseGoal } from '@/lib/module-7/goal-parser';
import { decomposeGoal } from '@/lib/module-7/goal-decomposer';
import { rankActions } from '@/lib/module-7/action-ranker';

describe('Module 7: Goal Engine Pipeline', () => {
    
    it('should parse a raw goal string', async () => {
        const raw = "Increase sales by 15% next month";
        const parsed = await parseGoal(raw);
        expect(parsed.targetMetric).toBe('revenue');
        // Our regex matches the first occurrence of percentage/value
        expect(parsed.targetValue).toBe('15%');
        expect(parsed.timeframe).toBe('next month');
    });

    it('should decompose a goal into factors', () => {
        const parsed = { targetMetric: 'revenue', targetValue: '+20%', timeframe: 'this quarter', kpiId: 'ec-001' };
        const decomposed = decomposeGoal(parsed, 'ECOMMERCE');
        expect(decomposed.factors.length).toBeGreaterThan(0);
        expect(decomposed.factors[0].metric).toBe('Order Count');
    });

    it('should rank actions correctly based on the formula', () => {
        const actions = [
            {
                id: '1',
                actionName: 'High Performance Action',
                description: '...',
                estimatedEffectiveness: 10,
                domainFit: 10,
                costToImplement: 1, // Cheap (11 - 1 = 10)
                speedToMarket: 10
            },
            {
                id: '2',
                actionName: 'Low Performance Action',
                description: '...',
                estimatedEffectiveness: 5,
                domainFit: 5,
                costToImplement: 10, // Expensive (11 - 10 = 1)
                speedToMarket: 5
            }
        ];

        const ranked = rankActions(actions, 2);
        
        expect(ranked[0].id).toBe('1');
        expect(ranked[0].confidenceScore).toBe(100); // Max possible score
        
        expect(ranked[1].id).toBe('2');
        // Score: (5 * 5 * 1 * 5) / 10000 * 100 = 125 / 100 = 1.25 -> 1
        expect(ranked[1].confidenceScore).toBe(1);
    });
});
