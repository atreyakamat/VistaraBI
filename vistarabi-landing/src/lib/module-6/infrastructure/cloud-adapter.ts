// Module 6D — Cloud Model Adapter
// Supports:
//   1) OpenAI-compatible Qwen endpoints (QWEN_API_KEY / QWEN_API_BASE_URL)
//   2) Ollama-compatible cloud endpoints (CLOUD_AI_* or OLLAMA_CLOUD_* env)
// Single attempt only — no retry.
// Throws ModelCallError on timeout or API failure.

import { ModelCallError, CLOUD_TIMEOUT_MS, MAX_TOKENS, CLOUD_MODEL_ID } from './types';
import type { AdapterResponse } from './types';

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_QWEN_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

type CloudProviderMode = 'openai' | 'ollama-chat';

interface CloudProviderConfig {
    mode: CloudProviderMode;
    baseUrl: string;
    apiKey: string;
    model: string;
}

function getCloudProviderConfig(requestedModelId: string): CloudProviderConfig {
    const ollamaUrl = (process.env.CLOUD_AI_BASE_URL || process.env.OLLAMA_CLOUD_URL)?.replace(/\/$/, '');
    const ollamaKey = process.env.CLOUD_AI_API_KEY || process.env.OLLAMA_CLOUD_API_KEY;
    const ollamaModel = process.env.CLOUD_AI_MODEL || process.env.OLLAMA_CLOUD_MODEL || requestedModelId;

    if (ollamaUrl && ollamaKey) {
        return {
            mode: 'ollama-chat',
            baseUrl: ollamaUrl,
            apiKey: ollamaKey,
            model: ollamaModel,
        };
    }

    const qwenKey = process.env.QWEN_API_KEY;
    if (qwenKey) {
        return {
            mode: 'openai',
            baseUrl: (process.env.QWEN_API_BASE_URL ?? DEFAULT_QWEN_BASE).replace(/\/$/, ''),
            apiKey: qwenKey,
            model: process.env.QWEN_MODEL_ID || requestedModelId,
        };
    }

    throw new ModelCallError(
        'MISSING_API_KEY',
        'No cloud model credentials configured. Set CLOUD_AI_*/OLLAMA_CLOUD_* or QWEN_API_KEY.',
        false
    );
}

// ─── OpenAI-Compatible Request/Response ───────────────────────────────────────

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OpenAIChatRequest {
    model: string;
    messages: ChatMessage[];
    temperature: number;
    max_tokens: number;
    stream: false;
}

interface OpenAIChatResponse {
    choices: Array<{
        message: { content: string };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
    };
}

interface OllamaChatResponse {
    message?: { content?: string };
    prompt_eval_count?: number;
    eval_count?: number;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Call Qwen cloud model (qwen-max) via OpenAI-compatible API.
 *
 * Rules:
 *  - Timeout: CLOUD_TIMEOUT_MS (2000ms default)
 *  - Stream: always false
 *  - Requires QWEN_API_KEY env var
 *  - No retry — single attempt
 *
 * Throws ModelCallError on:
 *  - Missing API key -> 'MISSING_API_KEY' (recoverable: false — config error)
 *  - Timeout -> 'CLOUD_TIMEOUT' (recoverable: true — transient)
 *  - HTTP error or empty response -> 'CLOUD_CALL_FAILED' (recoverable: false)
 */
export async function callCloudModel(
    systemPrompt: string,
    userMessage: string,
    temperature: number,
    modelId: string = CLOUD_MODEL_ID
): Promise<AdapterResponse> {
    const provider = getCloudProviderConfig(modelId);

    if (provider.mode === 'openai') {
        return callOpenAICompatible(provider, systemPrompt, userMessage, temperature);
    }

    return callOllamaCompatible(provider, systemPrompt, userMessage, temperature);
}

async function callOpenAICompatible(
    provider: CloudProviderConfig,
    systemPrompt: string,
    userMessage: string,
    temperature: number
): Promise<AdapterResponse> {
    const url = `${provider.baseUrl}/chat/completions`;
    const body: OpenAIChatRequest = {
        model: provider.model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
        ],
        temperature,
        max_tokens: MAX_TOKENS,
        stream: false,
    };

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);
    const startMs = Date.now();

    let res: Response;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (err: any) {
        clearTimeout(timeoutHandle);
        if (err.name === 'AbortError') {
            throw new ModelCallError('CLOUD_TIMEOUT', `Cloud model timed out after ${CLOUD_TIMEOUT_MS}ms`, true);
        }
        throw new ModelCallError('CLOUD_CALL_FAILED', `OpenAI-compatible cloud call failed: ${err.message ?? 'unknown error'}`, false);
    } finally {
        clearTimeout(timeoutHandle);
    }

    const latencyMs = Date.now() - startMs;
    if (!res.ok) {
        throw new ModelCallError('CLOUD_CALL_FAILED', `Cloud API returned HTTP ${res.status}`, false);
    }

    let data: OpenAIChatResponse;
    try {
        data = await res.json() as OpenAIChatResponse;
    } catch {
        throw new ModelCallError('CLOUD_CALL_FAILED', 'Cloud response was not valid JSON', false);
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
        throw new ModelCallError('CLOUD_CALL_FAILED', 'Cloud response content was empty', false);
    }

    return {
        text,
        modelId: provider.model,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        latencyMs,
    };
}

async function callOllamaCompatible(
    provider: CloudProviderConfig,
    systemPrompt: string,
    userMessage: string,
    temperature: number
): Promise<AdapterResponse> {
    const url = `${provider.baseUrl}/api/chat`;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);
    const startMs = Date.now();

    let res: Response;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${provider.apiKey}`,
            },
            body: JSON.stringify({
                model: provider.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
                stream: false,
                options: {
                    temperature,
                    num_predict: MAX_TOKENS,
                    num_ctx: 4096,
                },
            }),
            signal: controller.signal,
        });
    } catch (err: any) {
        clearTimeout(timeoutHandle);
        if (err.name === 'AbortError') {
            throw new ModelCallError('CLOUD_TIMEOUT', `Cloud model timed out after ${CLOUD_TIMEOUT_MS}ms`, true);
        }
        throw new ModelCallError('CLOUD_CALL_FAILED', `Ollama-compatible cloud call failed: ${err.message ?? 'unknown error'}`, false);
    } finally {
        clearTimeout(timeoutHandle);
    }

    const latencyMs = Date.now() - startMs;
    if (!res.ok) {
        throw new ModelCallError('CLOUD_CALL_FAILED', `Cloud API returned HTTP ${res.status}`, false);
    }

    let data: OllamaChatResponse;
    try {
        data = await res.json() as OllamaChatResponse;
    } catch {
        throw new ModelCallError('CLOUD_CALL_FAILED', 'Cloud response was not valid JSON', false);
    }

    const text = data.message?.content?.trim();
    if (!text) {
        throw new ModelCallError('CLOUD_CALL_FAILED', 'Cloud response content was empty', false);
    }

    return {
        text,
        modelId: provider.model,
        inputTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
        latencyMs,
    };
}
