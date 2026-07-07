// Unified AI Client with Fallback Chain & Streaming Support
// Priority: NVIDIA NIM → Groq → OpenRouter → Ollama Cloud → Ollama Local
// Supports agent-based reasoning with role specialization
// Streaming: Uses SSE for cloud providers, non-streaming for local
// NVIDIA NIM: OpenAI-compatible API at https://integrate.api.nvidia.com/v1

import { getDomainSkill, formatSkillForSystemPrompt } from './domain-skills';
import type { AIRoutingMode } from './ai-mode';

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIModelConfig {
    provider: 'ollama-local' | 'ollama-cloud' | 'openrouter' | 'groq' | 'nvidia-nim';
    model: string;
    baseUrl?: string;
    apiKey?: string;
    timeout: number;
    /** NIM-specific thinking-model options (Nemotron, etc.) */
    nimOptions?: {
        enableThinking: boolean;
        reasoningBudget: number;
        topP: number;
    };
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
    /**
     * routingMode gives the account-level selector sharper semantics:
     * - local-only: local Ollama only
     * - cloud-first: Groq/OpenRouter/Ollama Cloud first, then local fallback
     * - auto: local first, then cloud fallback
     */
    routingMode?: AIRoutingMode;
}

export interface AIResponse {
    content: string;
    /** Chain-of-thought from NIM thinking models (reasoning_content). Strip before showing to end-users. */
    reasoning?: string;
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

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown): boolean {
    return !!error &&
        typeof error === 'object' &&
        'name' in error &&
        (error as { name?: unknown }).name === 'AbortError';
}

// Get configured AI models in priority order
function getModelConfigs(preferLocal?: boolean, routingMode?: AIRoutingMode): AIModelConfig[] {
    const configs: AIModelConfig[] = [];

    // Local / Cloud definitions
    const localConfigs: AIModelConfig[] = [];
    const cloudConfigs: AIModelConfig[] = [];

    // 0a. NVIDIA NIM (Highest Priority — OpenAI-compatible, enterprise-grade inference)
    // Nemotron-3-Ultra-550B is a thinking model: streams reasoning_content + content.
    // Uses temperature=1, top_p=0.95, reasoning_budget=16384 per NVIDIA's recommendation.
    if (process.env.NVIDIA_NIM_API_KEY) {
        const nimModel = process.env.NVIDIA_NIM_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';
        const isThinkingModel = nimModel.includes('nemotron') || nimModel.includes('thinking');
        cloudConfigs.push({
            provider: 'nvidia-nim',
            model: nimModel,
            baseUrl: process.env.NVIDIA_NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1',
            apiKey: process.env.NVIDIA_NIM_API_KEY,
            timeout: 300000, // Thinking models can take longer — 5 min
            nimOptions: isThinkingModel ? {
                enableThinking: true,
                reasoningBudget: 16384,
                topP: 0.95,
            } : undefined,
        });
    }

    // 0b. Groq (Fast cloud inference — OpenAI-compatible)
    if (process.env.GROQ_API_KEY) {
        cloudConfigs.push({
            provider: 'groq',
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
            baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
            apiKey: process.env.GROQ_API_KEY,
            timeout: 30000,
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
        if (cloudUrl.includes('openai') || cloudUrl.includes('groq') || cloudUrl.includes('openrouter')) {
            cloudConfigs.push({
                provider: 'openrouter',
                model: cloudModelEnv,
                baseUrl: cloudUrl,
                apiKey: cloudKey,
                timeout: 60000,
            });
        } else {
            cloudConfigs.push({
                provider: 'ollama-cloud',
                model: cloudModelEnv,
                baseUrl: cloudUrl,
                apiKey: cloudKey,
                timeout: 60000,
            });
        }
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
            timeout: 5000,
        });
    }

    const defaultRoutingMode: AIRoutingMode = process.env.NODE_ENV === 'test'
        ? 'auto'
        : process.env.FORCE_GROQ === 'true'
            ? 'cloud-first'
            : process.env.PREFER_LOCAL === 'true'
                ? 'auto'
                : 'cloud-first';
    const effectiveRoutingMode = routingMode
        ?? (preferLocal === true ? 'auto' : preferLocal === false ? 'cloud-first' : defaultRoutingMode);

    if (effectiveRoutingMode === 'local-only') {
        configs.push(...localConfigs);
    } else if (effectiveRoutingMode === 'cloud-first') {
        configs.push(...cloudConfigs, ...localConfigs);
    } else {
        configs.push(...localConfigs, ...cloudConfigs);
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

        if (config.provider === 'openrouter' || config.provider === 'groq' || config.provider === 'nvidia-nim') {
            // OpenRouter / Groq / NVIDIA NIM all expose OpenAI-compatible endpoints
            return await callOpenRouter(config, options, startTime);
        }
        if (config.provider === 'ollama-local' || config.provider === 'ollama-cloud') {
            return await callOllama(config, options, startTime);
        }

        throw new Error(`Unknown provider: ${config.provider}`);
    } catch (error: unknown) {
        const latencyMs = Date.now() - startTime;
        console.error(`[AI] ${config.provider} failed after ${latencyMs}ms:`, getErrorMessage(error));
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
            // Auto-pull if model is missing
            if (response.status === 404 || errorText.includes('not found')) {
                 console.log(`[AI] Model ${options.model || config.model} missing. Triggering async pull...`);
                 fetch(`${config.baseUrl}/api/pull`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ name: options.model || config.model })
                 }).catch(() => {});
                 
                 throw new Error(`Local model '${options.model || config.model}' is missing and is now downloading in the background. Please try again in a few minutes.`);
            }

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
    } catch (error: unknown) {
        clearTimeout(timeoutId);
        if (isAbortError(error)) {
            throw new Error(`Ollama request timed out after ${config.timeout}ms`);
        }
        throw error;
    }
}

// Call OpenRouter / Groq / NVIDIA NIM (all OpenAI-compatible) — streams SSE
async function callOpenRouter(
    config: AIModelConfig,
    options: AIGenerateOptions,
    startTime: number
): Promise<AIResponse> {
    const url = `${config.baseUrl}/chat/completions`;
    const useStreaming = options.stream !== false;
    const isNIM = config.provider === 'nvidia-nim';
    const nimOpts = isNIM ? config.nimOptions : undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);

    // NIM thinking models use temperature=1 and top_p per NVIDIA's guidance.
    // Other providers use our analytics default of 0.2.
    const effectiveTemperature = nimOpts ? 1 : (options.temperature ?? 0.2);
    const effectiveMaxTokens = nimOpts ? 16384 : (options.maxTokens ?? 1024);

    const requestBody: Record<string, unknown> = {
        model: config.model,
        messages: options.messages,
        temperature: effectiveTemperature,
        max_tokens: effectiveMaxTokens,
        stream: useStreaming,
        ...(useStreaming && { stream_options: { include_usage: true } }),
        ...(nimOpts && {
            top_p: nimOpts.topP,
            chat_template_kwargs: { enable_thinking: nimOpts.enableThinking },
            reasoning_budget: nimOpts.reasoningBudget,
        }),
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://vistarabi.com',
                'X-Title': 'VistaraBI',
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            const providerName = config.provider === 'nvidia-nim' ? 'NVIDIA NIM'
                : config.provider === 'groq' ? 'Groq'
                : 'OpenRouter';
            throw new Error(`${providerName} API error ${response.status}: ${errorText}`);
        }

        let content: string;
        let reasoning = '';
        let inputTokens = 0;
        let outputTokens = 0;

        if (useStreaming && response.body) {
            // SSE streaming — accumulate both reasoning_content and content deltas
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
                        const delta = parsed.choices?.[0]?.delta;

                        // NIM thinking models stream reasoning_content separately
                        if (delta?.reasoning_content) {
                            reasoning += delta.reasoning_content;
                        }
                        if (delta?.content) {
                            content += delta.content;
                        }

                        // Capture usage from final chunk
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
            const msg = data.choices?.[0]?.message;
            content = msg?.content?.trim() || '';
            reasoning = msg?.reasoning_content?.trim() || '';
            inputTokens = data.usage?.prompt_tokens || 0;
            outputTokens = data.usage?.completion_tokens || 0;
        }

        if (!content) {
            const providerLabel = config.provider === 'nvidia-nim' ? 'NVIDIA NIM'
                : config.provider === 'groq' ? 'Groq'
                : 'OpenRouter';
            throw new Error(`Empty response from ${providerLabel}`);
        }

        if (reasoning) {
            console.log(`[AI] ${config.provider} thinking tokens: ${reasoning.split(' ').length} words`);
        }

        return {
            content,
            ...(reasoning && { reasoning }),
            provider: config.provider,
            model: config.model,
            tokensUsed: { input: inputTokens, output: outputTokens },
            latencyMs: Date.now() - startTime,
            agentRole: options.agentRole,
        };
    } catch (error: unknown) {
        clearTimeout(timeoutId);
        if (isAbortError(error)) {
            const providerLabel = config.provider === 'nvidia-nim' ? 'NVIDIA NIM'
                : config.provider === 'groq' ? 'Groq'
                : 'OpenRouter';
            throw new Error(`${providerLabel} request timed out after ${config.timeout}ms`);
        }
        throw error;
    }
}

// Main unified AI client with automatic fallback
export async function generateWithFallback(
    options: AIGenerateOptions
): Promise<AIResponse> {
    const configs = getModelConfigs(options.preferLocal, options.routingMode);

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
        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.warn(`[AI] × Failed with ${config.provider}:`, getErrorMessage(error));
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
export async function checkAIHealth(preferLocal?: boolean, routingMode?: AIRoutingMode): Promise<{
    configured: number;
    available: string[];
    unavailable: string[];
}> {
    const configs = getModelConfigs(preferLocal, routingMode);
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
