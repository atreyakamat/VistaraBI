export interface StrategicAction {
  id: string;
  name: string;
  expectedUplift: number; // e.g., 0.15 for 15%
  rampDays: number;       // How long to reach full effect (S-Curve)
  startDayOffset: number; // When the action begins (relative to forecast start)
  regressors?: Record<string, number>; // External drivers (spend, discount)
}

export interface KpiDataPoint {
  date: string;
  value: number;
}

export interface ForecastRequest {
  kpiHistory: KpiDataPoint[];
  goalValue: number;
  horizonDays: number;
  actions: StrategicAction[];
  confidenceLevel: 0.80 | 0.95;
  domain?: string;
}

export interface ForecastPoint {
  date: string;
  day: number;
  yhat: number;       // Predicted value
  yhatLower: number;  // Lower confidence bound
  yhatUpper: number;  // Upper confidence bound
  actual?: number;    // Real value if historical
}

export interface Milestone {
  day: number;
  date: string;
  label: string;
  type: 'action_start' | 'ramp_complete' | 'target';
  value?: number;
}

export interface StrategyCanvasResult {
  reliabilityScore: number;
  probabilityOfSuccess: number;
  scenarios: {
    baseline: ForecastPoint[];
    optimistic: ForecastPoint[];
    conservative: ForecastPoint[];
  };
  sensitivity: {
    primaryDriver: string;
    riskFactor: string;
  };
  milestones: Milestone[];
}
