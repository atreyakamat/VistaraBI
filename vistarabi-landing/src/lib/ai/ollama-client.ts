// Ollama Client for AI Semantic Reasoning
// Uses locally hosted Ollama with qwen3:0.6b model

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3:0.6b';

export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// Check if Ollama is available
export async function checkOllamaHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
        });
        return response.ok;
    } catch (error) {
        console.warn('[Ollama] Service not available:', error);
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
    temperature?: number;
}

// Generate completion using Ollama chat API
export async function generateCompletion(options: OllamaGenerateOptions): Promise<string> {
    const {
        model = DEFAULT_MODEL,
        messages = [],
        temperature = 0.3,
    } = options;

    console.log(`[Ollama] Generating with model: ${model}`);

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages,
                stream: false,
                options: {
                    temperature,
                },
            }),
            signal: AbortSignal.timeout(60000), // 60 second timeout
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama chat failed: ${error}`);
        }

        const data = await response.json();
        return data.message?.content || '';
    } catch (error) {
        console.error('[Ollama] Generation error:', error);
        throw error;
    }
}

// Build semantic reasoning prompt for ambiguous domain detection
export interface SemanticReasoningContext {
    projectName: string;
    matchedColumns: { column: string; domain: string; keyword: string }[];
    unmatchedColumns: string[];
    sampleValues: Record<string, string[]>;
    ruleBasedScores: Record<string, number>;
    topDomain: string | null;
    topConfidence: number;
    totalRows: number;
}

export function buildSemanticReasoningPrompt(context: SemanticReasoningContext): OllamaMessage[] {
    const messages: OllamaMessage[] = [
        {
            role: 'system',
            content: `You are a Business Domain Classification Expert for VistaraBI.

Your task: Analyze ambiguous datasets where rule-based detection was WEAK or UNCERTAIN.

Available business domains:
1. ECOMMERCE - Online shopping: orders, products, carts, SKUs, shipping, payments
2. SAAS - Software subscriptions: MRR, ARR, users, plans, churn, licenses
3. EDTECH - Education: students, courses, enrollments, grades, instructors
4. RETAIL - Physical stores: inventory, POS, sales, stock, suppliers
5. SERVICES - Consulting: projects, clients, invoices, hours, billing
6. MANUFACTURING - Production: batches, machines, quality, yield, materials
7. HEALTHCARE - Medical: patients, appointments, diagnoses, treatments
8. FINANCE - Banking: accounts, transactions, loans, investments, ledger

You will receive:
- Columns that matched domain keywords (with which domain)
- Columns that did NOT match any domain (these are ambiguous)
- Sample values from ambiguous columns
- Current rule-based confidence scores

Your job:
1. Analyze the SEMANTIC MEANING of unmatched columns
2. Consider sample values for business context
3. Determine the most likely domain
4. Explain your reasoning

Respond in this EXACT JSON format:
{
  "recommended_domain": "DOMAIN_NAME",
  "semantic_confidence": 0-100,
  "alternative_domain": "DOMAIN_NAME or null",
  "alternative_confidence": 0-100,
  "reasoning": "2-3 sentence explanation of WHY this domain fits",
  "semantic_signals": ["signal1", "signal2", "signal3"],
  "ambiguous_column_insights": "What the unmatched columns likely represent"
}

Be precise. Focus on business meaning.`,
        },
        {
            role: 'user',
            content: `Analyze this AMBIGUOUS dataset:

PROJECT: "${context.projectName}"
ROWS: ${context.totalRows.toLocaleString()}

RULE-BASED SCORES (weak/ambiguous):
${Object.entries(context.ruleBasedScores)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([domain, score]) => `  ${domain}: ${score}%`)
                    .join('\n')}

MATCHED COLUMNS (${context.matchedColumns.length}):
${context.matchedColumns.slice(0, 15).map(m => `  "${m.column}" → ${m.domain} (matched: ${m.keyword})`).join('\n') || '  None'}

UNMATCHED/AMBIGUOUS COLUMNS (${context.unmatchedColumns.length}):
${context.unmatchedColumns.slice(0, 20).join(', ') || 'None'}

SAMPLE VALUES FROM AMBIGUOUS COLUMNS:
${Object.entries(context.sampleValues)
                    .slice(0, 8)
                    .map(([col, vals]) => `  ${col}: ${vals.slice(0, 3).join(', ')}`)
                    .join('\n')}

Current rule-based top pick: ${context.topDomain || 'NONE'} at ${context.topConfidence}%

What is the ACTUAL business domain? Respond with JSON only.`,
        },
    ];

    return messages;
}

// Parse AI semantic response
export interface SemanticDomainSuggestion {
    recommendedDomain: string | null;
    semanticConfidence: number;
    alternativeDomain: string | null;
    alternativeConfidence: number;
    reasoning: string;
    semanticSignals: string[];
    ambiguousColumnInsights: string;
    rawResponse: string;
}

export function parseSemanticResponse(response: string): SemanticDomainSuggestion {
    try {
        // Extract JSON from response (handle thinking tags)
        let cleanResponse = response;

        // Remove <think>...</think> tags if present
        cleanResponse = cleanResponse.replace(/<think>[\s\S]*?<\/think>/g, '');

        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return {
                recommendedDomain: null,
                semanticConfidence: 0,
                alternativeDomain: null,
                alternativeConfidence: 0,
                reasoning: 'Could not parse AI response',
                semanticSignals: [],
                ambiguousColumnInsights: '',
                rawResponse: response,
            };
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            recommendedDomain: parsed.recommended_domain || null,
            semanticConfidence: Math.min(100, Math.max(0, parsed.semantic_confidence || 0)),
            alternativeDomain: parsed.alternative_domain || null,
            alternativeConfidence: Math.min(100, Math.max(0, parsed.alternative_confidence || 0)),
            reasoning: parsed.reasoning || '',
            semanticSignals: parsed.semantic_signals || [],
            ambiguousColumnInsights: parsed.ambiguous_column_insights || '',
            rawResponse: response,
        };
    } catch (error) {
        console.error('[Ollama] Failed to parse response:', error);
        return {
            recommendedDomain: null,
            semanticConfidence: 0,
            alternativeDomain: null,
            alternativeConfidence: 0,
            reasoning: 'Failed to parse AI response',
            semanticSignals: [],
            ambiguousColumnInsights: '',
            rawResponse: response,
        };
    }
}
