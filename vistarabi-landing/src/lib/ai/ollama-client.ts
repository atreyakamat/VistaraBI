// Ollama Client for AI Semantic Reasoning
// Uses locally hosted Ollama with qwen3:0.6b model
// Domain-specific models are registered via scripts/register-modelfiles.ps1

import type { DomainType } from '@/lib/prisma';
import { getDomainKPINames } from '@/lib/kpi/domain-metadata';
import { generateWithFallback, type AIMessage } from './unified-ai-client';

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:0.8b';

// ─── Domain-to-Model Router ───────────────────────────────────────────────────

/**
 * Returns the registered Ollama model name for a given domain.
 * Falls back to DEFAULT_MODEL if the domain-specific model is not available.
 */
export function getDomainModel(domain: DomainType | string | null | undefined): string {
    const map: Record<string, string> = {
        ECOMMERCE:     'vistara-analytics-ecommerce',
        SAAS:          'vistara-analytics-saas',
        EDTECH:        'vistara-analytics-edtech',
        RETAIL:        'vistara-analytics-retail',
        SERVICES:      'vistara-analytics-services',
        MANUFACTURING: 'vistara-analytics-manufacturing',
        HEALTHCARE:    'vistara-analytics-healthcare',
        FINANCE:       'vistara-analytics-finance',
    };
    // If DISABLE_DOMAIN_MODELS env var is set, always use default (useful in CI)
    if (process.env.DISABLE_DOMAIN_MODELS === 'true') return DEFAULT_MODEL;
    return (domain && map[domain as string]) ? map[domain as string] : DEFAULT_MODEL;
}

export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// Check if Ollama is available and model is loaded
export async function checkOllamaHealth(): Promise<boolean> {
    try {
        console.log('[Ollama] Checking health at:', OLLAMA_BASE_URL);
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            console.error('[Ollama] Health check failed:', response.status);
            return false;
        }

        const data = await response.json();
        const models = data.models?.map((m: any) => m.name) || [];
        console.log('[Ollama] Available models:', models);

        // Check if our default model is available
        const hasModel = models.some((m: string) => m.includes('qwen'));
        if (!hasModel) {
            console.warn('[Ollama] qwen model not found. Available:', models);
        }

        return true;
    } catch (error) {
        console.error('[Ollama] Service not available:', error);
        return false;
    }
}

// List available models
export async function listModels(): Promise<string[]> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (!response.ok) return [];

        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
        console.error('[Ollama] Failed to list models:', error);
        return [];
    }
}

export interface OllamaGenerateOptions {
    model?: string;
    messages?: OllamaMessage[];
    prompt?: string; // For simple prompts
    temperature?: number;
}

// Generate completion using unified AI client with automatic fallback
export async function generateCompletion(options: OllamaGenerateOptions): Promise<string> {
    const {
        model = DEFAULT_MODEL,
        messages = [],
        prompt,
        temperature = 0.3,
    } = options;

    try {
        // Convert to unified client format
        const aiMessages: AIMessage[] = prompt
            ? [{ role: 'user', content: prompt }]
            : messages.map(m => ({
                role: m.role as 'system' | 'user' | 'assistant',
                content: m.content,
            }));

        const response = await generateWithFallback({
            messages: aiMessages,
            temperature,
            model,
        });

        return response.content;
    } catch (error: any) {
        console.error('[Ollama-Client] All AI providers failed:', error.message);
        throw new Error(`AI generation failed: ${error.message}`);
    }
}

// Simpler generate endpoint - now uses unified client
async function generateSimple(prompt: string, model: string, temperature: number): Promise<string> {
    const response = await generateWithFallback({
        messages: [{ role: 'user', content: prompt }],
        temperature,
        model,
    });
    return response.content;
}

// Build semantic reasoning prompt for ambiguous domain detection
export interface SemanticReasoningContext {
    projectName: string;
    matchedColumns: { column: string; domain: string; keyword: string }[];
    unmatchedColumns: string[];
    sampleValues: Record<string, string[]>;
    ruleBasedScores: Record<string, number>;
    topDomain: string | null;
    secondDomain: string | null;
    ambiguityScore: number;
}

export interface SemanticReasoningResult {
    domain: string;
    confidence: number;
    reasoning: string;
    keySignals: string[];
}

// Generate KPI suggestions with a domain-aware, enriched prompt
export async function generateKPISuggestions(
    columns: string[],
    sampleRows: Record<string, unknown>[],
    domain: string,
    model?: string
): Promise<{ name: string; formula: string; category: string; explanation: string }[]> {

    // Route to domain-specific model if available; caller's model overrides when explicitly provided
    const kpiModel = model || getDomainModel(domain as DomainType);

    // Inject domain KPI vocabulary so the local model knows what to look for
    const domainKPINames = getDomainKPINames(domain as DomainType).slice(0, 8);
    const domainVocab = domainKPINames.length > 0
        ? `Known ${domain} KPIs include: ${domainKPINames.join(', ')}.`
        : '';

    // Build a clear prompt that works well with small models
    const columnList = columns.slice(0, 15).join(', ');
    const sampleJson = JSON.stringify(sampleRows.slice(0, 5));

    const prompt = `Task: Generate exactly 3-5 KPIs for a business in the ${domain} domain.

${domainVocab}

Input Columns: ${columnList}
Sample Data: ${sampleJson}

Constraints:
1. Use ONLY the column names provided above in the formula.
2. Formulas must use SQL-like aggregations: SUM(col), AVG(col), COUNT(col).
3. Prefer KPIs that match the known ${domain} vocabulary listed above.
4. Response MUST be a valid JSON array of objects.

Output format:
[
  {
    "name": "KPI Name",
    "formula": "SUM(column_name)",
    "category": "category",
    "explanation": "why this matters"
  }
]

JSON Array:`;

    console.log('[KPI-Generator] Generating KPI suggestions with kpi-designer agent');

    try {
        const response = await generateWithFallback({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            model: kpiModel,
            agentRole: 'kpi-designer', // Use specialized KPI designer agent
        });

        console.log('[KPI-Generator] Raw response:', response.content.substring(0, 300));

        // Try to extract JSON from response
        const jsonMatch = response.content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('[KPI-Generator] Parsed', parsed.length, 'KPIs');
            return parsed;
        }

        console.error('[KPI-Generator] No valid JSON found in response');
        return [];

    } catch (error) {
        console.error('[KPI-Generator] Error:', error);
        return [];
    }
}

// Perform semantic domain reasoning (for Module 3C) with domain expert agent
export async function performSemanticReasoning(
    context: SemanticReasoningContext
): Promise<SemanticReasoningResult> {
    const prompt = buildSemanticPrompt(context);

    // Build a domain-aware system message when we have a strong candidate
    const topDomainHint = context.topDomain
        ? ` The rule-based engine's top candidate is "${context.topDomain}" — validate or override this based on the column signals.`
        : '';

    try {
        const response = await generateWithFallback({
            model: getDomainModel(context.topDomain as DomainType),
            messages: [
                {
                    role: 'system',
                    content: `You are a business domain classification expert for VistaraBI. Analyze data columns and determine the most likely business domain from: ECOMMERCE, SAAS, EDTECH, RETAIL, SERVICES, MANUFACTURING, HEALTHCARE, FINANCE.${topDomainHint} Be concise and return only valid JSON.`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2,
            agentRole: 'domain-expert', // Use domain expert for classification
        });

        return parseSemanticResponse(response.content, context);
    } catch (error) {
        console.error('[Domain-Reasoning] Semantic reasoning failed:', error);
        return {
            domain: context.topDomain || 'UNKNOWN',
            confidence: 0.3,
            reasoning: 'AI reasoning failed, using rule-based detection.',
            keySignals: [],
        };
    }
}

function buildSemanticPrompt(context: SemanticReasoningContext): string {
    const matchedInfo = context.matchedColumns
        .slice(0, 10)
        .map(m => `${m.column} -> ${m.domain} (${m.keyword})`)
        .join('\n');

    const scoresInfo = Object.entries(context.ruleBasedScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([domain, score]) => `${domain}: ${score}%`)
        .join(', ');

    return `Analyze this data to determine the business domain.

Columns matched to domains:
${matchedInfo}

Current scores: ${scoresInfo}
Top candidates: ${context.topDomain} vs ${context.secondDomain}

What is the most likely business domain? Respond with JSON:
{"domain": "DOMAIN_NAME", "confidence": 0.85, "reasoning": "brief explanation", "keySignals": ["signal1", "signal2"]}`;
}

function parseSemanticResponse(
    response: string,
    context: SemanticReasoningContext
): SemanticReasoningResult {
    try {
        const jsonMatch = response.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                domain: parsed.domain || context.topDomain || 'UNKNOWN',
                confidence: parsed.confidence || 0.7,
                reasoning: parsed.reasoning || 'AI-assisted classification',
                keySignals: parsed.keySignals || [],
            };
        }
    } catch (e) {
        console.error('[Ollama] Failed to parse semantic response:', e);
    }

    return {
        domain: context.topDomain || 'UNKNOWN',
        confidence: 0.5,
        reasoning: response.substring(0, 200),
        keySignals: [],
    };
}
