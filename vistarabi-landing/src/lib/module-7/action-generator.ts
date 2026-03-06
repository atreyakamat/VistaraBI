// Module 7: Action Generator
// Brainstorms 10 creative actions using Ollama

import { DecomposedGoal } from './goal-decomposer';

export interface GeneratedAction {
    id: string;
    actionName: string;
    description: string;
    estimatedEffectiveness: number; // 1-10
    domainFit: number; // 1-10
    costToImplement: number; // 1-10 (1 is cheapest)
    speedToMarket: number; // 1-10 (10 is fastest)
}

export async function generateActions(decomposedGoal: DecomposedGoal, domain: string): Promise<GeneratedAction[]> {
    // TODO: Prompt Ollama for structured JSON actions
    // Stub implementation
    return [
        {
            id: 'action-1',
            actionName: 'Launch Retargeting Campaign',
            description: 'Run dynamic product ads for cart abandoners.',
            estimatedEffectiveness: 8,
            domainFit: 9,
            costToImplement: 4,
            speedToMarket: 8
        }
    ];
}
