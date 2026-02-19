// Module 5A — KPI Explainer
// Batch-generates AI explanations for KPI cards using Ollama
// Explanations are cached in DashboardConfig metadata — served instantly on card flip

import { checkOllamaHealth, generateCompletion } from '../ai/ollama-client';
import type { KPIExplanation } from './types';

interface KPIInput {
    kpiId: string;
    kpiName: string;
    formula: string;
    category: string;
    columns: string[];
    currentValue?: number;
    previousValue?: number;
    trendPercent?: number;
}

/**
 * Generate AI explanations for all KPIs in a batch.
 * Returns a map of kpiId → KPIExplanation.
 * Falls back to deterministic explanations if Ollama is unavailable.
 */
export async function generateKPIExplanations(
    kpis: KPIInput[]
): Promise<Record<string, KPIExplanation>> {
    const explanations: Record<string, KPIExplanation> = {};
    const isOllamaAvailable = await checkOllamaHealth();

    for (const kpi of kpis) {
        try {
            if (isOllamaAvailable) {
                explanations[kpi.kpiId] = await generateAIExplanation(kpi);
            } else {
                explanations[kpi.kpiId] = generateDeterministicExplanation(kpi);
            }
        } catch (error) {
            console.warn(`[KPIExplainer] Failed for ${kpi.kpiName}, using fallback:`, error);
            explanations[kpi.kpiId] = generateDeterministicExplanation(kpi);
        }
    }

    return explanations;
}

/**
 * Generate AI-powered explanation using Ollama.
 */
async function generateAIExplanation(kpi: KPIInput): Promise<KPIExplanation> {
    const prompt = buildPrompt(kpi);

    const response = await generateCompletion({
        messages: [
            {
                role: 'system',
                content: 'You are a business intelligence analyst. Provide concise, actionable KPI explanations. Respond in JSON format with keys: explanation, formulaSummary, businessDefinition, recommendation. Keep each under 100 words.',
            },
            { role: 'user', content: prompt },
        ],
        temperature: 0.3,
    });

    try {
        // Try to parse JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                kpiId: kpi.kpiId,
                explanation: parsed.explanation || `Tracks ${kpi.kpiName} using ${kpi.formula}`,
                formulaSummary: parsed.formulaSummary || kpi.formula,
                dataSourceRef: kpi.columns.join(', '),
                businessDefinition: parsed.businessDefinition || `Measures ${kpi.kpiName} across your data`,
                recommendation: parsed.recommendation,
                generatedAt: new Date().toISOString(),
            };
        }
    } catch {
        // JSON parse failed, use response as plain text
    }

    return {
        kpiId: kpi.kpiId,
        explanation: response.slice(0, 300),
        formulaSummary: kpi.formula,
        dataSourceRef: kpi.columns.join(', '),
        businessDefinition: `Measures ${kpi.kpiName} across your data`,
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Generate deterministic explanation (no AI).
 * Used as fallback when Ollama is unavailable.
 */
function generateDeterministicExplanation(kpi: KPIInput): KPIExplanation {
    const aggMatch = kpi.formula.match(/(SUM|AVG|COUNT|MIN|MAX|MEAN)\s*\(\s*(\w+)\s*\)/i);
    const aggType = aggMatch?.[1]?.toUpperCase() || 'AGGREGATE';
    const aggCol = aggMatch?.[2] || kpi.kpiName;

    const aggDescriptions: Record<string, string> = {
        SUM: `Total sum of ${aggCol}`,
        AVG: `Average value of ${aggCol}`,
        COUNT: `Total count of ${aggCol} records`,
        MIN: `Minimum value of ${aggCol}`,
        MAX: `Maximum value of ${aggCol}`,
        MEAN: `Mean value of ${aggCol}`,
    };

    const explanation = aggDescriptions[aggType] || `Computed value of ${kpi.kpiName}`;
    let recommendation: string | undefined;

    if (kpi.trendPercent !== undefined) {
        if (kpi.trendPercent > 10) {
            recommendation = `${kpi.kpiName} is trending up ${kpi.trendPercent.toFixed(1)}%. Monitor for sustained growth patterns.`;
        } else if (kpi.trendPercent < -10) {
            recommendation = `${kpi.kpiName} is declining ${Math.abs(kpi.trendPercent).toFixed(1)}%. Investigate root causes and contributing factors.`;
        } else {
            recommendation = `${kpi.kpiName} is stable. No immediate action required.`;
        }
    }

    return {
        kpiId: kpi.kpiId,
        explanation: `${explanation}. Calculated using "${kpi.formula}" from ${kpi.columns.length} data column(s).`,
        formulaSummary: kpi.formula,
        dataSourceRef: kpi.columns.join(', '),
        businessDefinition: `${kpi.category} metric tracking ${kpi.kpiName.replace(/_/g, ' ')}`,
        recommendation,
        generatedAt: new Date().toISOString(),
    };
}

function buildPrompt(kpi: KPIInput): string {
    let prompt = `Analyze this KPI:\n`;
    prompt += `Name: ${kpi.kpiName}\n`;
    prompt += `Formula: ${kpi.formula}\n`;
    prompt += `Category: ${kpi.category}\n`;
    prompt += `Data Columns: ${kpi.columns.join(', ')}\n`;

    if (kpi.currentValue !== undefined) {
        prompt += `Current Value: ${kpi.currentValue}\n`;
    }
    if (kpi.previousValue !== undefined) {
        prompt += `Previous Value: ${kpi.previousValue}\n`;
    }
    if (kpi.trendPercent !== undefined) {
        prompt += `Trend: ${kpi.trendPercent > 0 ? '+' : ''}${kpi.trendPercent.toFixed(1)}%\n`;
    }

    prompt += `\nProvide a JSON response with: explanation, formulaSummary, businessDefinition, recommendation`;
    return prompt;
}
