import { test, expect } from 'vitest';
import { executeGoalPipeline } from '../src/lib/module-7/goal-engine';

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
});
