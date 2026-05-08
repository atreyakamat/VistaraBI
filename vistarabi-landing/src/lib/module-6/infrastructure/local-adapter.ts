// Module 6D — Local Model Adapter (Ollama + Cloud Routing)
// Communicates with Ollama HTTP API (Local or Cloud).
// Attempts cloud first (if configured), falls back to local on failure.
// Throws ModelCallError on timeout or API failure.

import { ModelCallError, LOCAL_MODEL_ID } from './types';
import type { AdapterResponse } from './types';
import { generateWithFallback } from '@/lib/ai/unified-ai-client';

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
    preferLocal?: boolean
): Promise<AdapterResponse> {
    const startMs = Date.now();

    try {
        const response = await generateWithFallback({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            temperature,
            model: localModelId,
            preferLocal
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
