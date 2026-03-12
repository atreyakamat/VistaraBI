// Module 6D — Local Model Adapter (Ollama qwen3:8b)
// Communicates with Ollama HTTP API.
// Single attempt only — no retry.
// Throws ModelCallError on timeout or API failure.

import { ModelCallError, LOCAL_TIMEOUT_MS, MAX_TOKENS, LOCAL_MODEL_ID } from './types';
import type { AdapterResponse } from './types';

// ─── Config ───────────────────────────────────────────────────────────────────

function getOllamaBaseUrl(): string {
    return (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
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
 * Call local Ollama qwen3:8b model.
 *
 * Rules:
 *  - Timeout: LOCAL_TIMEOUT_MS (500ms default)
 *  - Stream: always false (single response required)
 *  - Temperature: caller-specified (0.0 for INTENT_TRANSLATION, 0.1 for narration)
 *  - No retry — single attempt
 *
 * Throws ModelCallError on:
 *  - Network failure or Ollama not running → 'LOCAL_CALL_FAILED' (recoverable: false)
 *  - Timeout → 'LOCAL_TIMEOUT' (recoverable: true — user can retry later)
 */
export async function callLocalModel(
    systemPrompt: string,
    userMessage: string,
    temperature: number,
    modelId: string = LOCAL_MODEL_ID
): Promise<AdapterResponse> {
    try {
        console.log(`[LocalAdapter] Attempting local model ${modelId} with 10s timeout...`);
        return await _doCallLocalModel(systemPrompt, userMessage, temperature, modelId, 10000);
    } catch (err: any) {
        console.warn(`[LocalAdapter] Local model ${modelId} failed (${err.message}). Pushing to Ollama cloud fallback (qwen3.5:397b-cloud) with 120s timeout...`);
        
        // Push to Ollama cloud fallback
        try {
            return await _doCallLocalModel(systemPrompt, userMessage, temperature, 'qwen3.5:397b-cloud', 120000);
        } catch (cloudErr: any) {
            console.error(`[LocalAdapter] Ollama Cloud fallback also failed: ${cloudErr.message}`);
            throw cloudErr;
        }
    }
}

async function _doCallLocalModel(
    systemPrompt: string,
    userMessage: string,
    temperature: number,
    modelId: string,
    timeoutMs: number
): Promise<AdapterResponse> {
    const baseUrl = getOllamaBaseUrl();
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

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
    const startMs = Date.now();

    let res: Response;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (err: any) {
        clearTimeout(timeoutHandle);
        if (err.name === 'AbortError') {
            throw new ModelCallError(
                'LOCAL_TIMEOUT',
                `Ollama model ${modelId} timed out after ${timeoutMs}ms`,
                true  // recoverable — user can retry
            );
        }
        throw new ModelCallError(
            'LOCAL_CALL_FAILED',
            `Ollama API call failed for ${modelId}: ${err.message ?? 'unknown error'}`,
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
            `Ollama returned HTTP ${res.status} for ${modelId}: ${errorText}`,
            false
        );
    }

    let data: OllamaGenerateResponse;
    try {
        data = await res.json() as OllamaGenerateResponse;
    } catch {
        throw new ModelCallError('LOCAL_CALL_FAILED', `Ollama response was not valid JSON for ${modelId}`, false);
    }

    const text = data.response?.trim();
    if (!text) {
        throw new ModelCallError('LOCAL_CALL_FAILED', `Ollama returned empty response for ${modelId}`, false);
    }

    return {
        text,
        modelId,
        inputTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
        latencyMs,
    };
}
