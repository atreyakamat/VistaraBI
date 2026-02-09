// Explanation Generator - Module 4D-B
// Generates technical and business explanations for KPIs

import { generateCompletion, checkOllamaHealth } from '@/lib/ai/ollama-client';
import {
    KPISourceContribution,
    KPIAggregation,
    KPIJoinPath,
} from '@/lib/prisma';

export interface ExplanationContext {
    kpiName: string;
    formula: string;
    domain: string;
    category: string;
    sources: KPISourceContribution[];
    joins: KPIJoinPath[];
    aggregations: KPIAggregation[];
}

export interface Explanations {
    technical: string;
    business: string;
    aiEnhanced: boolean;
}

// Aggregation descriptions
const AGG_DESCRIPTIONS: Record<string, { technical: string; business: string }> = {
    'SUM': { technical: 'SUM', business: 'total' },
    'AVG': { technical: 'AVG', business: 'average' },
    'COUNT': { technical: 'COUNT', business: 'count' },
    'COUNT_DISTINCT': { technical: 'COUNT DISTINCT', business: 'unique count' },
    'MIN': { technical: 'MIN', business: 'minimum' },
    'MAX': { technical: 'MAX', business: 'maximum' },
};

// Generate technical explanation (formula-based)
export function generateTechnicalExplanation(context: ExplanationContext): string {
    const parts: string[] = [];

    // Describe aggregations
    if (context.aggregations.length > 0) {
        const aggParts = context.aggregations.map(agg => {
            const source = context.sources.find(s => s.sourceId === agg.sourceId);
            const tableName = source?.sourceName?.replace(/\.[^.]+$/, '') || 'table';
            return `${AGG_DESCRIPTIONS[agg.function]?.technical || agg.function}(${agg.column}) from ${tableName}`;
        });
        parts.push(aggParts.join(', '));
    }

    // Describe joins
    if (context.joins.length > 0) {
        const joinParts = context.joins.map(j =>
            `${j.joinType} JOIN on ${j.sourceTable}.${j.sourceColumn} = ${j.targetTable}.${j.targetColumn}`
        );
        parts.push(joinParts.join('; '));
    }

    // Add formula
    parts.push(`Formula: ${context.formula}`);

    return parts.join('. ') + '.';
}

// Generate business explanation (human-friendly)
export function generateBusinessExplanation(context: ExplanationContext): string {
    const parts: string[] = [];

    // Start with what the KPI measures
    parts.push(`${context.kpiName} measures`);

    // Describe what is being calculated
    if (context.aggregations.length > 0) {
        const aggDescriptions = context.aggregations.map(agg => {
            const source = context.sources.find(s => s.sourceId === agg.sourceId);
            const tableName = source?.sourceName?.replace(/\.[^.]+$/, '').replace(/_/g, ' ') || 'your data';
            const aggDesc = AGG_DESCRIPTIONS[agg.function]?.business || 'calculates';

            // Make column name more readable
            const readableColumn = agg.column.replace(/_/g, ' ').toLowerCase();

            return `the ${aggDesc} of ${readableColumn} from ${tableName}`;
        });
        parts.push(aggDescriptions.join(' and '));
    } else {
        const sourceNames = context.sources
            .map(s => s.sourceName.replace(/\.[^.]+$/, '').replace(/_/g, ' '))
            .join(' and ');
        parts.push(`data from ${sourceNames}`);
    }

    // Describe joins in business terms
    if (context.joins.length > 0) {
        const joinDesc = context.joins.map(j => {
            const sourceTable = j.sourceTable.replace(/_/g, ' ');
            const targetTable = j.targetTable.replace(/_/g, ' ');
            return `${sourceTable} linked to ${targetTable}`;
        });
        parts.push(`, combining ${joinDesc.join(' and ')}`);
    }

    // Add domain context
    if (context.domain && context.domain !== 'Unknown') {
        parts.push(`. This is a ${context.domain.toLowerCase()} metric`);
    }

    return parts.join('') + '.';
}

// Enhance explanation with AI (optional)
export async function enhanceExplanationWithAI(
    context: ExplanationContext,
    baseExplanation: string
): Promise<{ enhanced: string; success: boolean }> {
    console.log('[ExplainGen] Attempting AI enhancement for:', context.kpiName);

    // Check if Ollama is available
    const isAvailable = await checkOllamaHealth();
    if (!isAvailable) {
        console.log('[ExplainGen] Ollama not available, using base explanation');
        return { enhanced: baseExplanation, success: false };
    }

    try {
        const prompt = `Rephrase this KPI explanation to be more clear and business-friendly. Keep it concise (1-2 sentences):

KPI Name: ${context.kpiName}
Category: ${context.category}
Domain: ${context.domain}
Current explanation: ${baseExplanation}

Respond with only the improved explanation, nothing else.`;

        const response = await generateCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'You are a business analyst who explains technical metrics in simple terms. Be concise and clear.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.3,
        });

        const enhanced = response.trim();
        if (enhanced && enhanced.length > 10 && enhanced.length < 500) {
            console.log('[ExplainGen] AI enhancement successful');
            return { enhanced, success: true };
        }
    } catch (error) {
        console.error('[ExplainGen] AI enhancement failed:', error);
    }

    return { enhanced: baseExplanation, success: false };
}

// Generate both explanations
export async function generateExplanations(
    context: ExplanationContext,
    useAI: boolean = true
): Promise<Explanations> {
    // Generate base explanations
    const technical = generateTechnicalExplanation(context);
    let business = generateBusinessExplanation(context);
    let aiEnhanced = false;

    // Optionally enhance with AI
    if (useAI) {
        const result = await enhanceExplanationWithAI(context, business);
        if (result.success) {
            business = result.enhanced;
            aiEnhanced = true;
        }
    }

    return {
        technical,
        business,
        aiEnhanced,
    };
}

// Quick explanation without AI
export function generateQuickExplanation(context: ExplanationContext): Explanations {
    return {
        technical: generateTechnicalExplanation(context),
        business: generateBusinessExplanation(context),
        aiEnhanced: false,
    };
}
