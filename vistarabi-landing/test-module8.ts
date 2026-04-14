import { validateStrategy } from './src/lib/module-8/strategy-validator';
import type { ForecastRequest } from './src/lib/module-8/types';

async function testForecast() {
  const req: ForecastRequest = {
    kpiHistory: [
      { date: '2024-01-01', value: 100 },
      { date: '2024-01-02', value: 110 },
      { date: '2024-01-03', value: 120 },
      { date: '2024-01-04', value: 115 },
      { date: '2024-01-05', value: 130 },
      { date: '2024-01-06', value: 140 },
      { date: '2024-01-07', value: 135 },
      { date: '2024-01-08', value: 150 },
    ],
    goalValue: 200,
    horizonDays: 10,
    actions: [
      { id: '1', name: 'Discount', expectedUplift: 0.1, rampDays: 2, startDayOffset: 1 }
    ],
    confidenceLevel: 0.8,
    domain: 'RETAIL'
  };

  try {
    const result = await validateStrategy(req);
    console.log("Strategy validation successful!");
    console.log("Probability of Success:", result.probabilityOfSuccess);
    console.log("Reliability Score:", result.reliabilityScore);
    console.log("Baseline Forecast Length:", result.scenarios.baseline.length);
  } catch (error) {
    console.error("Strategy validation failed:", error);
  }
}

testForecast();