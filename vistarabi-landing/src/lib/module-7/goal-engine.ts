// Module 7: Goal Strategy Engine — Central Orchestrator
// Runs the 7-stage pipeline and produces the final Strategy Canvas

import { parseGoal, ParsedGoal } from './goal-parser';
import { decomposeGoal, DecomposedGoal } from './goal-decomposer';
import { generateActions, GeneratedAction } from './action-generator';
import { rankActions, RankedAction } from './action-ranker';
import { buildScenarios, ActionWithScenarios } from './scenario-builder';
import { splitByLocation, LocationPlan } from './location-splitter';

export interface StrategyCanvas {
    goal: ParsedGoal;
    decomposed: DecomposedGoal;
    topActions: RankedAction[];
    scenarios: ActionWithScenarios[];
    locationSplits: LocationPlan[];
    generatedAt: Date;
    pipelineMs: number; // Total processing time
}

export type PipelineStage =
    | 'PARSING'
    | 'MAPPING'
    | 'DECOMPOSING'
    | 'GENERATING'
    | 'RANKING'
    | 'BUILDING_SCENARIOS'
    | 'LOCATION_SPLIT'
    | 'COMPLETE';

export type StageCallback = (stage: PipelineStage) => void;

/**
 * Main orchestrator for the Module 7 pipeline.
 * Converts a natural language query into a full Strategy Canvas.
 *
 * @param rawQuery       - The user's natural language goal
 * @param domain         - Domain string from Module 3 (e.g. 'ECOMMERCE', 'SAAS')
 * @param locations      - Optional list of location names for Stage 7
 * @param onStageChange  - Optional callback fired at each pipeline stage transition
 */
export async function executeGoalPipeline(
    rawQuery: string,
    domain: string,
    locations: string[] = [],
    onStageChange?: StageCallback
): Promise<StrategyCanvas> {
    const start = Date.now();

    // Stage 1 & 2: Parse natural language + map to KPI
    onStageChange?.('PARSING');
    const goal = await parseGoal(rawQuery);

    onStageChange?.('MAPPING');
    // KPI mapping is embedded in parseGoal (kpiId is already set)

    // Stage 3: Decompose goal into sub-KPI factors
    onStageChange?.('DECOMPOSING');
    const decomposed = decomposeGoal(goal, domain);

    // Stage 4: Generate creative actions using AI
    onStageChange?.('GENERATING');
    const actions = await generateActions(decomposed, domain);

    // Stage 5: Rank and select top 3 actions
    onStageChange?.('RANKING');
    const topActions = rankActions(actions, 3);

    // Stage 6: Build 3-tier scenarios per top action
    onStageChange?.('BUILDING_SCENARIOS');
    const scenarios = await buildScenarios(topActions);

    // Stage 7: Split strategy by location (if applicable)
    onStageChange?.('LOCATION_SPLIT');
    const locationSplits = splitByLocation(goal.targetValue, scenarios, locations);

    onStageChange?.('COMPLETE');

    return {
        goal,
        decomposed,
        topActions,
        scenarios,
        locationSplits,
        generatedAt: new Date(),
        pipelineMs: Date.now() - start,
    };
}
