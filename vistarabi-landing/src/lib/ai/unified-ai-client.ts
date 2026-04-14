// Unified AI Client with Fallback Chain
// Priority: Ollama (local) → Ollama (cloud) → OpenRouter (Claude)
// Supports agent-based reasoning with role specialization

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIModelConfig {
    provider: 'ollama-local' | 'ollama-cloud' | 'openrouter';
    model: string;
    baseUrl?: string;
    apiKey?: string;
    timeout: number;
}

export interface AIGenerateOptions {
    messages: AIMessage[];
    temperature?: number;
    maxTokens?: number;
    agentRole?: AgentRole;
    model?: string;
}

export interface AIResponse {
    content: string;
    provider: string;
    model: string;
    tokensUsed?: {
        input: number;
        output: number;
    };
    latencyMs: number;
    agentRole?: AgentRole;
}

// Agent Role System - Specialized AI personas for different tasks
export type AgentRole =
    | 'business-analyst'      // Business insights, KPI interpretation, strategic reasoning
    | 'data-engineer'         // Data quality, transformations, ETL reasoning
    | 'domain-expert'         // Domain classification, business context
    | 'statistician'          // Statistical analysis, correlations, forecasting
    | 'narrative-writer'      // Event narratives, explanations, summaries
    | 'strategy-planner'      // Goal setting, action planning, prescriptive insights
    | 'quality-auditor'       // Data quality assessment, validation
    | 'kpi-designer'          // KPI suggestions, metric formulation
    | 'general';              // General-purpose reasoning

// Role-specific system prompts
const AGENT_SYSTEM_PROMPTS: Record<AgentRole, string> = {
    'business-analyst': `You are an expert business analyst with deep expertise in data-driven decision making.
Your role is to interpret business metrics, identify trends, and provide actionable insights.
Focus on practical business value and strategic implications. Be concise and executive-friendly.`,

    'data-engineer': `You are a senior data engineer specialized in data quality, ETL processes, and data architecture.
Your role is to assess data quality, suggest transformations, and ensure data reliability.
Focus on technical accuracy, data integrity, and scalability. Be precise and technically detailed.`,

    'domain-expert': `You are a business domain classification expert with knowledge across multiple industries.
Your role is to identify business domains, understand industry-specific patterns, and classify datasets accurately.
Focus on recognizing industry conventions, terminology, and data structures.`,

    'statistician': `You are a professional statistician with expertise in data analysis and forecasting.
Your role is to analyze statistical relationships, detect correlations, and provide mathematically sound interpretations.
Focus on statistical rigor, avoiding causal claims without evidence. Always quantify uncertainty.`,

    'narrative-writer': `You are a skilled business writer who translates data insights into clear narratives.
Your role is to create compelling, easy-to-understand explanations of data events and trends.
Focus on clarity, storytelling, and making complex data accessible to all audiences.`,

    'strategy-planner': `You are a strategic planning consultant specialized in goal-driven decision making.
Your role is to help organizations define goals, identify strategies, and create actionable plans.
Focus on practical roadmaps, prioritization, and measurable outcomes.`,

    'quality-auditor': `You are a data quality auditor with expertise in data governance and validation.
Your role is to assess data completeness, consistency, and accuracy.
Focus on identifying quality issues, suggesting remediation, and ensuring data trustworthiness.`,

    'kpi-designer': `You are a KPI architect with expertise in business metrics and performance measurement.
Your role is to design meaningful KPIs, formulate metric calculations, and ensure alignment with business goals.
Focus on measurable, actionable, and business-relevant metrics.`,

    'general': `You are a helpful AI assistant specialized in business analytics and data intelligence.
Provide clear, accurate, and actionable responses based on the data and context provided.`
};

// Get configured AI models in priority order
function getModelConfigs(): AIModelConfig[] {
    const configs: AIModelConfig[] = [];

    // 1. Ollama Local (highest priority)
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen3.5:0.8b';
    configs.push({
        provider: 'ollama-local',
        model: ollamaModel,
        baseUrl: ollamaUrl,
        timeout: 30000, // 30s for local
    });

    // 2. Ollama Cloud (middle priority)
    const cloudUrl = process.env.OLLAMA_CLOUD_URL || process.env.CLOUD_AI_BASE_URL;
    const cloudKey = process.env.OLLAMA_CLOUD_API_KEY || process.env.CLOUD_AI_API_KEY;
    const cloudModel = process.env.OLLAMA_CLOUD_MODEL || process.env.CLOUD_AI_MODEL || 'qwen3.5:397b';

    if (cloudUrl && cloudKey) {
        configs.push({
            provider: 'ollama-cloud',
            model: cloudModel,
            baseUrl: cloudUrl,
            apiKey: cloudKey,
            timeout: 120000, // 120s for cloud
        });
    }

    // 3. OpenRouter (fallback)
    if (process.env.OPENROUTER_API_KEY) {
        configs.push({
            provider: 'openrouter',
            model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
            baseUrl: 'https://openrouter.ai/api/v1',
            apiKey: process.env.OPENROUTER_API_KEY,
            timeout: 120000, // 120s for OpenRouter
        });
    }

    return configs;
}

// Call a specific AI provider
async function callProvider(
    config: AIModelConfig,
    options: AIGenerateOptions
): Promise<AIResponse> {
    const startTime = Date.now();

    try {
        console.log(`[AI] Attempting ${config.provider} with model ${config.model}`);

        if (config.provider === 'ollama-local' || config.provider === 'ollama-cloud') {
            return await callOllama(config, options, startTime);
        } else if (config.provider === 'openrouter') {
            return await callOpenRouter(config, options, startTime);
        }

        throw new Error(`Unknown provider: ${config.provider}`);
    } catch (error: any) {
        const latencyMs = Date.now() - startTime;
        console.error(`[AI] ${config.provider} failed after ${latencyMs}ms:`, error.message);
        throw error;
    }
}

// Call Ollama API (local or cloud)
async function callOllama(
    config: AIModelConfig,
    options: AIGenerateOptions,
    startTime: number
): Promise<AIResponse> {
    const url = `${config.baseUrl}/api/chat`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (config.apiKey) {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: config.model,
                messages: options.messages,
                stream: false,
                options: {
                    temperature: options.temperature ?? 0.2,
                    num_predict: options.maxTokens ?? 8192,
                    num_ctx: 4096, // Limit context to save memory
                },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        let content = data.message?.content || '';

        // Strip reasoning blocks from Qwen models
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        if (!content) {
            throw new Error('Empty response from Ollama');
        }

        return {
            content,
            provider: config.provider,
            model: config.model,
            tokensUsed: {
                input: data.prompt_eval_count || 0,
                output: data.eval_count || 0,
            },
            latencyMs: Date.now() - startTime,
            agentRole: options.agentRole,
        };
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Ollama request timed out after ${config.timeout}ms`);
        }
        throw error;
    }
}

// Call OpenRouter API (OpenAI-compatible)
async function callOpenRouter(
    config: AIModelConfig,
    options: AIGenerateOptions,
    startTime: number
): Promise<AIResponse> {
    const url = `${config.baseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://vistarabi.com',
                'X-Title': 'VistaraBI',
            },
            body: JSON.stringify({
                model: config.model,
                messages: options.messages,
                temperature: options.temperature ?? 0.2,
                max_tokens: options.maxTokens ?? 8192,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();

        if (!content) {
            throw new Error('Empty response from OpenRouter');
        }

        return {
            content,
            provider: config.provider,
            model: config.model,
            tokensUsed: {
                input: data.usage?.prompt_tokens || 0,
                output: data.usage?.completion_tokens || 0,
            },
            latencyMs: Date.now() - startTime,
            agentRole: options.agentRole,
        };
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`OpenRouter request timed out after ${config.timeout}ms`);
        }
        throw error;
    }
}

// Main unified AI client with automatic fallback
export async function generateWithFallback(
    options: AIGenerateOptions
): Promise<AIResponse> {
    const configs = getModelConfigs();

    if (configs.length === 0) {
        throw new Error('No AI providers configured. Please set at least one provider in environment variables.');
    }

    // Add agent role to system message if specified
    const messages = [...options.messages];
    if (options.agentRole && options.agentRole !== 'general') {
        const rolePrompt = AGENT_SYSTEM_PROMPTS[options.agentRole];

        // Insert or prepend system message with role
        const systemMessageIndex = messages.findIndex(m => m.role === 'system');
        if (systemMessageIndex >= 0) {
            messages[systemMessageIndex] = {
                role: 'system',
                content: `${rolePrompt}\n\n${messages[systemMessageIndex].content}`,
            };
        } else {
            messages.unshift({
                role: 'system',
                content: rolePrompt,
            });
        }
    }

    const optionsWithRole = { ...options, messages };
    let lastError: Error | null = null;

    // Try each provider in order
    for (const config of configs) {
        try {
            const response = await callProvider(config, optionsWithRole);
            console.log(`[AI] ✓ Success with ${config.provider} (${response.latencyMs}ms)`);
            return response;
        } catch (error: any) {
            lastError = error;
            console.warn(`[AI] × Failed with ${config.provider}:`, error.message);
            // Continue to next provider
        }
    }

    // All providers failed
    throw new Error(
        `All AI providers failed. Last error: ${lastError?.message || 'Unknown error'}. ` +
        `Tried: ${configs.map(c => c.provider).join(', ')}`
    );
}

// Simple prompt-based generation
export async function generateSimple(
    prompt: string,
    agentRole: AgentRole = 'general',
    temperature: number = 0.2
): Promise<AIResponse> {
    return generateWithFallback({
        messages: [{ role: 'user', content: prompt }],
        temperature,
        agentRole,
    });
}

// Check health of all configured providers
export async function checkAIHealth(): Promise<{
    configured: number;
    available: string[];
    unavailable: string[];
}> {
    const configs = getModelConfigs();
    const available: string[] = [];
    const unavailable: string[] = [];

    for (const config of configs) {
        try {
            // Simple health check
            await callProvider(config, {
                messages: [{ role: 'user', content: 'Hello' }],
                temperature: 0,
                maxTokens: 10,
            });
            available.push(config.provider);
        } catch {
            unavailable.push(config.provider);
        }
    }

    return {
        configured: configs.length,
        available,
        unavailable,
    };
}
