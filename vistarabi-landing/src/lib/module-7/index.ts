// Module 7: Public API barrel
export { executeGoalPipeline } from './goal-engine';
export type { StrategyCanvas, PipelineStage, StageCallback } from './goal-engine';
export { parseGoal } from './goal-parser';
export type { ParsedGoal } from './goal-parser';
export { decomposeGoal } from './goal-decomposer';
export type { DecomposedGoal, DecomposedFactor } from './goal-decomposer';
export { generateActions } from './action-generator';
export type { GeneratedAction } from './action-generator';
export { rankActions } from './action-ranker';
export type { RankedAction } from './action-ranker';
export { buildScenarios } from './scenario-builder';
export type { BudgetScenario, ActionWithScenarios, ScenarioLevel } from './scenario-builder';
export { splitByLocation } from './location-splitter';
export type { LocationPlan, PerformanceTier } from './location-splitter';
