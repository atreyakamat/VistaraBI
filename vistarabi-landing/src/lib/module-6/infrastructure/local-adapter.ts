// Module 6D — Local Model Adapter (Ollama + Cloud Routing)
// Communicates with Ollama HTTP API (Local or Cloud).
// Attempts cloud first (if configured), falls back to local on failure.
// Throws ModelCallError on timeout or API failure.

import { ModelCallError, LOCAL_TIMEOUT_MS, MAX_TOKENS, LOCAL_MODEL_ID } from './types';
import type { AdapterResponse } from './types';

// ─── Config ───────────────────────────────────────────────────────────────────

function getLocalOllamaBaseUrl(): string {
    return (process.env.OLLAMA_URL ?? 'http://localhost:11434').replace(/\/$/, '');
}

function getCloudConfig() {
    const url = (process.env.CLOUD_AI_BASE_URL || process.env.OLLAMA_CLOUD_URL)?.replace(/\/$/, '');
    const key = process.env.CLOUD_AI_API_KEY || process.env.OLLAMA_CLOUD_API_KEY;
    const model = process.env.CLOUD_AI_MODEL || process.env.OLLAMA_CLOUD_MODEL || 'qwen3.5:397b';

    return {
        url,
        key,
        model,
    };
}

// ─── Request Shape ────────────────────────────────────────────────────────────

interface OllamaGenerateRequest {
    model: string;
    prompt: string;
    system?: string;
    stream: false;
    options?: {
        temperature?: number;
        num_predict?: number;
        stop?: string[];
    };
}

interface OllamaGenerateResponse {
    response: string;
    prompt_eval_count?: number;
    eval_count?: number;
    done: boolean;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Smart Router: Cloud First, Local Fallback
 */
export async function callLocalModel(
    systemPrompt: string,
    userMessage: string,
    temperature: number,
    localModelId: string = process.env.OLLAMA_MODEL || LOCAL_MODEL_ID
): Promise<AdapterResponse> {
    const cloud = getCloudConfig();

    if (cloud.url && cloud.key) {
        console.log(`[AI Router] Attempting Cloud Model: ${cloud.model} at ${cloud.url}`);
        try {
            return await _doCallOllama(systemPrompt, userMessage, temperature, cloud.model, cloud.url, cloud.key, 120000);
        } catch (cloudErr: any) {
            console.warn(`[AI Router] Cloud model failed (${cloudErr.message}). Falling back to local...`);
            // Fall through to local
        }
    }

    console.log(`[AI Router] Using Local Model: ${localModelId}`);
    return await _doCallOllama(systemPrompt, userMessage, temperature, localModelId, getLocalOllamaBaseUrl(), undefined, 120000);
}

async function _doCallOllama(
    systemPrompt: string,
    userMessage: string,
    temperature: number,
    modelId: string,
    baseUrl: string,
    apiKey?: string,
    timeoutMs: number = 120000
): Promise<AdapterResponse> {
    const url = `${baseUrl}/api/generate`;

    const body = {
        model: modelId,
        system: systemPrompt,
        prompt: userMessage,
        stream: false,
        options: {
            temperature,
            num_predict: MAX_TOKENS,
            stop: ['\n\n\n'],   // Prevent runaway generation
        }
    };

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
    const startMs = Date.now();

    let res: Response;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (err: any) {
        clearTimeout(timeoutHandle);
        if (err.name === 'AbortError') {
            throw new ModelCallError(
                'LOCAL_TIMEOUT',
                `Model ${modelId} timed out after ${timeoutMs}ms`,
                true
            );
        }
        throw new ModelCallError(
            'LOCAL_CALL_FAILED',
            `API call failed for ${modelId}: ${err.message ?? 'unknown error'}`,
            false
        );
    } finally {
        clearTimeout(timeoutHandle);
    }

    const latencyMs = Date.now() - startMs;

    if (!res.ok) {
        const errorText = await res.text();
        throw new ModelCallError(
            'LOCAL_CALL_FAILED',
            `API returned HTTP ${res.status} for ${modelId}: ${errorText}`,
            false
        );
    }

    let data: OllamaGenerateResponse;
    try {
        data = await res.json() as OllamaGenerateResponse;
    } catch {
        throw new ModelCallError('LOCAL_CALL_FAILED', `Response was not valid JSON for ${modelId}`, false);
    }

    const text = data.response?.trim();
    if (!text) {
        throw new ModelCallError('LOCAL_CALL_FAILED', `Returned empty response for ${modelId}`, false);
    }

    return {
        text,
        modelId,
        inputTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
        latencyMs,
    };
}
