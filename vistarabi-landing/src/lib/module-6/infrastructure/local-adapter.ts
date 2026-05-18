// Module 6D — Local Model Adapter (Ollama + Cloud Routing)
// Communicates with Ollama HTTP API (Local or Cloud).
// Attempts cloud first (if configured), falls back to local on failure.
// Throws ModelCallError on timeout or API failure.

import { ModelCallError, LOCAL_MODEL_ID } from './types';
import type { AdapterResponse } from './types';
import { generateWithFallback } from '@/lib/ai/unified-ai-client';
import {
    AI_MODE_COOKIE_KEY,
    AI_MODE_HEADER_KEY,
    normalizeAIMode,
    modeToPreferLocal,
    modeToRoutingMode,
    type AIRoutingMode,
} from '@/lib/ai/ai-mode';
import { cookies, headers } from 'next/headers';

// ─── Adapter ──────────────────────────────────────────────────────────────────

/**
 * Smart Router: Uses generateWithFallback to support Cloud/Local switching
 * This allows all M6-M9 pipelines to respect the Cloud/Local toggle.
 */
export async function callLocalModel(
    systemPrompt: string,
    userMessage: string,
    temperature: number,
    localModelId: string = process.env.OLLAMA_MODEL || LOCAL_MODEL_ID,
    preferLocal?: boolean,
    routingMode?: AIRoutingMode
): Promise<AdapterResponse> {
    const startMs = Date.now();
    let effectivePreferLocal = preferLocal;
    let effectiveRoutingMode = routingMode;

    // If the caller did not pass explicit mode, resolve from active request (header/cookie).
    if (!effectiveRoutingMode) {
        try {
            const requestHeaderMode = normalizeAIMode((await headers()).get(AI_MODE_HEADER_KEY));
            if (requestHeaderMode) {
                effectivePreferLocal = modeToPreferLocal(requestHeaderMode);
                effectiveRoutingMode = modeToRoutingMode(requestHeaderMode);
            } else {
                const cookieMode = normalizeAIMode((await cookies()).get(AI_MODE_COOKIE_KEY)?.value);
                if (cookieMode) {
                    effectivePreferLocal = modeToPreferLocal(cookieMode);
                    effectiveRoutingMode = modeToRoutingMode(cookieMode);
                }
            }
        } catch {
            // Non-request execution context (tests/background jobs): fall back to unified client defaults.
        }
    }

    try {
        const response = await generateWithFallback({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature,
            model: localModelId,
            preferLocal: effectivePreferLocal,
            routingMode: effectiveRoutingMode
        });

        return {
            text: response.content,
            modelId: response.model,
            inputTokens: response.tokensUsed?.input,
            outputTokens: response.tokensUsed?.output,
            latencyMs: Date.now() - startMs
        };
    } catch (err: any) {
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('timeout') || msg.includes('timed out')) {
            throw new ModelCallError(
                'LOCAL_TIMEOUT',
                `AI request timed out: ${err.message}`,
                true
            );
        }
        throw new ModelCallError(
            'LOCAL_CALL_FAILED',
            `AI call failed: ${err.message ?? 'unknown error'}`,
            false
        );
    }
}
