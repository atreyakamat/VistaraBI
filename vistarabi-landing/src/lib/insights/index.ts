// Module 5C — Explainable Dashboard & AI Insight Engine
// Public API re-exports

export { generateKPIInsight, generateDashboardInsights } from './insight-generator';
export { detectAnomalies, detectLatestAnomaly, computeStats } from './anomaly-detector';
export { computeTrend, computeOverallTrend, identifyTopContributors, findChangeDrivers } from './trend-analyzer';
export type {
    KPIInsight,
    AnomalyResult,
    AnomalySeverity,
    AnomalyDirection,
    TrendSummary,
    TrendDirection,
    TopContributor,
    KPIExplanationPayload,
    DashboardInsightsPayload,
    InsightType,
} from './types';
