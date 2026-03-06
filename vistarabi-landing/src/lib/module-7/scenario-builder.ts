// Module 7: Scenario Builder
// Generates execution plans for low, medium, and high budgets

import { RankedAction } from './action-ranker';

export interface BudgetScenario {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    estimatedCost: string;
    executionPlan: string[];
    timeline: string;
}

export interface ActionWithScenarios extends RankedAction {
    scenarios: BudgetScenario[];
}

export async function buildScenarios(actions: RankedAction[]): Promise<ActionWithScenarios[]> {
    // TODO: Prompt Ollama to generate 3 budget scenarios per action
    // Stub implementation
    return actions.map(action => ({
        ...action,
        scenarios: [
            {
                level: 'LOW',
                estimatedCost: '< $500',
                executionPlan: ['Manual setup', 'Organic reach'],
                timeline: '2 weeks'
            },
            {
                level: 'MEDIUM',
                estimatedCost: '$500 - $5000',
                executionPlan: ['Use basic tools', 'Light paid ads'],
                timeline: '1 week'
            },
            {
                level: 'HIGH',
                estimatedCost: '> $5000',
                executionPlan: ['Hire agency', 'Full automation'],
                timeline: '1 month'
            }
        ]
    }));
}
