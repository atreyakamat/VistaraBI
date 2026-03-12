// Module 5B — Data Execution Engine
// Public API for dashboard data execution

export { executeDashboard, executeKPI, executeDrill } from './kpi-executor';
export { ensureDataMaterialized } from './data-materializer';
export { invalidateProject, invalidateKPI, invalidateExplanations, getCacheStats, clearAllCaches } from './cache';
export { destroyPool } from './pool';
export { profileDataset } from './data-profiler';
export { getKPIExplanation, batchGenerateExplanations } from './explanation-cache';

export type {
    KPIExecutionResult,
    DashboardExecutionResult,
    DataProfilingResult,
    ExecutionPerformance,
    ExecutionOptions,
    ExecutionErrorPayload,
} from './types';
