// Module 5C — Cognitive Insight Layer
// Public API re-exports

// Core generators
export { generateKPIInsight, generateDashboardInsights } from './insight-generator';

// Engines
export { detectAnomaly, computeStats } from './anomaly-detector';
export { computeChangeAttribution } from './change-attribution';
export { renderLineageExplanation, renderTrendSummary } from './explanation-renderer';
export { computeTrend, computeOverallTrend, identifyTopContributors, findChangeDrivers } from './trend-analyzer';

// Types
export type {
    AnomalySeverity,
    AnomalyDirection,
    AnomalyFlag,
    AnomalyResult,
    SegmentContribution,
    ChangeAttribution,
    TrendDirection,
    TrendSummary,
    KPIInsight,
    InsightFeedItem,
    SmartAlert,
    KPIExplanationPayload,
    InsightsResponse,
} from './types';
