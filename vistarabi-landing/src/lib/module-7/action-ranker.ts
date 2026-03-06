// Module 7: Action Ranker
// Scores and selects the top actions

import { GeneratedAction } from './action-generator';

export interface RankedAction extends GeneratedAction {
    confidenceScore: number; // 0-100
}

export function rankActions(actions: GeneratedAction[], topN: number = 3): RankedAction[] {
    // Formula: Score = (Effectiveness × DomainFit × (11 - Cost) × Speed) / 4 (normalized)
    const ranked = actions.map(action => {
        // Cost is inversed (cheaper is better)
        const inverseCost = 11 - action.costToImplement;
        const rawScore = (action.estimatedEffectiveness * action.domainFit * inverseCost * action.speedToMarket);
        // Max possible = 10 * 10 * 10 * 10 = 10000
        const confidenceScore = Math.round((rawScore / 10000) * 100);

        return {
            ...action,
            confidenceScore
        };
    });

    return ranked.sort((a, b) => b.confidenceScore - a.confidenceScore).slice(0, topN);
}
