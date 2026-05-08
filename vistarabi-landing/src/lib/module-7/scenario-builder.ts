// Module 7: Scenario Builder
// Generates Lean / Balanced / Premium execution plans for each ranked action

import { RankedAction } from './action-ranker';
import { generateCompletion } from '../ai/ollama-client';

export type ScenarioLevel = 'LEAN' | 'BALANCED' | 'PREMIUM';

export interface BudgetScenario {
    level: ScenarioLevel;
    label: string;         // Human-friendly: "Lean", "Balanced", "Premium"
    estimatedCost: string;
    executionPlan: string[];
    timeline: string;
    expectedKpiLift: string;
    monitoringMetrics: string[];
}

export interface ActionWithScenarios extends RankedAction {
    scenarios: BudgetScenario[];
}

// Robust JSON extraction from AI response
function extractJsonArray(text: string): BudgetScenario[] | null {
    try {
        const trimmed = text.trim();
        if (trimmed.startsWith('[')) return JSON.parse(trimmed);
        const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) return JSON.parse(fenced[1].trim());
        const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
        if (arrayMatch) return JSON.parse(arrayMatch[0]);
    } catch { /* fall through */ }
    return null;
}

const LEVEL_META: Record<ScenarioLevel, { label: string; cost: string; timeline: string }> = {
    LEAN: { label: 'Lean', cost: '< $500', timeline: '2-4 weeks' },
    BALANCED: { label: 'Balanced', cost: '$500 – $5k', timeline: '1-2 months' },
    PREMIUM: { label: 'Premium', cost: '> $5k', timeline: '1-3 months' },
};

function buildFallbackScenarios(actionName: string): BudgetScenario[] {
    return [
        {
            level: 'LEAN',
            label: 'Lean',
            estimatedCost: '< $500',
            executionPlan: [
                `Research best practices for "${actionName}" using free resources.`,
                'Implement manually using existing team bandwidth.',
                'Track progress weekly with a simple spreadsheet or free analytics tool.',
            ],
            timeline: '2-4 weeks',
            expectedKpiLift: '3–7%',
            monitoringMetrics: ['Weekly metric delta', 'Manual conversion tracking'],
        },
        {
            level: 'BALANCED',
            label: 'Balanced',
            estimatedCost: '$500 – $5k',
            executionPlan: [
                `Subscribe to a dedicated SaaS tool that automates "${actionName}".`,
                'Assign one team member as the dedicated owner with a clear KPI target.',
                'Set up automated weekly reporting via the tool\'s dashboard.',
            ],
            timeline: '1-2 months',
            expectedKpiLift: '8–15%',
            monitoringMetrics: ['Tool-generated reports', 'KPI trend via VistaraBI dashboard'],
        },
        {
            level: 'PREMIUM',
            label: 'Premium',
            estimatedCost: '> $5k',
            executionPlan: [
                `Engage a specialist agency or consultant to execute "${actionName}" end-to-end.`,
                'Run a full campaign with dedicated budget allocation, A/B testing, and enterprise tooling.',
                'Establish a weekly performance review cadence with the agency against defined OKRs.',
            ],
            timeline: '1-3 months',
            expectedKpiLift: '15–30%',
            monitoringMetrics: ['Agency performance reports', 'ROI dashboard', 'Leading indicator KPIs'],
        },
    ];
}

/**
 * Generates 3-tier budget execution plans (Lean / Balanced / Premium) for each ranked action.
 * Falls back to topic-aware stubs when Ollama is unavailable.
 */
export async function buildScenarios(actions: RankedAction[], preferLocal?: boolean): Promise<ActionWithScenarios[]> {
    const results: ActionWithScenarios[] = [];

    for (const action of actions) {
        const prompt = `For the business strategy "${action.actionName}":...`;

        try {
            const response = await generateCompletion({ 
                prompt, 
                temperature: 0.3,
                preferLocal,
                agentRole: 'scenario-planner'
            });
            const scenarios = extractJsonArray(response);
            if (!scenarios || scenarios.length === 0) throw new Error('No valid scenarios returned');

            results.push({
                ...action,
                scenarios: scenarios.slice(0, 3).map((s, i) => ({
                    ...s,
                    label: LEVEL_META[s.level as ScenarioLevel]?.label ?? s.level,
                })),
            });
        } catch (error) {
            console.error(`[ScenarioBuilder] AI failed for "${action.actionName}", using fallback.`, error);
            results.push({
                ...action,
                scenarios: buildFallbackScenarios(action.actionName),
            });
        }
    }

    return results;
}
