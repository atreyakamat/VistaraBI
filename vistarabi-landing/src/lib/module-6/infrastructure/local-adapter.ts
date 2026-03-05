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
    temperature: number;
    num_predict: number;
    stop?: string[];
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
    const baseUrl = getOllamaBaseUrl();
    const url = `${baseUrl}/api/generate`;

    const body: OllamaGenerateRequest = {
        model: modelId,
        system: systemPrompt,
        prompt: userMessage,
        stream: false,
        temperature,
        num_predict: MAX_TOKENS,
        stop: ['\n\n\n'],   // Prevent runaway generation
    };

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), LOCAL_TIMEOUT_MS);
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
                `Ollama model timed out after ${LOCAL_TIMEOUT_MS}ms`,
                true  // recoverable — user can retry
            );
        }
        throw new ModelCallError(
            'LOCAL_CALL_FAILED',
            `Ollama API call failed: ${err.message ?? 'unknown error'}`,
            false
        );
    } finally {
        clearTimeout(timeoutHandle);
    }

    const latencyMs = Date.now() - startMs;

    if (!res.ok) {
        throw new ModelCallError(
            'LOCAL_CALL_FAILED',
            `Ollama returned HTTP ${res.status}`,
            false
        );
    }

    let data: OllamaGenerateResponse;
    try {
        data = await res.json() as OllamaGenerateResponse;
    } catch {
        throw new ModelCallError('LOCAL_CALL_FAILED', 'Ollama response was not valid JSON', false);
    }

    const text = data.response?.trim();
    if (!text) {
        throw new ModelCallError('LOCAL_CALL_FAILED', 'Ollama returned empty response', false);
    }

    return {
        text,
        modelId,
        inputTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
        latencyMs,
    };
}
