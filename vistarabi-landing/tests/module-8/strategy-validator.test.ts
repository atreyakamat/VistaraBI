import { describe, it, expect } from 'vitest';
import { calculateRampFactor } from '../../src/lib/module-8/impact-model';
import { runMonteCarlo } from '../../src/lib/module-8/monte-carlo';
import { calculateReliabilityScore } from '../../src/lib/module-8/validator';
import { generateFallbackLinearForecast } from '../../src/lib/module-8/prophet-bridge';

describe('Module 8: Predictive Strategy Validator', () => {

  describe('Impact Modeling (Ramp-up)', () => {
    it('should return 0 before action starts', () => {
      expect(calculateRampFactor(5, 10, 20)).toBe(0);
    });

    it('should return 1 after ramp is complete', () => {
      expect(calculateRampFactor(40, 10, 20)).toBe(1);
    });

    it('should show non-linear growth (Sigmoid) at midpoint', () => {
      const midpoint = calculateRampFactor(20, 10, 20);
      expect(midpoint).toBeGreaterThan(0.4);
      expect(midpoint).toBeLessThan(0.6);
    });
  });

  describe('Monte Carlo Engine', () => {
    it('should return low probability for impossible goals', () => {
      const baseline = new Array(30).fill(100);
      const goal = 500; // Impossible 5x growth in 30 days
      const prob = runMonteCarlo(baseline, [], goal);
      expect(prob).toBeLessThan(0.05);
    });

    it('should return high probability for easily achievable goals', () => {
      const baseline = new Array(30).fill(100);
      const actions = [{ id: '1', name: 'Ads', expectedUplift: 0.5, rampDays: 1, startDayOffset: 0 }];
      const goal = 110; 
      const prob = runMonteCarlo(baseline, actions, goal);
      expect(prob).toBeGreaterThan(0.9);
    });
  });

  describe('Data Quality Guardrails', () => {
    it('should penalize short history', () => {
      const shortHistory = new Array(30).fill(0).map((_, i) => ({
        date: new Date(Date.now() + i * 86400000).toISOString(),
        value: Math.random() * 100
      }));
      expect(calculateReliabilityScore(shortHistory)).toBeLessThan(70);
    });

    it('should reward deep, clean history', () => {
      const longHistory = new Array(200).fill(0).map((_, i) => ({
        date: new Date(Date.now() + i * 86400000).toISOString(),
        value: 100 + Math.random() * 5 // Low variance, no gaps, >180 days
      }));
      expect(calculateReliabilityScore(longHistory)).toBeGreaterThan(80);
    });
  });

  describe('Prophet Fallback Forecaster', () => {
    it('should generate a linear forecast with expanding confidence bounds', () => {
      const history = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 110 },
        { date: '2023-01-03', value: 120 },
      ];
      
      const req = {
        kpiHistory: history,
        goalValue: 200,
        horizonDays: 5,
        actions: [],
        confidenceLevel: 0.95 as const
      };
      
      const forecast = generateFallbackLinearForecast(req);
      
      expect(forecast).toHaveLength(5);
      expect(forecast[0].yhat).toBeCloseTo(130);
      expect(forecast[1].yhat).toBeCloseTo(140);
      expect(forecast[0].yhatLower).toBeLessThan(forecast[0].yhat);
      expect(forecast[0].yhatUpper).toBeGreaterThan(forecast[0].yhat);
    });
  });
});
