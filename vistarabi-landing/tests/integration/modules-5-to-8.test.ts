import { describe, it, expect, vi } from 'vitest';
import { runMonteCarlo } from '../../src/lib/module-8/monte-carlo';
import { calculateReliabilityScore } from '../../src/lib/module-8/validator';
import { generateFallbackLinearForecast } from '../../src/lib/module-8/prophet-bridge';
import { StrategicAction, ForecastRequest } from '../../src/lib/module-8/types';

// Mocking the Module 6 AI call
const mockCallLLM = vi.fn().mockImplementation(async (prompt: string) => {
  if (prompt.includes("Why is my revenue dropping?")) {
    return JSON.stringify({
      intent: "SET_GOAL",
      metric: "Revenue",
      suggestedTarget: 80000
    });
  }
  return JSON.stringify({ intent: "UNKNOWN" });
});

// Mocking the Module 7 Strategy Generation
const mockGenerateStrategies = vi.fn().mockImplementation((goalTarget: number): StrategicAction[] => {
  return [
    {
      id: "action-1",
      name: "Aggressive Email Marketing",
      expectedUplift: 0.15,
      rampDays: 20,
      startDayOffset: 7
    }
  ];
});

describe('Integrated Workflow: Modules 5 -> 6 -> 7 -> 8', () => {

  it('should successfully pass data from dashboard history to a validated mathematical strategy', async () => {
    
    // ---------------------------------------------------------
    // STEP 1: MODULE 5 (Dashboard / Data Observation)
    // ---------------------------------------------------------
    // The user observes their dashboard. We load historical data.
    const module5History = [];
    let baseRevenue = 50000;
    for (let i = 0; i < 90; i++) {
      baseRevenue += (Math.random() - 0.4) * 200; // Slight upward trend
      module5History.push({
        date: new Date(Date.now() - (90 - i) * 86400000).toISOString().split('T')[0],
        value: baseRevenue
      });
    }

    const currentRevenue = module5History[module5History.length - 1].value;
    expect(module5History).toHaveLength(90);
    expect(currentRevenue).toBeGreaterThan(45000);

    // ---------------------------------------------------------
    // STEP 2: MODULE 6 (AI Governance & Intent)
    // ---------------------------------------------------------
    // User asks the AI about the data.
    const aiResponse = await mockCallLLM("Why is my revenue dropping? We need to fix this.");
    const parsedIntent = JSON.parse(aiResponse);
    
    expect(parsedIntent.intent).toBe("SET_GOAL");
    expect(parsedIntent.suggestedTarget).toBe(80000);

    // ---------------------------------------------------------
    // STEP 3: MODULE 7 (Goal Strategy Generation)
    // ---------------------------------------------------------
    // Module 7 takes the intent and generates concrete actions.
    const strategies = mockGenerateStrategies(parsedIntent.suggestedTarget);
    
    expect(strategies).toHaveLength(1);
    expect(strategies[0].name).toBe("Aggressive Email Marketing");
    expect(strategies[0].expectedUplift).toBe(0.15);

    // ---------------------------------------------------------
    // STEP 4: MODULE 8 (Predictive Validator & Simulation)
    // ---------------------------------------------------------
    // Pass the Mod 5 History + Mod 7 Strategies into Mod 8.
    
    // 4A. Validate the Data Quality
    const reliability = calculateReliabilityScore(module5History);
    expect(reliability).toBeGreaterThan(50); // Since we provided 90 days of clean data

    // 4B. Generate Baseline (Using linear fallback for unit tests to avoid Python dependency)
    const forecastReq: ForecastRequest = {
      kpiHistory: module5History,
      goalValue: parsedIntent.suggestedTarget,
      horizonDays: 60,
      actions: strategies,
      confidenceLevel: 0.95
    };
    
    const baseline = generateFallbackLinearForecast(forecastReq);
    expect(baseline).toHaveLength(60);
    
    const baselineValues = baseline.map(f => f.yhat);

    // 4C. Run Monte Carlo Simulation
    const probOfSuccess = runMonteCarlo(
      baselineValues, 
      strategies, 
      parsedIntent.suggestedTarget, 
      1000 // iterations
    );

    // Ensure the simulation returns a valid mathematical probability (0 to 1)
    expect(probOfSuccess).toBeGreaterThanOrEqual(0);
    expect(probOfSuccess).toBeLessThanOrEqual(1);

    // Log the outcome to verify the integration pipeline
    // console.log(`Integrated Pipeline Complete. Probability of hitting ${parsedIntent.suggestedTarget}: ${(probOfSuccess * 100).toFixed(1)}%`);
  });

});
