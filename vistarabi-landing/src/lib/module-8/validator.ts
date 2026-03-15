import { KpiDataPoint } from './types';

/**
 * Evaluates the quality of historical data to generate a reliability score.
 */
export function calculateReliabilityScore(history: KpiDataPoint[]): number {
  let score = 100;
  
  const numDays = history.length;
  if (numDays < 90) score -= 40;
  else if (numDays < 180) score -= 10;

  if (numDays < 2) return Math.max(0, score);

  // Check gaps
  let gapsCount = 0;
  for (let i = 1; i < numDays; i++) {
    const d1 = new Date(history[i-1].date).getTime();
    const d2 = new Date(history[i].date).getTime();
    const diffDays = (d2 - d1) / (1000 * 3600 * 24);
    if (diffDays > 1.5) { // more than 1.5 days means a missing day
      gapsCount += Math.floor(diffDays - 1);
    }
  }
  const gapRatio = gapsCount / (numDays + gapsCount);
  if (gapRatio > 0.05) score -= 20;

  // Check outliers
  const values = history.map(h => h.value).sort((a, b) => a - b);
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  let outlierCount = 0;
  history.forEach(h => {
    if (h.value < lowerBound || h.value > upperBound) outlierCount++;
  });
  const outlierRatio = outlierCount / numDays;
  if (outlierRatio > 0.1) score -= 15;

  // Check variability
  const mean = values.reduce((a, b) => a + b, 0) / numDays;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numDays;
  const stdDev = Math.sqrt(variance);
  const cv = mean === 0 ? 0 : stdDev / mean;
  
  if (cv < 0.01) score -= 10;

  return Math.max(0, score);
}
