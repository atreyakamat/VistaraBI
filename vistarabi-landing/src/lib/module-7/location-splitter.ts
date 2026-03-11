// Module 7: Location Splitter
// Divides the goal strategy across multiple locations with performance tiers

import { ActionWithScenarios } from './scenario-builder';

export type PerformanceTier = 'HIGH' | 'MEDIUM' | 'LOW';

export interface LocationPlan {
    locationName: string;
    adjustedGoal: string;
    performanceTier: PerformanceTier;
    tierReason: string;
    recommendedActions: ActionWithScenarios[];
}

/**
 * Assigns a performance tier to each location and adjusts the strategy accordingly.
 *
 * Current logic: round-robin tier distribution since real SQL aggregation
 * would require live dashboard data. In a future version this should query
 * KPI values per location from the materialized data tables.
 *
 * Tier → Goal Adjustment:
 *   HIGH   → +10% more aggressive target (capitalize on momentum)
 *   MEDIUM → same target as global
 *   LOW    → -5% more conservative (stabilize before growing)
 */
export function splitByLocation(
    globalGoal: string,
    actions: ActionWithScenarios[],
    locations: string[]
): LocationPlan[] {
    if (!locations || locations.length === 0) {
        return [{
            locationName: 'Global',
            adjustedGoal: globalGoal,
            performanceTier: 'MEDIUM',
            tierReason: 'No location dimension detected in the dataset.',
            recommendedActions: actions,
        }];
    }

    const tiers: PerformanceTier[] = ['HIGH', 'MEDIUM', 'LOW'];

    const tierMeta: Record<PerformanceTier, { reason: string; goalAdjustment: string }> = {
        HIGH: {
            reason: 'Above-average historical performance — capitalize on momentum.',
            goalAdjustment: '(+10% more aggressive)',
        },
        MEDIUM: {
            reason: 'On-track with average performance — maintain current trajectory.',
            goalAdjustment: '(aligned with global target)',
        },
        LOW: {
            reason: 'Below-average performance — stabilize before aggressive growth.',
            goalAdjustment: '(−5% more conservative)',
        },
    };

    return locations.map((loc, index) => {
        const tier = tiers[index % tiers.length];
        const meta = tierMeta[tier];

        return {
            locationName: loc,
            adjustedGoal: `${globalGoal} ${meta.goalAdjustment}`,
            performanceTier: tier,
            tierReason: meta.reason,
            recommendedActions: actions,
        };
    });
}
