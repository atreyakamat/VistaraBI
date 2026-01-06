// Ollama Client for AI Semantic Reasoning
// Uses locally hosted Ollama with qwen3:0.6b model

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen3:0.6b';

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

// Generate completion using Ollama - robust version with retries
export async function generateCompletion(options: OllamaGenerateOptions): Promise<string> {
    const {
        model = DEFAULT_MODEL,
        messages = [],
        prompt,
        temperature = 0.3,
    } = options;

    console.log(`[Ollama] Generating with model: ${model}`);
    console.log(`[Ollama] URL: ${OLLAMA_BASE_URL}`);

    // If prompt is provided, use the simpler /api/generate endpoint
    if (prompt) {
        return generateSimple(prompt, model, temperature);
    }

    // Use chat API for messages
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[Ollama] Attempt ${attempt}/${maxRetries}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout

            const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages,
                    stream: false,
                    options: {
                        temperature,
                        num_predict: 800,
                    },
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[Ollama] API error (${response.status}):`, errorText);
                throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const content = data.message?.content || '';

            console.log(`[Ollama] Response received, length: ${content.length}`);
            return content;

        } catch (error: any) {
            lastError = error;
            console.error(`[Ollama] Attempt ${attempt} failed:`, error.message);

            if (error.name === 'AbortError') {
                console.error('[Ollama] Request timed out');
            }

            if (attempt < maxRetries) {
                console.log('[Ollama] Retrying in 2 seconds...');
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }

    throw lastError || new Error('Ollama generation failed after retries');
}

// Simpler generate endpoint (more reliable for some prompts)
async function generateSimple(prompt: string, model: string, temperature: number): Promise<string> {
    console.log('[Ollama] Using simple /api/generate endpoint');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: {
                    temperature,
                    num_predict: 800,
                },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama generate failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.response || '';

    } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('[Ollama] Generate error:', error);
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
    secondDomain: string | null;
    ambiguityScore: number;
}

export interface SemanticReasoningResult {
    domain: string;
    confidence: number;
    reasoning: string;
    keySignals: string[];
}

// Generate KPI suggestions with a simpler, more robust prompt
export async function generateKPISuggestions(
    columns: string[],
    sampleRows: Record<string, unknown>[],
    domain: string
): Promise<{ name: string; formula: string; category: string; explanation: string }[]> {

    // Build a simple, clear prompt that works well with small models
    const columnList = columns.slice(0, 15).join(', ');
    const sampleJson = JSON.stringify(sampleRows.slice(0, 5));

    const prompt = `Given these data columns: ${columnList}

Sample data: ${sampleJson}

Business domain: ${domain}

Generate 5 KPIs as JSON array. Each KPI must use formulas combining the columns above.

Format exactly like this:
[
{"name": "Average Value", "formula": "SUM(column1) / COUNT(column2)", "category": "revenue", "explanation": "Measures the average value per transaction"},
{"name": "Rate", "formula": "column1 / column2 * 100", "category": "performance", "explanation": "Shows percentage rate"}
]

Only output the JSON array, nothing else:`;

    console.log('[Ollama-KPI] Generating KPI suggestions...');

    try {
        const response = await generateSimple(prompt, DEFAULT_MODEL, 0.4);
        console.log('[Ollama-KPI] Raw response:', response.substring(0, 300));

        // Try to extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('[Ollama-KPI] Parsed', parsed.length, 'KPIs');
            return parsed;
        }

        console.error('[Ollama-KPI] No valid JSON found in response');
        return [];

    } catch (error) {
        console.error('[Ollama-KPI] Error:', error);
        return [];
    }
}

// Perform semantic domain reasoning (for Module 3C)
export async function performSemanticReasoning(
    context: SemanticReasoningContext
): Promise<SemanticReasoningResult> {
    const prompt = buildSemanticPrompt(context);

    try {
        const response = await generateCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'You are a business domain classification expert. Analyze data columns and determine the most likely business domain. Be concise.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2,
        });

        return parseSemanticResponse(response, context);
    } catch (error) {
        console.error('[Ollama] Semantic reasoning failed:', error);
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
