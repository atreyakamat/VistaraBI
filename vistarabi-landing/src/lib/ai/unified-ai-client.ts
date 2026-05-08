// Unified AI Client with Fallback Chain & Streaming Support
// Priority: OpenRouter (cloud) -> Ollama Cloud -> Ollama Local
// Supports agent-based reasoning with role specialization
// Streaming: Uses SSE for cloud providers, non-streaming for local

import { getDomainSkill, formatSkillForSystemPrompt } from './domain-skills';

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIModelConfig {
    provider: 'ollama-local' | 'ollama-cloud' | 'openrouter' | 'groq';
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
    domain?: string; // Added domain support
    stream?: boolean; // Enable streaming (server-side accumulation)
    /**
     * preferLocal: when true, prefer local Ollama provider; when false prefer cloud (Groq/OpenRouter).
     * When undefined, the server default (process.env.FORCE_GROQ) is applied.
     */
    preferLocal?: boolean;
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
    | 'scenario-planner'      // Multi-tier execution plans and simulations
    | 'quality-auditor'       // Data quality assessment, validation
    | 'kpi-designer'          // KPI suggestions, metric formulation
    | 'general';              // General-purpose reasoning

// Role-specific system prompts
const AGENT_SYSTEM_PROMPTS: Record<AgentRole, string> = {
    // ACTION 3: Refined to be strictly DIAGNOSTIC (backward-looking).
    // Distinction from strategy-planner: BA answers "WHAT happened and WHY" using historical data.
    // Triggers: trend, performance, why, declined, increased, explained, root cause, compared.
    'business-analyst': `You are an expert business analyst focused exclusively on DIAGNOSTIC reasoning.
 Your role is to answer "WHAT happened and WHY" using historical KPI data, metric trends, and period-over-period analysis.
 Interpret business metrics, identify root causes of performance changes, and quantify impacts.
 Do NOT recommend future strategies or action plans — that is handled by the strategy-planner agent.
 Output: Structured diagnostic narrative with supporting data. Be concise and executive-friendly.
 Keywords that should route here: trend, performance, why, declined, increased, explained, root cause, compared, last quarter, YoY.`,

    // Structural tasks: schema design, ETL transformations, data pipeline architecture.
    // De-duplication boundary: DE answers "CAN we store/transform this data" (structural feasibility).
    // Does NOT assess whether data values are correct — that is quality-auditor's domain.
    // Trigger keywords: schema, column, type, ETL, pipeline, transform, join, migrate, ingest, format.
    'data-engineer': `You are a senior data engineer specializing in STRUCTURAL data tasks.
 Your role is to evaluate schema design, ETL transformations, data type correctness, and pipeline architecture.
 Answer questions about whether data can be stored, joined, or transformed correctly at the structural level.
 Do NOT assess whether data values are accurate or complete — that is handled by the quality-auditor agent.
 Focus on: column types, table relationships, ETL logic, data ingestion, and schema compatibility.
 Keywords that should route here: schema, column, type, ETL, pipeline, transform, join, migrate, ingest, format.`,

    'domain-expert': `You are a business domain classification expert with knowledge across multiple industries.
Your role is to identify business domains, understand industry-specific patterns, and classify datasets accurately.
Focus on recognizing industry conventions, terminology, and data structures.`,

    'statistician': `You are a professional statistician with expertise in data analysis and forecasting.
Your role is to analyze statistical relationships, detect correlations, and provide mathematically sound interpretations.
Focus on statistical rigor, avoiding causal claims without evidence. Always quantify uncertainty.`,

    'narrative-writer': `You are a skilled business writer who translates data insights into clear narratives.
Your role is to create compelling, easy-to-understand explanations of data events and trends.
Focus on clarity, storytelling, and making complex data accessible to all audiences.`,

    // ACTION 3: Refined to be strictly PRESCRIPTIVE (forward-looking).
    // Distinction from business-analyst: SP answers "WHAT SHOULD WE DO NEXT" by turning diagnosis into action.
    // Triggers: goal, target, strategy, plan, improve, action, initiative, recommendation, next step, forecast.
    'strategy-planner': `You are a strategic planning consultant focused exclusively on PRESCRIPTIVE reasoning.
 Your role is to answer "WHAT SHOULD WE DO NEXT" by translating diagnosed problems into concrete action plans.
 You define goals, recommend initiatives, simulate expected impact, and create prioritized roadmaps.
 Do NOT re-diagnose historical data — that is handled by the business-analyst agent.
 Output: Actionable roadmap with timeline, measurable KPI targets, and expected outcomes.
 Keywords that should route here: goal, target, strategy, plan, improve, action, initiative, recommendation, next step, forecast, Q3, achieve.`,

    'scenario-planner': `You are a senior execution planner specialized in business scenario modeling.
 Your role is to take a strategic action and generate concrete execution tiers (Lean, Balanced, Premium).
 For each tier, you provide estimated costs, action steps, timelines, and expected metric improvements.
 Focus on operational feasibility and tiered investment levels.`,

    // Accuracy tasks: data value completeness, consistency, anomaly detection, validation.
    // De-duplication boundary: QA answers "IS this data correct/complete" (value accuracy).
    // Does NOT assess structural schema issues — that is data-engineer's domain.
    // Trigger keywords: missing, null, anomaly, outlier, duplicate, inconsistent, invalid, bad data, validate.
    'quality-auditor': `You are a data quality auditor specializing in ACCURACY tasks.
 Your role is to assess whether data values are complete, consistent, valid, and free of anomalies.
 Identify missing values, duplicates, outliers, format violations, and rule breaches.
 Do NOT address schema design or ETL structural issues — that is handled by the data-engineer agent.
 Focus on: null rates, value distributions, referential integrity, data freshness, and business rule violations.
 Keywords that should route here: missing, null, anomaly, outlier, duplicate, inconsistent, invalid, bad data, validate, completeness.`,

    'kpi-designer': `You are a KPI architect with expertise in business metrics and performance measurement.
Your role is to design meaningful KPIs, formulate metric calculations, and ensure alignment with business goals.
Focus on measurable, actionable, and business-relevant metrics.`,

    'general': `You are a helpful AI assistant specialized in business analytics and data intelligence.
Provide clear, accurate, and actionable responses based on the data and context provided.`
};

// Get configured AI models in priority order
function getModelConfigs(preferLocal?: boolean): AIModelConfig[] {
    const configs: AIModelConfig[] = [];

    // Local / Cloud definitions
    const localConfigs: AIModelConfig[] = [];
    const cloudConfigs: AIModelConfig[] = [];

    // 0. Groq (Highest Priority — Groq exposes an OpenAI-compatible API)
    if (process.env.GROQ_API_KEY) {
        cloudConfigs.push({
            provider: 'groq', // handled via OpenAI-compatible call path (callOpenRouter)
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
            apiKey: process.env.GROQ_API_KEY,
            timeout: 30000, // Groq is fast — 30s is generous
        });
    }

    // 1. OpenRouter (cloud fallback — paid, wide model selection)
    if (process.env.OPENROUTER_API_KEY) {
        cloudConfigs.push({
            provider: 'openrouter',
            model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
            baseUrl: 'https://openrouter.ai/api/v1',
            apiKey: process.env.OPENROUTER_API_KEY,
            timeout: 60000,
        });
    }

    // 2. Ollama Cloud (if a real API endpoint is configured — NOT ollama.com)
    const cloudUrl = process.env.OLLAMA_CLOUD_URL || process.env.CLOUD_AI_BASE_URL;
    const cloudKey = process.env.OLLAMA_CLOUD_API_KEY || process.env.CLOUD_AI_API_KEY;
    const cloudModelEnv = process.env.OLLAMA_CLOUD_MODEL || process.env.CLOUD_AI_MODEL || 'qwen3:0.6b';

    if (cloudUrl && cloudKey && !cloudUrl.includes('ollama.com')) {
        cloudConfigs.push({
            provider: 'ollama-cloud',
            model: cloudModelEnv,
            baseUrl: cloudUrl,
            apiKey: cloudKey,
            timeout: 60000,
        });
    }

    // 3. Ollama Local (dev only — not available in cloud deployments)
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'qwen3:0.6b';
    // Skip local Ollama if we're in a cloud environment (Render, Railway, Vercel, etc.)
    const isCloudEnv = !!(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.VERCEL);
    if (!isCloudEnv) {
        localConfigs.push({
            provider: 'ollama-local',
            model: ollamaModel,
            baseUrl: ollamaUrl,
            timeout: 90000,
        });
    }

    const defaultPreferLocal = process.env.FORCE_GROQ !== 'true' && process.env.PREFER_LOCAL !== 'false';
    const useLocal = preferLocal ?? defaultPreferLocal;

    if (useLocal) {
        // If local is preferred, put local then cloud
        configs.push(...localConfigs, ...cloudConfigs);
    } else {
        // If cloud is preferred, put cloud then local
        configs.push(...cloudConfigs, ...localConfigs);
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

        if (config.provider === 'openrouter' || config.provider === 'groq') {
            // OpenRouter/Groq expose OpenAI-compatible endpoints — use the same handler
            return await callOpenRouter(config, options, startTime);
        }
        if (config.provider === 'ollama-local' || config.provider === 'ollama-cloud') {
            return await callOllama(config, options, startTime);
        }

        throw new Error(`Unknown provider: ${config.provider}`);
    } catch (error: any) {
        const latencyMs = Date.now() - startTime;
        console.error(`[AI] ${config.provider} failed after ${latencyMs}ms:`, error.message);
        throw error;
    }
}

// Call Ollama API (local or cloud) — uses streaming to accumulate response
async function callOllama(
    config: AIModelConfig,
    options: AIGenerateOptions,
    startTime: number
): Promise<AIResponse> {
    const url = `${config.baseUrl}/api/chat`;
    const useStreaming = options.stream !== false && config.provider === 'ollama-cloud';

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
                model: options.model || config.model,
                messages: options.messages,
                stream: useStreaming,
                options: {
                    temperature: options.temperature ?? 0.2,
                    num_predict: options.maxTokens ?? 512,
                    num_ctx: 2048, // Reduced from 4096 to save ~1.5GB RAM
                },
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error ${response.status}: ${errorText}`);
        }

        let content: string;
        let inputTokens = 0;
        let outputTokens = 0;

        if (useStreaming && response.body) {
            // Stream mode: accumulate chunks server-side
            content = '';
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                // Ollama streams newline-delimited JSON
                const lines = chunk.split('\n').filter(l => l.trim());
                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.message?.content) {
                            content += parsed.message.content;
                        }
                        if (parsed.done) {
                            inputTokens = parsed.prompt_eval_count || 0;
                            outputTokens = parsed.eval_count || 0;
                        }
                    } catch {
                        // Skip malformed chunks
                    }
                }
            }
        } else {
            // Non-streaming: parse full response
            const data = await response.json();
            content = data.message?.content || '';
            inputTokens = data.prompt_eval_count || 0;
            outputTokens = data.eval_count || 0;
        }

        // Strip reasoning blocks from Qwen models
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        if (!content) {
            throw new Error('Empty response from Ollama');
        }

        return {
            content,
            provider: config.provider,
            model: options.model || config.model,
            tokensUsed: { input: inputTokens, output: outputTokens },
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

// Call OpenRouter API (OpenAI-compatible) — uses streaming for faster TTFB
async function callOpenRouter(
    config: AIModelConfig,
    options: AIGenerateOptions,
    startTime: number
): Promise<AIResponse> {
    const url = `${config.baseUrl}/chat/completions`;
    const useStreaming = options.stream !== false;

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
                max_tokens: options.maxTokens ?? 1024,
                stream: useStreaming,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
        }

        let content: string;
        let inputTokens = 0;
        let outputTokens = 0;

        if (useStreaming && response.body) {
            // SSE streaming: accumulate delta chunks
            content = '';
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

                for (const line of lines) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) content += delta;

                        // Capture usage from the final chunk
                        if (parsed.usage) {
                            inputTokens = parsed.usage.prompt_tokens || 0;
                            outputTokens = parsed.usage.completion_tokens || 0;
                        }
                    } catch {
                        // Skip malformed SSE frames
                    }
                }
            }
        } else {
            // Non-streaming fallback
            const data = await response.json();
            content = data.choices?.[0]?.message?.content?.trim() || '';
            inputTokens = data.usage?.prompt_tokens || 0;
            outputTokens = data.usage?.completion_tokens || 0;
        }

        if (!content) {
            throw new Error('Empty response from OpenRouter');
        }

        return {
            content,
            provider: config.provider,
            model: config.model,
            tokensUsed: { input: inputTokens, output: outputTokens },
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
    const configs = getModelConfigs(options.preferLocal);

    if (configs.length === 0) {
        throw new Error('No AI providers configured. Please set at least one provider in environment variables.');
    }

    // Add agent role to system message if specified
    const messages = [...options.messages];
    if (options.agentRole && options.agentRole !== 'general') {
        let rolePrompt = AGENT_SYSTEM_PROMPTS[options.agentRole];

        // NEW: Inject domain skill if domain is provided and role is analytic/strategic
        if (options.domain) {
            const domainSkill = getDomainSkill(options.domain);
            if (domainSkill) {
                rolePrompt = `${rolePrompt}\n\n${formatSkillForSystemPrompt(domainSkill, options.domain)}`;
            }
        }

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
    const skippedProviders: string[] = [];

    // Try each provider in order
    for (const config of configs) {
        try {
            // If provider is local and it failed recently, skip immediately
            if (config.provider === 'ollama-local' && lastError?.message.includes('timeout')) {
                 console.warn(`[AI] Skipping ${config.provider} due to previous timeout`);
                 skippedProviders.push(config.provider);
                 continue;
            }
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
        `Tried (in rotation): ${configs.filter(c => !skippedProviders.includes(c.provider)).map(c => `${c.provider} (${c.model})`).join(', ')}`
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
            // Simple health check — non-streaming, low tokens
            await callProvider(config, {
                messages: [{ role: 'user', content: 'Hello' }],
                temperature: 0,
                maxTokens: 10,
                stream: false,
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
