import { StrategicAction } from './types';
import { calculateRampFactor } from './impact-model';

/**
 * Runs a Monte Carlo simulation to calculate the probability of hitting a goal.
 * @param baselineValues The projected baseline values (e.g. from Prophet).
 * @param actions The strategic actions being applied.
 * @param goal The target KPI value.
 * @param iterations Number of simulated futures (default 1000).
 * @returns The probability of success (0.0 to 1.0).
 */
export function runMonteCarlo(
  baselineValues: number[], 
  actions: StrategicAction[], 
  goal: number,
  iterations = 1000
): number {
  if (baselineValues.length === 0) return 0;

  let successes = 0;
  const horizon = baselineValues.length;
  const finalDayIndex = horizon - 1;
  const baseFinalValue = baselineValues[finalDayIndex];

  for (let i = 0; i < iterations; i++) {
    let simulatedValue = baseFinalValue;

    // 1. Market Volatility (Noise): Random normal-ish distribution +/- 5%
    // Using a simple uniform approximation for speed, could use Box-Muller for true normal
    const noise = (Math.random() - 0.5) * 0.10; // -5% to +5% range
    simulatedValue *= (1 + noise);

    // 2. Action Execution Risk
    actions.forEach(action => {
      // Execution quality typically ranges from 70% to 110% of the plan
      const executionQuality = 0.7 + Math.random() * 0.4;
      
      // Calculate ramp factor at the end of the horizon
      const rampFactor = calculateRampFactor(finalDayIndex, action.startDayOffset, action.rampDays);
      
      const realizedUplift = action.expectedUplift * executionQuality * rampFactor;
      simulatedValue *= (1 + realizedUplift);
    });

    if (simulatedValue >= goal) {
      successes++;
    }
  }

  return successes / iterations;
}
