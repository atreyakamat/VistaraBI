// Ollama Client for AI Semantic Reasoning
// LEGACY: This client is maintained for backward compatibility
// NEW CODE SHOULD USE: src/lib/ai/unified-ai-client.ts
// This wrapper now uses the unified client internally for automatic fallback

import { generateWithFallback, type AIMessage, type AgentRole } from './unified-ai-client';

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:2b';

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

// Generate KPI suggestions with agent-based reasoning
export async function generateKPISuggestions(
    columns: string[],
    sampleRows: Record<string, unknown>[],
    domain: string,
    model?: string
): Promise<{ name: string; formula: string; category: string; explanation: string }[]> {

    // Build a clear, structured prompt
    const columnList = columns.slice(0, 15).join(', ');
    const sampleJson = JSON.stringify(sampleRows.slice(0, 5));

    const prompt = `Task: Generate exactly 3-5 KPIs for a business in the ${domain} domain.

Input Columns: ${columnList}
Sample Data: ${sampleJson}

Constraints:
1. Use ONLY the column names provided above in the formula.
2. Formulas must use SQL-like aggregations: SUM(col), AVG(col), COUNT(col).
3. Response MUST be a valid JSON array of objects.

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
            model,
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

    try {
        const response = await generateWithFallback({
            messages: [
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
        .map(m => `${m.column} → ${m.domain} (${m.keyword})`)
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
