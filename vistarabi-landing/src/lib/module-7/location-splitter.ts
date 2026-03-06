// Module 7: Location Splitter
// Divides goal logic across multiple locations (if applicable)

import { ActionWithScenarios } from './scenario-builder';

export interface LocationPlan {
    locationName: string;
    adjustedGoal: string;
    recommendedActions: ActionWithScenarios[];
}

export function splitByLocation(
    globalGoal: string,
    actions: ActionWithScenarios[],
    locations: string[]
): LocationPlan[] {
    // TODO: Adjust goals per location based on historical performance
    if (!locations || locations.length === 0) {
        return [{
            locationName: 'Global',
            adjustedGoal: globalGoal,
            recommendedActions: actions
        }];
    }

    return locations.map(loc => ({
        locationName: loc,
        adjustedGoal: globalGoal, // Stub: everyone gets same goal for now
        recommendedActions: actions
    }));
}
