// Module 7: Goal Strategy Engine Orchestrator
// Orchestrates the 7-stage pipeline to generate a Strategy Canvas

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
}

/**
 * Main orchestrator for the Module 7 pipeline.
 * Converts a natural language query into a full Strategy Canvas.
 */
export async function executeGoalPipeline(
    rawQuery: string,
    domain: string,
    locations: string[] = []
): Promise<StrategyCanvas> {
    // Stage 1 & 2: Parse and Map Goal (Mapping handled inside parser stub for now)
    const goal = await parseGoal(rawQuery);

    // Stage 3: Decompose Goal into sub-KPIs
    const decomposed = decomposeGoal(goal, domain);

    // Stage 4: Generate creative actions using AI
    const actions = await generateActions(decomposed, domain);

    // Stage 5: Rank and filter actions
    const topActions = rankActions(actions);

    // Stage 6: Build 3x3 scenarios per top action
    const scenarios = await buildScenarios(topActions);

    // Stage 7: Split strategy across locations (if any)
    const locationSplits = splitByLocation(goal.targetValue, scenarios, locations);

    return {
        goal,
        decomposed,
        topActions,
        scenarios,
        locationSplits,
        generatedAt: new Date()
    };
}
