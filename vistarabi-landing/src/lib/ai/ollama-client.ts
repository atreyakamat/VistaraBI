// Ollama Local LLM Client for AI Semantic Reasoning
// Uses locally hosted Ollama with qwen3:0.6b model

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3:0.6b';

export interface OllamaMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OllamaResponse {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
    total_duration?: number;
    eval_count?: number;
}

export interface OllamaGenerateOptions {
    model?: string;
    prompt?: string;
    messages?: OllamaMessage[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
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

// Generate completion using chat API
export async function generateCompletion(options: OllamaGenerateOptions): Promise<string> {
    const {
        model = DEFAULT_MODEL,
        messages = [],
        prompt,
        temperature = 0.3,
        stream = false,
    } = options;

    console.log(`[Ollama] Generating with model: ${model}`);

    try {
        // Use chat endpoint for messages
        if (messages.length > 0) {
            const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages,
                    stream,
                    options: {
                        temperature,
                    },
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Ollama chat failed: ${error}`);
            }

            const data: OllamaResponse = await response.json();
            return data.message?.content || '';
        }

        // Use generate endpoint for simple prompts
        if (prompt) {
            const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream,
                    options: {
                        temperature,
                    },
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Ollama generate failed: ${error}`);
            }

            const data = await response.json();
            return data.response || '';
        }

        return '';
    } catch (error) {
        console.error('[Ollama] Generation error:', error);
        throw error;
    }
}

// Structured domain reasoning prompt
export function buildDomainReasoningPrompt(
    projectName: string,
    dataSummary: {
        columns: string[];
        normalizedColumns: string[];
        sampleValues: Record<string, string[]>;
        rowCount: number;
        sourceCount: number;
    }
): OllamaMessage[] {
    const messages: OllamaMessage[] = [
        {
            role: 'system',
            content: `You are a Business Domain Classification Expert. Your task is to analyze dataset metadata and determine what type of business the data most likely represents.

Available business domains:
1. ECOMMERCE - Online shopping, orders, products, carts, payments
2. SAAS - Software subscriptions, MRR, users, plans, churn
3. EDTECH - Education, students, courses, enrollments, grades
4. RETAIL - Physical stores, inventory, POS, sales
5. SERVICES - Consulting, projects, clients, invoicing, hours
6. MANUFACTURING - Production, batches, quality, machines
7. HEALTHCARE - Patients, appointments, diagnoses, treatments
8. FINANCE - Accounts, transactions, loans, investments

Respond in this exact JSON format:
{
  "primary_domain": "DOMAIN_NAME",
  "confidence": 0-100,
  "secondary_domain": "DOMAIN_NAME or null",
  "secondary_confidence": 0-100,
  "reasoning": "2-3 sentences explaining why",
  "key_signals": ["signal1", "signal2", "signal3"]
}

Be precise and focus on column names and data patterns.`,
        },
        {
            role: 'user',
            content: `Analyze this dataset and classify its business domain:

Project: "${projectName}"
Sources: ${dataSummary.sourceCount} files
Rows: ${dataSummary.rowCount.toLocaleString()}

Column Names:
${dataSummary.columns.slice(0, 30).join(', ')}

Normalized Names:
${dataSummary.normalizedColumns.slice(0, 30).join(', ')}

Sample Values:
${Object.entries(dataSummary.sampleValues)
                    .slice(0, 10)
                    .map(([col, vals]) => `${col}: ${vals.slice(0, 3).join(', ')}`)
                    .join('\n')}

What business domain does this data represent? Respond with JSON only.`,
        },
    ];

    return messages;
}

// Parse AI response into structured format
export interface AIDomainSuggestion {
    primaryDomain: string | null;
    confidence: number;
    secondaryDomain: string | null;
    secondaryConfidence: number;
    reasoning: string;
    keySignals: string[];
    rawResponse: string;
}

export function parseAIDomainResponse(response: string): AIDomainSuggestion {
    try {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return {
                primaryDomain: null,
                confidence: 0,
                secondaryDomain: null,
                secondaryConfidence: 0,
                reasoning: 'Could not parse AI response',
                keySignals: [],
                rawResponse: response,
            };
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            primaryDomain: parsed.primary_domain || null,
            confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
            secondaryDomain: parsed.secondary_domain || null,
            secondaryConfidence: Math.min(100, Math.max(0, parsed.secondary_confidence || 0)),
            reasoning: parsed.reasoning || '',
            keySignals: parsed.key_signals || [],
            rawResponse: response,
        };
    } catch (error) {
        console.error('[Ollama] Failed to parse response:', error);
        return {
            primaryDomain: null,
            confidence: 0,
            secondaryDomain: null,
            secondaryConfidence: 0,
            reasoning: 'Failed to parse AI response',
            keySignals: [],
            rawResponse: response,
        };
    }
}
