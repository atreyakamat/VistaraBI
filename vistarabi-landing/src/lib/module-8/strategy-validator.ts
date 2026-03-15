import { ForecastRequest, StrategyCanvasResult, ForecastPoint, Milestone } from './types';
import { calculateReliabilityScore } from './validator';
import { generateBaselineForecast } from './prophet-bridge';
import { runMonteCarlo } from './monte-carlo';
import { calculateRampFactor } from './impact-model';

export async function validateStrategy(req: ForecastRequest): Promise<StrategyCanvasResult> {
  const reliabilityScore = calculateReliabilityScore(req.kpiHistory);
  
  if (reliabilityScore < 60) {
    console.warn(`Data reliability is low (${reliabilityScore}). Proceeding with caution.`);
  }

  // 1. Get baseline forecast from Prophet (or fallback)
  const baselineForecast = await generateBaselineForecast(req);
  const baselineValues = baselineForecast.map(f => f.yhat);

  // 2. Build Scenarios
  const optimisticForecast: ForecastPoint[] = [];
  const conservativeForecast: ForecastPoint[] = [];
  const milestones: Milestone[] = [];

  // Track action milestones
  req.actions.forEach(action => {
    milestones.push({
      day: action.startDayOffset,
      date: baselineForecast[action.startDayOffset]?.date || `Day ${action.startDayOffset}`,
      label: `${action.name} Starts`,
      type: 'action_start'
    });
    
    const finishDay = action.startDayOffset + action.rampDays;
    if (finishDay < req.horizonDays) {
      milestones.push({
        day: finishDay,
        date: baselineForecast[finishDay]?.date || `Day ${finishDay}`,
        label: `${action.name} Ramp Complete`,
        type: 'ramp_complete'
      });
    }
  });

  milestones.push({
    day: req.horizonDays,
    date: baselineForecast[req.horizonDays - 1]?.date || `Day ${req.horizonDays}`,
    label: `Goal Target: ${req.goalValue}`,
    type: 'target',
    value: req.goalValue
  });

  // Calculate Scenario Trajectories
  for (let i = 0; i < req.horizonDays; i++) {
    const basePoint = baselineForecast[i];
    
    let optMultiplier = 1;
    req.actions.forEach(action => {
      const ramp = calculateRampFactor(i, action.startDayOffset, action.rampDays);
      optMultiplier *= (1 + (action.expectedUplift * ramp));
    });

    optimisticForecast.push({
      ...basePoint,
      yhat: basePoint.yhat * optMultiplier,
      yhatLower: basePoint.yhatLower * optMultiplier,
      yhatUpper: basePoint.yhatUpper * optMultiplier
    });

    // Conservative scenario: 5% haircut on baseline
    conservativeForecast.push({
      ...basePoint,
      yhat: basePoint.yhat * 0.95,
      yhatLower: basePoint.yhatLower * 0.95,
      yhatUpper: basePoint.yhatUpper * 0.95
    });
  }

  // 3. Monte Carlo Probability
  const probabilityOfSuccess = runMonteCarlo(baselineValues, req.actions, req.goalValue, 1000);

  // 4. Sensitivity (Mock logic for now based on max uplift)
  const primaryDriver = req.actions.length > 0 
    ? [...req.actions].sort((a,b) => b.expectedUplift - a.expectedUplift)[0].name
    : "Organic Growth";
    
  return {
    reliabilityScore,
    probabilityOfSuccess,
    scenarios: {
      baseline: baselineForecast,
      optimistic: optimisticForecast,
      conservative: conservativeForecast
    },
    sensitivity: {
      primaryDriver,
      riskFactor: "Market Volatility"
    },
    milestones: milestones.sort((a, b) => a.day - b.day)
  };
}
