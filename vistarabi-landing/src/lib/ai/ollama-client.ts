// Ollama Client for AI Semantic Reasoning
// Uses locally hosted Ollama with qwen2.5:3b model

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

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

    const cloudApiKey = process.env.CLOUD_AI_API_KEY; // e.g., Groq or OpenAI key placeholder
    const cloudApiUrl = process.env.CLOUD_AI_BASE_URL; // e.g., https://api.groq.com/openai/v1

    // If a cloud configuration is fully provided, bypass local Ollama and use OpenAI-compatible API
    const useCloud = Boolean(cloudApiKey && cloudApiUrl);
    const resolvedUrl = useCloud ? `${cloudApiUrl}/chat/completions` : `${OLLAMA_BASE_URL}/api/chat`;
    const resolvedModel = useCloud && process.env.CLOUD_AI_MODEL ? process.env.CLOUD_AI_MODEL : model;

    console.log(`[AI-Client] Generating with model: ${resolvedModel} (Cloud: ${useCloud})`);

    // If prompt is provided and we're local, use the simpler /api/generate endpoint
    if (prompt && !useCloud) {
        return generateSimple(prompt, resolvedModel, temperature);
    }

    // Convert prompt to message array if using Cloud and prompt was provided
    const payloadMessages = prompt ? [{ role: 'user', content: prompt }] : messages;

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[AI-Client] Attempt ${attempt}/${maxRetries}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout

            const payload = useCloud ? {
                model: resolvedModel,
                messages: payloadMessages,
                temperature,
                max_tokens: 800,
            } : {
                model: resolvedModel,
                messages: payloadMessages,
                stream: false,
                options: {
                    temperature,
                    num_predict: 800,
                },
            };

            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (useCloud && cloudApiKey) headers['Authorization'] = `Bearer ${cloudApiKey}`;

            const response = await fetch(resolvedUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[AI-Client] API error (${response.status}):`, errorText);
                throw new Error(`AI API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            // Cloud API uses choices[0].message.content, Ollama uses message.content
            let content = '';
            if (useCloud) {
                content = data.choices?.[0]?.message?.content || '';
            } else {
                content = data.message?.content || '';
            }

            // Strip reasoning blocks for any qwen models (local or cloud reasoning models)
            content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

            console.log(`[AI-Client] Response received, length: ${content.length}`);
            return content;

        } catch (error: any) {
            lastError = error;
            console.error(`[AI-Client] Attempt ${attempt} failed:`, error.message);

            if (error.name === 'AbortError') {
                console.error('[AI-Client] Request timed out');
            }

            if (attempt < maxRetries) {
                console.log('[AI-Client] Retrying in 2 seconds...');
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }

    throw lastError || new Error('AI generation failed after retries');
}

// Simpler generate endpoint (more reliable for some prompts on local Ollama)
async function generateSimple(prompt: string, model: string, temperature: number): Promise<string> {
    const cloudApiKey = process.env.CLOUD_AI_API_KEY;
    const cloudApiUrl = process.env.CLOUD_AI_BASE_URL;
    const useCloud = Boolean(cloudApiKey && cloudApiUrl);

    if (useCloud) {
        // Reroute to the general completion function, which handles cloud chat completions natively
        return generateCompletion({ prompt, model, temperature });
    }

    console.log('[Ollama] Using local simple /api/generate endpoint');

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
                    num_predict: 1200,
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
        let text: string = data.response || '';

        // Strip qwen3 <think>...</think> reasoning blocks so only the JSON remains
        text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        return text;

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
    domain: string,
    model?: string
): Promise<{ name: string; formula: string; category: string; explanation: string }[]> {

    // Use the provided model or fall back to qwen3:4b (needs 4B+ params for reliable JSON output)
    const kpiModel = model || 'qwen3:4b';

    // Build a simple, clear prompt that works well with small models
    const columnList = columns.slice(0, 15).join(', ');
    const sampleJson = JSON.stringify(sampleRows.slice(0, 5));

    const prompt = `You are a data analyst. Given these columns: ${columnList}

Sample rows: ${sampleJson}

Business domain: ${domain}

Generate 5 KPIs. Each KPI MUST use only the exact column names listed above.

Respond ONLY with a JSON array, no other text:
[{"name": "Total Revenue", "formula": "SUM(order_value)", "category": "revenue", "explanation": "Total revenue across all orders"}]

JSON array:`;

    console.log('[Ollama-KPI] Generating KPI suggestions with model:', kpiModel);

    try {
        const response = await generateSimple(prompt, kpiModel, 0.3);
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
