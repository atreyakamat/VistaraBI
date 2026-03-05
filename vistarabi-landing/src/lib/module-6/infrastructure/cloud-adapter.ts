// Module 6D — Cloud Model Adapter (Qwen via OpenAI-compatible API)
// Calls Qwen 3.5 (qwen-max) via DashScope's OpenAI-compatible endpoint.
// Single attempt only — no retry.
// Throws ModelCallError on timeout or API failure.

import { ModelCallError, CLOUD_TIMEOUT_MS, MAX_TOKENS, CLOUD_MODEL_ID } from './types';
import type { AdapterResponse } from './types';

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_QWEN_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

function getQwenBaseUrl(): string {
    return (process.env.QWEN_API_BASE_URL ?? DEFAULT_QWEN_BASE).replace(/\/$/, '');
}

function getQwenApiKey(): string {
    const key = process.env.QWEN_API_KEY;
    if (!key) {
        throw new ModelCallError(
            'MISSING_API_KEY',
            'QWEN_API_KEY is not set. Cloud reasoning requires this environment variable.',
            false
        );
    }
    return key;
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
 *  - Missing API key → 'MISSING_API_KEY' (recoverable: false — config error)
 *  - Timeout → 'CLOUD_TIMEOUT' (recoverable: true — transient)
 *  - HTTP error or empty response → 'CLOUD_CALL_FAILED' (recoverable: false)
 */
export async function callCloudModel(
    systemPrompt: string,
    userMessage: string,
    temperature: number,
    modelId: string = CLOUD_MODEL_ID
): Promise<AdapterResponse> {
    const apiKey = getQwenApiKey();  // Throws if missing
    const baseUrl = getQwenBaseUrl();
    const url = `${baseUrl}/chat/completions`;

    const body: OpenAIChatRequest = {
        model: modelId,
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
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (err: any) {
        clearTimeout(timeoutHandle);
        if (err.name === 'AbortError') {
            throw new ModelCallError(
                'CLOUD_TIMEOUT',
                `Qwen cloud model timed out after ${CLOUD_TIMEOUT_MS}ms`,
                true   // recoverable — transient network issue
            );
        }
        throw new ModelCallError(
            'CLOUD_CALL_FAILED',
            `Qwen API call failed: ${err.message ?? 'unknown error'}`,
            false
        );
    } finally {
        clearTimeout(timeoutHandle);
    }

    const latencyMs = Date.now() - startMs;

    if (!res.ok) {
        throw new ModelCallError(
            'CLOUD_CALL_FAILED',
            `Qwen API returned HTTP ${res.status}`,
            false
        );
    }

    let data: OpenAIChatResponse;
    try {
        data = await res.json() as OpenAIChatResponse;
    } catch {
        throw new ModelCallError('CLOUD_CALL_FAILED', 'Qwen response was not valid JSON', false);
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
        throw new ModelCallError('CLOUD_CALL_FAILED', 'Qwen returned empty response content', false);
    }

    return {
        text,
        modelId,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        latencyMs,
    };
}
