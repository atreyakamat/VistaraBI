// Module 6D — Model Router
// Maps classified ReasoningTaskType -> adapter (LOCAL or CLOUD).
// Routing is static and configuration-driven — never LLM-driven.
//
// CLOUD routing requires ENABLE_CLOUD_ROUTING=true explicitly.
// If cloud is disabled: Tier-3 tasks return MODEL_UNAVAILABLE (recoverable).
// There is NO silent fallback to local. Audit clarity requires explicit failures.

import {
    TASK_TIER_MAP,
    TASK_TEMPERATURE_MAP,
    LOCAL_MODEL_ID,
    CLOUD_MODEL_ID,
} from './types';
import type { ReasoningTaskType, ModelTier } from './types';

// ─── Feature Flag ─────────────────────────────────────────────────────────────

/**
 * Cloud routing is DISABLED unless ENABLE_CLOUD_ROUTING=true is explicitly set.
 * This prevents accidental cloud escalation in environments without API keys.
 */
export function isCloudRoutingEnabled(): boolean {
    return process.env.ENABLE_CLOUD_ROUTING === 'true';
}

// ─── Route Decision ───────────────────────────────────────────────────────────

export interface RoutingDecision {
    tier: ModelTier;
    modelId: string;
    temperature: number;
}

export interface RoutingRejection {
    rejected: true;
    code: 'MODEL_UNAVAILABLE' | 'UNSUPPORTED_TASK';
    message: string;
    recoverable: boolean;
}

export type RouterResult = RoutingDecision | RoutingRejection;

/**
 * Determine which model adapter to use for a classified reasoning task.
 *
 * Rules:
 *  1. UNSUPPORTED tasks are rejected immediately (should be caught before routing)
 *  2. CLOUD tasks require ENABLE_CLOUD_ROUTING=true feature flag — otherwise MODEL_UNAVAILABLE
 *  3. No fallback chaining — cloud failure must propagate as error, not silently switch to local
 */
export function routeTask(taskType: ReasoningTaskType): RouterResult {
    if (taskType === 'UNSUPPORTED') {
        return {
            rejected: true,
            code: 'UNSUPPORTED_TASK',
            message: 'Cannot route an UNSUPPORTED task type.',
            recoverable: false,
        };
    }

    const tier = TASK_TIER_MAP[taskType];
    const temperature = TASK_TEMPERATURE_MAP[taskType];

    if (tier === 'CLOUD') {
        if (!isCloudRoutingEnabled()) {
            return {
                rejected: true,
                code: 'MODEL_UNAVAILABLE',
                message: 'Cloud reasoning is not enabled in this environment. Advanced synthesis tasks require ENABLE_CLOUD_ROUTING=true.',
                recoverable: true,
            };
        }

        return {
            tier: 'CLOUD',
            modelId: CLOUD_MODEL_ID,
            temperature,
        };
    }

    return {
        tier: 'LOCAL',
        modelId: LOCAL_MODEL_ID,
        temperature,
    };
}

/** Type guard: narrowing RouterResult to RoutingDecision */
export function isRoutingDecision(result: RouterResult): result is RoutingDecision {
    return !('rejected' in result);
}
