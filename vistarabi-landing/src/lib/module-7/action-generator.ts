// Module 7: Action Generator
// Brainstorms strategic business actions using AI (Ollama)

import { DecomposedGoal } from './goal-decomposer';
import { generateCompletion } from '../ai/ollama-client';

export interface GeneratedAction {
    id: string;
    actionName: string;
    description: string;
    estimatedEffectiveness: number; // 1-10
    domainFit: number; // 1-10
    costToImplement: number; // 1-10 (1 = cheapest)
    speedToMarket: number; // 1-10 (10 = fastest)
}

// Robust JSON extraction: handles both raw arrays and code-fenced blocks
function extractJsonArray(text: string): GeneratedAction[] | null {
    try {
        // Try direct parse
        const trimmed = text.trim();
        if (trimmed.startsWith('[')) {
            return JSON.parse(trimmed);
        }
        // Try code fence extraction
        const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) {
            return JSON.parse(fenced[1].trim());
        }
        // Try finding the first [...] block
        const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            return JSON.parse(arrayMatch[0]);
        }
    } catch {
        // Fall through to null
    }
    return null;
}

// Domain-generic fallback actions used when Ollama is unavailable
const FALLBACK_ACTIONS: Record<string, GeneratedAction[]> = {
    default: [
        {
            id: 'fb-1',
            actionName: 'Organic Social Media Push',
            description: 'Increase post frequency on main social channels with targeted content tied to seasonal trends.',
            estimatedEffectiveness: 5,
            domainFit: 8,
            costToImplement: 1,
            speedToMarket: 9,
        },
        {
            id: 'fb-2',
            actionName: 'Targeted Email Campaign',
            description: 'Segment the customer list and run personalized email sequences targeting high-LTV segments.',
            estimatedEffectiveness: 7,
            domainFit: 9,
            costToImplement: 2,
            speedToMarket: 8,
        },
        {
            id: 'fb-3',
            actionName: 'Referral / Word-of-Mouth Program',
            description: 'Launch an incentive-based referral program rewarding existing customers for bringing in new ones.',
            estimatedEffectiveness: 8,
            domainFit: 8,
            costToImplement: 3,
            speedToMarket: 6,
        },
        {
            id: 'fb-4',
            actionName: 'Paid Search Expansion',
            description: 'Increase Google Ads spend on high-converting keywords while pausing underperforming campaigns.',
            estimatedEffectiveness: 7,
            domainFit: 7,
            costToImplement: 6,
            speedToMarket: 9,
        },
        {
            id: 'fb-5',
            actionName: 'Conversion Rate Optimisation (CRO)',
            description: 'Run A/B tests on landing pages, CTAs, and checkout flow to reduce drop-off and increase conversion.',
            estimatedEffectiveness: 8,
            domainFit: 9,
            costToImplement: 3,
            speedToMarket: 5,
        },
        {
            id: 'fb-6',
            actionName: 'Loyalty & Rewards Program',
            description: 'Introduce a points-based loyalty system to improve repeat purchase frequency and customer retention.',
            estimatedEffectiveness: 7,
            domainFit: 8,
            costToImplement: 4,
            speedToMarket: 4,
        },
    ],
};

/**
 * Prompts the AI model to generate strategic business actions.
 * Forces structured JSON output for the pipeline.
 * Falls back to rich domain-specific stubs if Ollama is unavailable.
 */
export async function generateActions(decomposedGoal: DecomposedGoal, domain: string, preferLocal?: boolean): Promise<GeneratedAction[]> {
    const factorList = decomposedGoal.factors
        .map(f => `- ${f.metric}: ${f.requiredChange} (${f.description})`)
        .join('\n');

    const prompt = `You are a strategic business analyst for the ${domain} industry...`;

    try {
        const response = await generateCompletion({
            prompt,
            temperature: 0.7,
            preferLocal,
            agentRole: 'strategy-planner',
        });

        const actions = extractJsonArray(response);
        if (!actions || actions.length === 0) throw new Error('No valid JSON array found in response');

        return actions.map((a, index) => ({
            ...a,
            id: a.id || `action-${index + 1}`,
        }));
    } catch (error) {
        console.error('[ActionGenerator] AI generation failed, using fallback stubs.', error);
        return FALLBACK_ACTIONS.default;
    }
}
