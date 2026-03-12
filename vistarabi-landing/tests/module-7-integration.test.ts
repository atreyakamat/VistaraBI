import { test, expect, vi } from 'vitest';
import { executeGoalPipeline } from '../src/lib/module-7/goal-engine';

// Mock generateCompletion to avoid slow AI calls during integration testing
vi.mock('../src/lib/ai/ollama-client', () => ({
    generateCompletion: vi.fn((options) => {
        const prompt = options.prompt || '';
        
        // Mock response for generateActions (Stage 4)
        if (prompt.includes('highly specific, actionable strategies')) {
            return JSON.stringify([
                {
                    id: 'a1',
                    actionName: 'Organic Social Media Push',
                    description: 'Increase post frequency on main social channels with targeted content.',
                    estimatedEffectiveness: 5,
                    domainFit: 8,
                    costToImplement: 1,
                    speedToMarket: 9
                },
                {
                    id: 'a2',
                    actionName: 'Targeted Email Campaign',
                    description: 'Segment the customer list and run personalized email sequences.',
                    estimatedEffectiveness: 7,
                    domainFit: 9,
                    costToImplement: 2,
                    speedToMarket: 8
                },
                {
                    id: 'a3',
                    actionName: 'Referral Program',
                    description: 'Launch an incentive-based referral program.',
                    estimatedEffectiveness: 8,
                    domainFit: 8,
                    costToImplement: 3,
                    speedToMarket: 6
                }
            ]);
        }
        
        // Mock response for buildScenarios (Stage 6)
        if (prompt.includes('execution plans based on investment level')) {
            return JSON.stringify([
                {
                    level: 'LEAN',
                    label: 'Lean',
                    estimatedCost: '< $500',
                    executionPlan: ['Step 1', 'Step 2', 'Step 3'],
                    timeline: '2 weeks',
                    expectedKpiLift: '5-10%',
                    monitoringMetrics: ['Metric 1', 'Metric 2']
                },
                {
                    level: 'BALANCED',
                    label: 'Balanced',
                    estimatedCost: '$500 - $5k',
                    executionPlan: ['Step 1', 'Step 2', 'Step 3'],
                    timeline: '1 month',
                    expectedKpiLift: '10-20%',
                    monitoringMetrics: ['Metric 1', 'Metric 2']
                },
                {
                    level: 'PREMIUM',
                    label: 'Premium',
                    estimatedCost: '> $5k',
                    executionPlan: ['Step 1', 'Step 2', 'Step 3'],
                    timeline: '2 months',
                    expectedKpiLift: '20-40%',
                    monitoringMetrics: ['Metric 1', 'Metric 2']
                }
            ]);
        }
        
        return '[]';
    }),
    checkOllamaHealth: vi.fn(() => Promise.resolve(true))
}));

test('Integration Test: Module 7 connected with Domain (Module 3)', async () => {
    const rawQuery = 'Increase revenue by 20% this quarter';
    const domain = 'ECOMMERCE';
    const locations = ['Mumbai', 'Delhi', 'Bangalore'];

    const canvas = await executeGoalPipeline(rawQuery, domain, locations);

    // Assert it mapped correctly based on domain
    expect(canvas.goal.targetMetric).toBe('revenue');
    expect(canvas.goal.targetValue).toBe('20%');

    // Assert decomposition happened using Module 4 concepts
    expect(canvas.decomposed.primaryMetric).toBe('revenue');
    expect(canvas.decomposed.factors.length).toBeGreaterThan(0);

    // Assert scenarios generated
    expect(canvas.scenarios.length).toBeGreaterThan(0);
    expect(canvas.scenarios[0].scenarios.length).toBe(3); // LEAN, BALANCED, PREMIUM

    // Assert Location Splitter worked
    expect(canvas.locationSplits.length).toBe(3);
    const splitNames = canvas.locationSplits.map(s => s.locationName);
    expect(splitNames).toContain('Mumbai');
    expect(splitNames).toContain('Delhi');
    expect(splitNames).toContain('Bangalore');
}, 10000);
