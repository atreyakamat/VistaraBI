// Module 7: Action Ranker
// Scores and selects the top N actions using a deterministic formula

import { GeneratedAction } from './action-generator';

export interface RankedAction extends GeneratedAction {
    confidenceScore: number; // 0–100
    tier: 'high' | 'medium' | 'low';
}

/**
 * Ranks generated actions by a composite confidence score.
 *
 * Formula:
 *   rawScore = Effectiveness * DomainFit * (11 - Cost) * Speed
 *   Max possible = 10 * 10 * 10 * 10 = 10,000
 *   confidenceScore = round((rawScore / 10,000) * 100)
 *
 * Tier bands:
 *   ≥ 70 -> high  (green)
 *   ≥ 40 -> medium (amber)
 *   <  40 -> low   (red)
 */
export function rankActions(actions: GeneratedAction[], topN: number = 3): RankedAction[] {
    const ranked = actions.map(action => {
        // Cost is inversed: cheap (1) gives max points (10); expensive (10) gives 1 point
        const inverseCost = 11 - action.costToImplement;
        const rawScore = action.estimatedEffectiveness
            * action.domainFit
            * inverseCost
            * action.speedToMarket;

        const confidenceScore = Math.round((rawScore / 10000) * 100);

        const tier: 'high' | 'medium' | 'low' =
            confidenceScore >= 70 ? 'high' :
                confidenceScore >= 40 ? 'medium' : 'low';

        return { ...action, confidenceScore, tier };
    });

    return ranked
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, topN);
}
